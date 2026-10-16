import dns from "node:dns/promises";
import tls from "node:tls";
import { normaliseUrl } from "./capture";
import { searchCards, type Card } from "./library";
export type Severity = "critical" | "high" | "medium" | "low" | "info";
export interface SecFinding {
    id: string;
    severity: Severity;
    area: "Transport" | "Headers" | "Cookies" | "Page" | "Exposed files" | "Scripts" | "Email" | "Platform";
    title: string;
    evidence: string;
    fix: string;
    cards: Pick<Card, "id" | "title" | "summary">[];
}
export interface SecResult {
    url: string;
    final_url: string;
    platform: string | null;
    https: boolean;
    cert: {
        issuer: string;
        valid_to: string;
        days_left: number;
        protocol: string;
        names: string[];
        authorized: boolean;
        error: string | null;
    } | null;
    headers: Record<string, string>;
    checked: string[];
    findings: SecFinding[];
    grade: "A" | "B" | "C" | "D" | "F";
    at: string;
}
const UA = "Mozilla/5.0 (compatible; ecomOS-security-scan/1.0; passive)";
const TIMEOUT = 15000;
async function get(url: string, opts: {
    redirect?: "manual" | "follow";
    maxBytes?: number;
} = {}): Promise<{
    status: number;
    headers: Headers;
    body: string;
    url: string;
    cookies: string[];
} | null> {
    try {
        const res = await fetch(url, { redirect: opts.redirect ?? "follow", headers: { "user-agent": UA, accept: "text/html,*/*" }, signal: AbortSignal.timeout(TIMEOUT) });
        const reader = res.body?.getReader();
        let body = "";
        if (reader) {
            const dec = new TextDecoder();
            let n = 0;
            for (;;) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                n += value.length;
                body += dec.decode(value, { stream: true });
                if (n > (opts.maxBytes ?? 1500000)) {
                    await reader.cancel();
                    break;
                }
            }
        }
        return { status: res.status, headers: res.headers, body, url: res.url || url, cookies: typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [] };
    }
    catch {
        return null;
    }
}
function certOf(host: string, port = 443): Promise<SecResult["cert"]> {
    return new Promise((resolve) => {
        const sock = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: TIMEOUT }, () => {
            const c = sock.getPeerCertificate();
            const days = c?.valid_to ? Math.floor((new Date(c.valid_to).getTime() - Date.now()) / 86400000) : -1;
            const names = (c?.subjectaltname ?? "").split(/,\s*/).map((s) => s.replace(/^DNS:/, "")).filter(Boolean);
            resolve({ issuer: String(c?.issuer?.O ?? c?.issuer?.CN ?? "unknown"), valid_to: c?.valid_to ?? "", days_left: days, protocol: sock.getProtocol() ?? "", names, authorized: sock.authorized, error: sock.authorizationError ? String(sock.authorizationError) : null });
            sock.end();
        });
        sock.on("error", () => resolve(null));
        sock.on("timeout", () => {
            sock.destroy();
            resolve(null);
        });
    });
}
const nameMatches = (host: string, names: string[]) => names.some((n) => n === host || (n.startsWith("*.") && host.endsWith(n.slice(1)) && host.split(".").length === n.split(".").length));
const LIBS: {
    name: string;
    re: RegExp;
    below: string;
    why: string;
}[] = [
    { name: "jQuery", re: /jquery[.-]?(\d+\.\d+\.\d+)(?:\.min)?\.js|jQuery v(\d+\.\d+\.\d+)/i, below: "3.5.0", why: "cross-site scripting flaws fixed in 3.5.0 (CVE-2020-11022, CVE-2020-11023)" },
    { name: "jQuery UI", re: /jquery-ui[.-]?(\d+\.\d+\.\d+)|jQuery UI - v(\d+\.\d+\.\d+)/i, below: "1.13.2", why: "cross-site scripting flaws fixed in 1.13.2" },
    { name: "Bootstrap", re: /bootstrap[.-]?(\d+\.\d+\.\d+)(?:\.min)?\.js|Bootstrap v(\d+\.\d+\.\d+)/i, below: "3.4.1", why: "cross-site scripting in data attributes, fixed in 3.4.1 and 4.3.1" },
    { name: "Lodash", re: /lodash[.-]?(\d+\.\d+\.\d+)|lodash v?(\d+\.\d+\.\d+)/i, below: "4.17.21", why: "prototype pollution and command injection fixed in 4.17.21" },
    { name: "AngularJS", re: /angular[.-]?(1\.\d+\.\d+)(?:\.min)?\.js|AngularJS v(1\.\d+\.\d+)/i, below: "9.0.0", why: "AngularJS 1.x reached end of life in January 2022 and gets no security fixes" },
];
export function versionBelow(v: string, floor: string): boolean {
    const a = v.split(".").map(Number);
    const b = floor.split(".").map(Number);
    for (let i = 0; i < 3; i++)
        if ((a[i] ?? 0) !== (b[i] ?? 0))
            return (a[i] ?? 0) < (b[i] ?? 0);
    return false;
}
const SECRETS: {
    name: string;
    re: RegExp;
}[] = [
    { name: "a Stripe secret key", re: /\bsk_live_[0-9a-zA-Z]{20,}/ },
    { name: "an AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: "a private key", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
    { name: "a Slack token", re: /\bxox[baprs]-[0-9A-Za-z-]{10,}/ },
    { name: "a Shopify Admin API token", re: /\bshpat_[0-9a-fA-F]{32}\b/ },
    { name: "a GitHub token", re: /\bgh[pousr]_[0-9A-Za-z]{36}\b/ },
    { name: "an OpenAI or Anthropic API key", re: /\bsk-(?:ant-|proj-)?[0-9A-Za-z_-]{32,}/ },
];
const EXPOSED: {
    path: string;
    proof: RegExp;
    what: string;
    severity: Severity;
}[] = [
    { path: "/.git/HEAD", proof: /^ref: refs\//m, what: "the site's git repository (its source code and history)", severity: "critical" },
    { path: "/.env", proof: /^[A-Z][A-Z0-9_]{2,}=.+$/m, what: "an environment file (often passwords and API keys)", severity: "critical" },
    { path: "/.svn/entries", proof: /^\d+\s*$|svn:/m, what: "the site's Subversion data", severity: "high" },
    { path: "/.DS_Store", proof: /Bud1/, what: "a macOS folder index listing file names", severity: "low" },
    { path: "/phpinfo.php", proof: /phpinfo\(\)|PHP Version/i, what: "a PHP information page (server versions and paths)", severity: "medium" },
    { path: "/server-status", proof: /Apache Server Status/i, what: "Apache's status page (live requests and clients)", severity: "medium" },
    { path: "/wp-config.php.bak", proof: /DB_PASSWORD|define\(/, what: "a WordPress configuration backup (the database password)", severity: "critical" },
];
const ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
export async function securityScan(input: string): Promise<SecResult> {
    const url = /^https?:\/\//i.test(input) ? input : normaliseUrl(input);
    const u = new URL(url);
    const host = u.hostname;
    const local = /^(localhost|127\.|0\.0\.0\.0|\[?::1)/.test(host);
    const findings: Omit<SecFinding, "cards">[] = [];
    const checked: string[] = [];
    const add = (f: Omit<SecFinding, "cards">) => findings.push(f);
    const httpsUrl = `https://${u.host}${u.pathname}${u.search}`;
    let certResult: SecResult["cert"] = null;
    let main = u.protocol === "https:" || !local ? await get(httpsUrl) : null;
    const https = !!main && main.status < 500;
    if (!main)
        main = await get(url);
    if (!main)
        throw new Error(`The site could not be reached from this machine (${host}).`);
    const final = new URL(main.url);
    const h = Object.fromEntries([...main.headers.entries()].map(([k, v]) => [k.toLowerCase(), v]));
    const platform = h["x-shopid"] || /cdn\.shopify\.com|Shopify\.theme/.test(main.body) ? "Shopify" : /wp-content|wp-includes/.test(main.body) ? "WordPress" : h["x-powered-by"]?.includes("Next.js") ? "Next.js" : null;
    const onShopify = platform === "Shopify";
    checked.push("The page over HTTPS");
    if (!https)
        add({ id: "no_https", severity: local ? "info" : "critical", area: "Transport", title: "The site is not served over HTTPS", evidence: local ? `${host} is this machine; HTTPS is checked on the live address.` : `${httpsUrl} did not answer.`, fix: "Serve every page over HTTPS. Without it browsers show 'Not secure' at the moment of payment, and session cookies can be read on public Wi-Fi." });
    else {
        const plain = await get(`http://${u.host}${u.pathname}`, { redirect: "manual", maxBytes: 20000 });
        checked.push("HTTP to HTTPS redirect");
        const to = plain?.headers.get("location") ?? "";
        if (plain && !(plain.status >= 300 && plain.status < 400 && to.startsWith("https://")))
            add({ id: "no_redirect", severity: "high", area: "Transport", title: "Plain HTTP does not redirect to HTTPS", evidence: `http://${u.host} answered ${plain.status}${to ? ` to ${to}` : ""}.`, fix: "Redirect every HTTP request to HTTPS with a 301, then add HSTS." });
        const cert = await certOf(host, Number(u.port) || 443);
        checked.push("The certificate");
        if (cert) {
            if (!cert.authorized || !nameMatches(host, cert.names))
                add({ id: "cert_invalid", severity: "critical", area: "Transport", title: "The certificate is not trusted for this address", evidence: cert.error ?? `It names ${cert.names.slice(0, 3).join(", ") || "other addresses"}.`, fix: "Install a certificate from a trusted authority that names this address." });
            if (cert.days_left < 0)
                add({ id: "cert_expired", severity: "critical", area: "Transport", title: "The certificate has expired", evidence: `Expired ${cert.valid_to}.`, fix: "Renew it now, and turn on automatic renewal." });
            else if (cert.days_left < 21)
                add({ id: "cert_expiring", severity: "high", area: "Transport", title: `The certificate expires in ${cert.days_left} days`, evidence: `Valid to ${cert.valid_to}, issued by ${cert.issuer}.`, fix: "Renew it, and turn on automatic renewal so it never lapses." });
            if (/TLSv1(\.0|\.1)?$/.test(cert.protocol))
                add({ id: "old_tls", severity: "high", area: "Transport", title: `An old protocol was agreed (${cert.protocol})`, evidence: "TLS 1.0 and 1.1 are retired.", fix: "Allow TLS 1.2 and 1.3 only." });
        }
        certResult = cert;
        const hsts = h["strict-transport-security"];
        if (!hsts)
            add({ id: "no_hsts", severity: "medium", area: "Headers", title: "No HSTS header", evidence: "Browsers may still try plain HTTP first, where a visit can be intercepted.", fix: onShopify ? "Shopify sets HSTS on its own domains; on a custom domain check the store's domain settings." : "Send Strict-Transport-Security, starting with a short max-age and growing it to a year once every subdomain is on HTTPS." });
        else if (Number(hsts.match(/max-age=(\d+)/)?.[1] ?? 0) < 15552000)
            add({ id: "short_hsts", severity: "low", area: "Headers", title: "HSTS is set for less than 6 months", evidence: `"${hsts}".`, fix: "Grow max-age to about a year once every subdomain is on HTTPS." });
    }
    checked.push("Response headers");
    const csp = h["content-security-policy"] ?? "";
    if (!h["x-frame-options"] && !/frame-ancestors/.test(csp))
        add({ id: "no_anti_framing", severity: "medium", area: "Headers", title: "The page can be framed by another site", evidence: "No X-Frame-Options and no CSP frame-ancestors.", fix: "Send X-Frame-Options: SAMEORIGIN or CSP frame-ancestors 'self' on cart, checkout and account pages at least (clickjacking)." });
    if (!csp)
        add({ id: "no_csp", severity: "low", area: "Headers", title: "No Content Security Policy", evidence: "Nothing limits which scripts the page may run.", fix: "Start with a report-only policy listing the script hosts the store uses, then enforce it. It limits the damage of a skimming script." });
    if (h["x-content-type-options"] !== "nosniff")
        add({ id: "no_nosniff", severity: "low", area: "Headers", title: "No X-Content-Type-Options: nosniff", evidence: "Browsers may guess file types.", fix: "Send X-Content-Type-Options: nosniff." });
    if (!h["referrer-policy"])
        add({ id: "no_referrer_policy", severity: "low", area: "Headers", title: "No Referrer-Policy", evidence: "Full addresses, including order-status or reset links with tokens, can leak to the next site a shopper visits.", fix: "Send Referrer-Policy: strict-origin-when-cross-origin." });
    const disclose = [h["server"], h["x-powered-by"], h["x-aspnet-version"]].filter((v): v is string => !!v && /\d/.test(v));
    if (disclose.length)
        add({ id: "version_disclosure", severity: "low", area: "Headers", title: "The server says which software versions it runs", evidence: disclose.join("; "), fix: "Remove version numbers from the Server and X-Powered-By headers, so a scan for old versions does not find this site." });
    if (h["access-control-allow-origin"] === "*" && main.cookies.length)
        add({ id: "cors_wildcard", severity: "medium", area: "Headers", title: "Any site may read this page", evidence: "Access-Control-Allow-Origin: * on a page that sets cookies.", fix: "Allow only the origins that need it." });
    checked.push("Cookies");
    for (const c of main.cookies) {
        const name = c.split("=")[0];
        const lower = c.toLowerCase();
        const missing = [https && !/;\s*secure/.test(lower) ? "Secure" : "", /sess|auth|token|login|cart|customer/i.test(name) && !/;\s*httponly/.test(lower) ? "HttpOnly" : "", !/;\s*samesite=/.test(lower) ? "SameSite" : ""].filter(Boolean);
        if (missing.length)
            add({ id: `cookie_${name}`, severity: missing.includes("Secure") || missing.includes("HttpOnly") ? "medium" : "low", area: "Cookies", title: `Cookie "${name}" lacks ${missing.join(", ")}`, evidence: c.split(";").slice(1).join(";").trim() || "No attributes.", fix: "Set session and cart cookies with Secure, HttpOnly and SameSite=Lax, and a bounded expiry." });
    }
    checked.push("Mixed content, outbound links, forms, secrets in the page");
    const body = main.body;
    if (final.protocol === "https:") {
        const mixed = [...body.matchAll(/<(script|img|iframe|link|source|video|audio)\b[^>]*?\s(?:src|href)=["'](http:\/\/[^"']+)["']/gi)].map((m) => m[2]);
        if (mixed.length)
            add({ id: "mixed_content", severity: mixed.some((x) => /\.js(\?|$)/.test(x)) ? "high" : "medium", area: "Page", title: `${mixed.length} resource${mixed.length === 1 ? " is" : "s are"} loaded over plain HTTP`, evidence: mixed.slice(0, 3).join(", "), fix: "Load every resource over HTTPS; browsers block insecure scripts and warn on the rest." });
        const forms = [...body.matchAll(/<form\b[^>]*action=["'](http:\/\/[^"']+)["']/gi)].map((m) => m[1]);
        if (forms.length)
            add({ id: "insecure_form", severity: "high", area: "Page", title: "A form sends its data over plain HTTP", evidence: forms[0], fix: "Post every form to an HTTPS address." });
    }
    const blank = [...body.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)].filter((m) => !/rel=["'][^"']*(noopener|noreferrer)/i.test(m[0]));
    if (blank.length >= 3)
        add({ id: "noopener", severity: "info", area: "Page", title: `${blank.length} links open a new tab without rel="noopener"`, evidence: "Modern browsers now treat these as noopener, older ones do not.", fix: 'Add rel="noopener" to links with target="_blank".' });
    for (const s of SECRETS) {
        const m = body.match(s.re);
        if (m)
            add({ id: `secret_${s.name.replace(/\W+/g, "_")}`, severity: "critical", area: "Page", title: `The page contains what looks like ${s.name}`, evidence: `${m[0].slice(0, 8)}… in the page source anyone can read.`, fix: "Revoke the key now, issue a new one, and keep it on the server only." });
    }
    checked.push("Scripts and libraries");
    const scripts = [...body.matchAll(/<script\b[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi)].map((m) => ({ src: m[1], tag: m[0] }));
    const thirdParty = scripts.filter((s) => {
        try {
            return new URL(s.src, final).hostname.split(".").slice(-2).join(".") !== final.hostname.split(".").slice(-2).join(".");
        }
        catch {
            return false;
        }
    });
    const hosts = [...new Set(thirdParty.map((s) => new URL(s.src, final).hostname))];
    if (hosts.length)
        add({ id: "third_party_scripts", severity: hosts.length > 12 ? "medium" : "info", area: "Scripts", title: `${hosts.length} outside hosts run scripts on this page`, evidence: hosts.slice(0, 8).join(", "), fix: "Every outside script can read the page, including on checkout steps. Keep a list with an owner and a reason for each; remove what is unused; keep only payment scripts on payment pages." });
    const noSri = thirdParty.filter((s) => !/integrity=/.test(s.tag) && /\.(js)(\?|$)/.test(s.src) && /cdnjs|jsdelivr|unpkg|code\.jquery|bootstrapcdn|cdn\.jsdelivr/.test(s.src));
    if (noSri.length)
        add({ id: "no_sri", severity: "low", area: "Scripts", title: `${noSri.length} script${noSri.length === 1 ? "" : "s"} from a public CDN without an integrity check`, evidence: noSri.slice(0, 3).map((s) => s.src).join(", "), fix: "Add integrity and crossorigin attributes to fixed-version files from public CDNs, so a changed file is refused." });
    const seen = new Set<string>();
    for (const lib of LIBS) {
        for (const hay of [...scripts.map((s) => s.src), body.slice(0, 400000)]) {
            const m = hay.match(lib.re);
            const v = m?.[1] ?? m?.[2];
            if (v && !seen.has(lib.name) && versionBelow(v, lib.below)) {
                seen.add(lib.name);
                add({ id: `old_${lib.name.toLowerCase().replace(/\W+/g, "_")}`, severity: "medium", area: "Scripts", title: `${lib.name} ${v} has known flaws`, evidence: lib.why, fix: `Update ${lib.name}${lib.name === "AngularJS" ? " away from 1.x" : ` to ${lib.below} or later`}, or remove it if the theme no longer needs it.` });
            }
        }
    }
    if (!onShopify) {
        checked.push(`Well-known files (${EXPOSED.length})`);
        for (const e of EXPOSED) {
            const r = await get(`${final.origin}${e.path}`, { redirect: "manual", maxBytes: 20000 });
            if (r && r.status === 200 && e.proof.test(r.body) && !/<html/i.test(r.body.slice(0, 500)))
                add({ id: `exposed_${e.path.replace(/\W+/g, "_")}`, severity: e.severity, area: "Exposed files", title: `${e.path} is publicly readable`, evidence: `It serves ${e.what}.`, fix: `Block ${e.path} on the server and remove it from the web root; if it held keys or passwords, change them.` });
        }
    }
    const sec = await get(`${final.origin}/.well-known/security.txt`, { maxBytes: 10000 });
    checked.push("security.txt");
    if (!(sec && sec.status === 200 && /contact:/i.test(sec.body)))
        add({ id: "no_security_txt", severity: "info", area: "Platform", title: "No security.txt", evidence: "A researcher who finds a flaw has no published way to report it.", fix: "Publish /.well-known/security.txt with a contact address and an expiry date." });
    if (!local) {
        checked.push("SPF and DMARC records");
        const root = host.replace(/^www\./, "");
        const txt = async (name: string) => {
            try {
                return (await dns.resolveTxt(name)).map((r) => r.join(""));
            }
            catch {
                return null;
            }
        };
        const spf = await txt(root);
        const dmarc = await txt(`_dmarc.${root}`);
        if (spf === null && dmarc === null)
            add({ id: "dns_unchecked", severity: "info", area: "Email", title: "The domain's mail records could not be read", evidence: "No DNS answer from this machine.", fix: "Check SPF and DMARC by hand, or run the scan from a machine with DNS access." });
        else {
            if (!spf?.some((r) => r.startsWith("v=spf1")))
                add({ id: "no_spf", severity: "medium", area: "Email", title: "No SPF record", evidence: `${root} names no servers allowed to send its mail.`, fix: "Publish an SPF record listing the services that send the brand's email (the store, the email platform)." });
            const d = dmarc?.find((r) => r.startsWith("v=DMARC1"));
            if (!d)
                add({ id: "no_dmarc", severity: "high", area: "Email", title: "No DMARC record: anyone can send email as this brand", evidence: `_dmarc.${root} has no policy.`, fix: "Publish DMARC with p=none and reports first, then move to quarantine and reject once legitimate senders pass." });
            else if (/p=none/i.test(d))
                add({ id: "dmarc_none", severity: "medium", area: "Email", title: "DMARC is set to none", evidence: `"${d.slice(0, 100)}"`, fix: "Move to p=quarantine, then p=reject, once the reports show every legitimate sender passes." });
        }
    }
    if (onShopify)
        add({ id: "shopify", severity: "info", area: "Platform", title: "Shopify runs the checkout", evidence: "The store's checkout, its certificate and its payment pages are Shopify's responsibility; the theme, apps and scripts are the brand's.", fix: "Turn on 2FA for every staff account, review app permissions each quarter, and keep only payment scripts on checkout (security playbook 5.1)." });
    const done = findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]).map((f) => ({ ...f, cards: searchCards(`${f.title} ${f.fix}`, ["security"], 2).map(({ id, title, summary }) => ({ id, title, summary })) }));
    const worst = done.reduce((w, f) => Math.min(w, ORDER[f.severity]), 4);
    const highs = done.filter((f) => f.severity === "high").length;
    const grade = worst === 0 ? "F" : worst === 1 ? (highs > 1 ? "D" : "C") : done.filter((f) => f.severity === "medium").length > 2 ? "C" : worst === 2 ? "B" : "A";
    return { url, final_url: final.toString(), platform, https, cert: certResult, headers: h, checked, findings: done, grade, at: new Date().toISOString() };
}
