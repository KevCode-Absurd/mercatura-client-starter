import fs from "node:fs";
import path from "node:path";
import type { Browser } from "@playwright/test";
import { withResourceLane } from "../production-ops/lanes";
function installedChromium(): string | null {
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
    if (!fs.existsSync(root))
        return null;
    for (const d of fs.readdirSync(root).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
        for (const rel of ["chrome-linux/chrome", "chrome-linux64/chrome", "chrome-win/chrome.exe", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]) {
            const f = path.join(root, d, rel);
            if (fs.existsSync(f))
                return f;
        }
    }
    return null;
}
async function startBrowser(): Promise<Browser> {
    let pw: typeof import("@playwright/test");
    try {
        pw = await import("@playwright/test");
    }
    catch {
        throw new Error("Reading a page needs Playwright, which is installed with the app's dev dependencies (pnpm install).");
    }
    const tries: (() => Promise<Browser>)[] = [
        () => pw.chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge", headless: true }),
        () => pw.chromium.launch({ headless: true }),
    ];
    const exe = process.env.PW_EXECUTABLE_PATH || installedChromium();
    if (exe)
        tries.push(() => pw.chromium.launch({ executablePath: exe, headless: true, args: ["--no-sandbox"] }));
    let last: unknown;
    for (const t of tries) {
        try {
            return await t();
        }
        catch (e) {
            last = e;
        }
    }
    throw new Error(`No browser could be started to read the page. Install one with \`npx playwright install chromium\`, or set PW_EXECUTABLE_PATH. (${(last as Error)?.message?.split("\n")[0] ?? "unknown"})`);
}
let shared: Promise<Browser> | undefined;
let users = 0;
let idle: ReturnType<typeof setTimeout> | undefined;
export async function closeManagedBrowsers() {
    if (users)
        throw new Error("Browser inspections are still running.");
    if (idle)
        clearTimeout(idle);
    const previous = shared;
    shared = undefined;
    if (previous)
        await (await previous).close();
}
export function launchBrowser(options: {
    signal?: AbortSignal;
    timeoutMs?: number;
} = {}): Promise<Browser> {
    let ready: (browser: Browser) => void, failed: (error: unknown) => void;
    const available = new Promise<Browser>((resolve, reject) => { ready = resolve; failed = reject; });
    void withResourceLane("browser", async (signal) => {
        if (idle)
            clearTimeout(idle);
        users++;
        const contexts = new Set<import("@playwright/test").BrowserContext>();
        let release!: () => void, closed = false;
        const lifetime = new Promise<void>(resolve => { release = resolve; });
        const close = async () => {
            if (closed)
                return;
            closed = true;
            await Promise.allSettled([...contexts].map(context => context.close()));
            release();
        };
        const abort = () => { void close(); };
        try {
            shared ??= startBrowser().catch(error => { shared = undefined; throw error; });
            const browser = await shared;
            if (signal.aborted)
                throw signal.reason ?? new Error("Browser inspection cancelled.");
            signal.addEventListener("abort", abort, { once: true });
            const context = async (settings?: Parameters<Browser["newContext"]>[0]) => {
                if (closed || signal.aborted)
                    throw new Error("Browser inspection cancelled or expired.");
                const ctx = await browser.newContext({ ...settings, serviceWorkers: "block" });
                if (closed || signal.aborted) {
                    await ctx.close();
                    throw new Error("Browser inspection cancelled or expired.");
                }
                contexts.add(ctx);
                return ctx;
            };
            const lease = new Proxy(browser, { get(target, property) {
                    if (property === "close")
                        return close;
                    if (property === "newContext")
                        return context;
                    if (property === "newPage")
                        return async (settings?: Parameters<Browser["newContext"]>[0]) => (await context(settings)).newPage();
                    if (property === "contexts")
                        return () => [...contexts];
                    const value = Reflect.get(target, property);
                    return typeof value === "function" ? value.bind(target) : value;
                } });
            ready!(lease);
            await lifetime;
        }
        finally {
            signal.removeEventListener("abort", abort);
            await close();
            users--;
            if (!users) {
                idle = setTimeout(() => { if (!users)
                    void closeManagedBrowsers().catch(() => { }); }, 300);
                idle.unref?.();
            }
        }
    }, { ...options, timeoutMs: options.timeoutMs ?? 180000, operationId: "landing-browser" }).catch(error => failed!(error));
    return available;
}
