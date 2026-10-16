import { competitorsOf, PROFILE_FIELDS } from "./competitors";
import { BRAIN_DOCS, HEADING, sec, type DocId, type LoadedDoc } from "./docs";
import { childrenOf, fieldValue, fieldsOf, itemsOf, serializeDoc, slug, tableOf, textOf, type Doc, type Section } from "./md";
import { catalogOf } from "./products";
import { brandWorldOf, entryFor, motionSoundOf, MOTION_FIELDS, onCameraGaps, TERMS_FIELDS, termsOf, WORLD_FIELDS } from "./on-camera";
export type CheckStatus = "pass" | "warn" | "fail";
export interface Check {
    id: string;
    group: "Documents" | "Customers" | "Consistency" | "Guidelines" | "On camera" | "Competitors" | "Freshness";
    label: string;
    status: CheckStatus;
    detail: string;
    doc?: DocId;
}
export interface AvatarRead {
    name: string;
    quotes: number;
    inferred: boolean;
    share: string;
    intensity: string;
}
const QUOTE = /["“][^"”]{12,}["”]/;
export function readAvatars(doc: Doc): AvatarRead[] {
    return doc.sections
        .filter((s) => s.level === 2 && /^avatar\b/i.test(s.title))
        .map((s) => {
        const kids = childrenOf(doc, s);
        const grounded = kids.find((k) => /^grounded in/i.test(k.title));
        const head = textOf(s);
        const all = [serializeDoc({ title: "", intro: s.blocks, sections: [] }), ...kids.map((k) => serializeDoc({ title: "", intro: k.blocks, sections: [] }))].join("\n");
        return {
            name: s.title.replace(/^avatar\s*\d*\s*:?\s*/i, "").replace(/^["“]|["”]$/g, "").trim() || s.title,
            quotes: itemsOf(grounded).filter((i) => QUOTE.test(i)).length,
            inferred: /inferred from site copy|not yet grounded/i.test(all),
            share: /(\d{1,3})\s*%/.exec(head)?.[1] ?? "",
            intensity: /emotional intensity:\s*([a-z-]+)/i.exec(head)?.[1]?.toLowerCase() ?? "",
        };
    });
}
const LONG_DASH = /[—]/;
const filled = (v: string) => !!v.trim() && !/^not captured|^none found|^tbd\b|^to be written|^not known|^open\b|^\{/i.test(v.trim());
const days = (date: string) => (date ? Math.floor((Date.now() - new Date(`${date}T00:00:00Z`).getTime()) / 86400000) : Infinity);
const mentions = (hay: string, needle: string) => {
    const w = slug(needle).split("-").filter((x) => x.length > 2);
    const h = slug(hay);
    return w.length > 0 && w.filter((x) => h.includes(x)).length / w.length >= 0.6;
};
export interface BrainReview {
    checks: Check[];
    passed: number;
    total: number;
    avatars: AvatarRead[];
    summary: string;
}
export function reviewBrain(docs: Record<DocId, LoadedDoc>, opts: {
    productNames?: string[];
    folders?: Record<string, string[]>;
} = {}): BrainReview {
    const checks: Check[] = [];
    const add = (c: Check) => checks.push(c);
    const g = docs.guidelines.doc;
    const brain = docs.brain.doc;
    const missing = BRAIN_DOCS.filter((d) => !docs[d.id].exists);
    add({ id: "docs_present", group: "Documents", label: "All 8 parts of the brand brain are written", status: missing.length ? (missing.length > 4 ? "fail" : "warn") : "pass", detail: missing.length ? `Not written yet: ${missing.map((d) => d.label).join(", ")}.` : "All 8 are there." });
    const dashed = BRAIN_DOCS.filter((d) => docs[d.id].exists && LONG_DASH.test(serializeDoc(docs[d.id].doc)));
    add({ id: "no_long_dash", group: "Documents", label: "No long dashes in any document", status: dashed.length ? "warn" : "pass", detail: dashed.length ? `Found in: ${dashed.map((d) => d.label).join(", ")}. Saving any section of the document removes them.` : "None found.", doc: dashed[0]?.id });
    const avatars = readAvatars(docs.avatars.doc);
    const grounded = avatars.filter((a) => a.quotes >= 2);
    const inferred = avatars.filter((a) => a.quotes < 2 && a.inferred);
    const bare = avatars.filter((a) => a.quotes < 2 && !a.inferred);
    add({
        id: "avatars_grounded",
        group: "Customers",
        label: "Every buyer is backed by customers' own words",
        status: !avatars.length ? "fail" : bare.length ? "fail" : inferred.length ? "warn" : "pass",
        detail: !avatars.length ? "No avatars written yet." : `${avatars.length} avatars: ${grounded.length} backed by 2 or more quotes, ${inferred.length} marked as inferred${bare.length ? `, ${bare.length} with neither (${bare.map((a) => a.name).join(", ")}): add quotes or mark them inferred` : ""}.`,
        doc: "avatars",
    });
    const unranked = avatars.filter((a) => !a.share || !a.intensity);
    if (avatars.length)
        add({ id: "avatars_ranked", group: "Customers", label: "Each buyer has a share and an intensity", status: unranked.length ? "warn" : "pass", detail: unranked.length ? `Missing on: ${unranked.map((a) => a.name).join(", ")}.` : avatars.map((a) => `${a.name} ${a.share}%, ${a.intensity}`).join("; ") + ".", doc: "avatars" });
    const diag = sec(brain, "diagnosis");
    const need = [["awareness", "Market awareness"], ["persona", "Highest-intensity persona"], ["opportunity", "Biggest opportunity"]] as const;
    const gaps = need.filter(([, k]) => !filled(fieldValue(diag, k)));
    add({ id: "diagnosis", group: "Consistency", label: "The diagnosis is written", status: !diag || (!textOf(diag).trim() && gaps.length === 3) ? "fail" : gaps.length ? "warn" : "pass", detail: !diag ? "The overview has no diagnosis yet." : gaps.length ? `Still blank: ${gaps.map(([, k]) => k).join(", ")}.` : "Awareness level, strongest buyer and biggest opportunity are all stated.", doc: "brain" });
    const top = fieldValue(diag, "Highest-intensity persona");
    if (filled(top) && avatars.length)
        add({ id: "diagnosis_persona", group: "Consistency", label: "The diagnosis names a buyer the avatars hold", status: avatars.some((a) => mentions(top, a.name)) ? "pass" : "warn", detail: avatars.some((a) => mentions(top, a.name)) ? `"${top.split("(")[0].trim()}" is one of the avatars.` : `"${top}" is not the name of any avatar.`, doc: "brain" });
    const catalog = catalogOf(docs.products.doc);
    const pricing = tableOf(sec(docs.products.doc, "pricing"));
    const hero = pricing?.rows.find((r) => /hero/i.test(r[0] ?? ""))?.[1] ?? "";
    const best = itemsOf(sec(docs.products.doc, "bestSellers"))[0] ?? "";
    add({ id: "catalog", group: "Consistency", label: "Every product is in the catalogue", status: !catalog.length ? "fail" : "pass", detail: catalog.length ? `${catalog.length} products listed.` : "The catalogue is empty. Pull the products from the store, or add them.", doc: "products" });
    if (catalog.length) {
        const noPrice = catalog.filter((p) => !/\d/.test(p.price));
        add({ id: "prices", group: "Consistency", label: "Every product has a price", status: noPrice.length ? "warn" : "pass", detail: noPrice.length ? `No price on: ${noPrice.slice(0, 6).map((p) => p.name).join(", ")}.` : "All priced.", doc: "products" });
        const unsold = catalog.filter((p) => !p.tags.includes("Merchandise") && (!filled(p.benefit) || !filled(p.angle)));
        add({ id: "positioning", group: "Consistency", label: "Every product has a core benefit and an angle", status: unsold.length ? "warn" : "pass", detail: unsold.length ? `To write for: ${unsold.slice(0, 6).map((p) => p.name).join(", ")}${unsold.length > 6 ? ` and ${unsold.length - 6} more` : ""}.` : "All written.", doc: "products" });
        if (filled(hero)) {
            const inCatalog = catalog.some((p) => mentions(hero, p.name) || mentions(p.name, hero));
            const agrees = !best || mentions(best, hero) || mentions(hero, best);
            add({ id: "hero", group: "Consistency", label: "The hero product is the same everywhere", status: inCatalog && agrees ? "pass" : "warn", detail: !inCatalog ? `The pricing summary names "${hero.split("(")[0].trim()}" as hero, and the catalogue has no product of that name.` : !agrees ? `The pricing summary and the best sellers list name different products first.` : `"${hero.split("(")[0].trim()}" in the pricing summary, the best sellers and the catalogue.`, doc: "products" });
        }
        else
            add({ id: "hero", group: "Consistency", label: "The hero product is named", status: "warn", detail: "The pricing summary has no hero product.", doc: "products" });
        const shares = (a: string, b: string) => slug(a).split("-").some((w) => w.length >= 6 && slug(b).split("-").includes(w));
        const strays = (opts.productNames ?? []).filter((n) => !catalog.some((p) => mentions(n, p.name) || mentions(p.name, n) || shares(n, p.name)));
        if (opts.productNames?.length)
            add({ id: "ad_products", group: "Consistency", label: "The products ads are made for are in the catalogue", status: strays.length ? "warn" : "pass", detail: strays.length ? `Not found by name: ${strays.join("; ")}.` : `${opts.productNames.length} matched.`, doc: "products" });
    }
    const dos = itemsOf(sec(g, "voiceDo"));
    const donts = itemsOf(sec(g, "voiceDont"));
    add({ id: "voice", group: "Guidelines", label: "Voice do and don't, with a real line behind them", status: dos.length >= 3 && donts.length >= 3 ? (dos.some((d) => QUOTE.test(d) || /["“][^"”]{4,}["”]/.test(d)) ? "pass" : "warn") : "fail", detail: dos.length >= 3 && donts.length >= 3 ? (dos.some((d) => /["“][^"”]{4,}["”]/.test(d)) ? `${dos.length} do, ${donts.length} don't, with the brand's own lines quoted.` : "None of the do's quotes a line the brand has published.") : `${dos.length} do and ${donts.length} don't: aim for at least 3 of each.`, doc: "guidelines" });
    const tone = tableOf(sec(g, "tone"));
    const toned = tone?.rows.filter((r) => filled(r[1] ?? "")).length ?? 0;
    add({ id: "tone", group: "Guidelines", label: "Tone by context", status: toned >= 4 ? "pass" : toned ? "warn" : "fail", detail: `${toned} of ${tone?.rows.length ?? 5} contexts written.`, doc: "guidelines" });
    const usps = itemsOf(sec(g, "usps"));
    add({ id: "usps", group: "Guidelines", label: "3 to 5 selling points, ranked", status: usps.length >= 3 ? "pass" : usps.length ? "warn" : "fail", detail: `${usps.length} written.`, doc: "guidelines" });
    const rails = sec(g, "guardrails");
    const railGaps = ["Never say", "Never show", "Always"].filter((k) => !filled(fieldValue(rails, k)));
    add({ id: "guardrails", group: "Guidelines", label: "Guardrails: never say, never show, always", status: railGaps.length === 0 ? "pass" : railGaps.length === 3 ? "fail" : "warn", detail: railGaps.length ? `Blank: ${railGaps.join(", ")}.` : "All 3 written.", doc: "guidelines" });
    const palette = tableOf(sec(g, "palette"));
    const hexes = palette?.rows.filter((r) => /#[0-9a-f]{3,8}\b/i.test(r[1] ?? "")).length ?? 0;
    const typo = sec(g, "typography");
    const fonts = fieldsOf(typo).filter((f) => filled(f.value)).length;
    add({ id: "look", group: "Guidelines", label: "Colours with their codes, and the typefaces", status: hexes >= 3 && fonts >= 2 ? "pass" : hexes || fonts ? "warn" : "fail", detail: `${hexes} colours with a code, ${fonts} typefaces named.${hexes < 3 || fonts < 2 ? " Read the brand look from the site, then bring it into the guidelines." : ""}`, doc: "guidelines" });
    const phrases = itemsOf(sec(g, "phrases"));
    add({ id: "phrases", group: "Guidelines", label: "The brand's own phrases and taglines", status: phrases.length >= 3 ? "pass" : phrases.length ? "warn" : "fail", detail: `${phrases.length} written.`, doc: "guidelines" });
    if (opts.productNames?.length && catalog.length) {
        const need = ["Kind", "How it works", "Replaces"] as const;
        const thin = opts.productNames
            .map((name) => ({ name, blank: need.filter((k) => !filled(fieldValue(entryFor(docs.products.doc, name), k))) }))
            .filter((x) => x.blank.length);
        add({
            id: "product_facts",
            group: "Consistency",
            label: "Each product ads are made for says its kind, how it works and what it replaces",
            status: !thin.length ? "pass" : "warn",
            detail: !thin.length ? `${opts.productNames.length} written.` : `Blank: ${thin.slice(0, 5).map((x) => `${x.name} (${x.blank.join(", ")})`).join("; ")}. A script with no mechanism and nothing to be against argues from adjectives.`,
            doc: "products",
        });
    }
    const policy = termsOf(docs.products.doc);
    const policyN = Object.keys(policy ?? {}).length;
    add({ id: "terms", group: "Consistency", label: "Delivery, returns and guarantee terms, in the brand's own words", status: policyN >= 3 ? "pass" : "warn", detail: `${policyN} of ${TERMS_FIELDS.length} written.${policyN < 3 ? " A page, an offer ad and a product page image state these; a blank one is left out, never guessed." : ""}`, doc: "products" });
    const proofRows = tableOf(sec(g, "proof"))?.rows.filter((r) => filled(r[0] ?? "") && filled(r[2] ?? "")).length ?? 0;
    add({ id: "proof", group: "Guidelines", label: "Proof on file, each with its source", status: proofRows >= 3 ? "pass" : "warn", detail: `${proofRows} with a source.${proofRows < 3 ? " A proof ad is made only from what is listed here." : ""}`, doc: "guidelines" });
    if (opts.productNames?.length && catalog.length) {
        const gaps = onCameraGaps(docs.products.doc, opts.productNames, opts.folders ?? {});
        const described = gaps.filter((x) => !x.blank.some((b) => b !== "Reference photos"));
        const open = gaps.filter((x) => x.blank.some((b) => b !== "Reference photos"));
        add({
            id: "on_camera",
            group: "On camera",
            label: "Each product ads are made for says what it looks like, its pack and how it is used",
            status: !open.length ? "pass" : described.length ? "warn" : "fail",
            detail: !open.length ? `${described.length} written.` : `To write, from the product's own photos: ${open.slice(0, 5).map((x) => `${x.product} (${x.blank.filter((b) => b !== "Reference photos").join(", ")})`).join("; ")}.`,
            doc: "products",
        });
        const unnamed = gaps.filter((x) => x.photos < 2);
        const lost = gaps.flatMap((x) => x.missing.map((m) => `${x.product}: ${m}`));
        add({
            id: "reference_photos",
            group: "On camera",
            label: "Each product's photos are named by job (pack front, out of pack, in hand, in use, close up)",
            status: lost.length ? "warn" : !unnamed.length ? "pass" : unnamed.length === gaps.length ? "fail" : "warn",
            detail: lost.length ? `Named, but the photo is missing: ${lost.slice(0, 5).join("; ")}.` : !unnamed.length ? `${gaps.reduce((n, x) => n + x.photos, 0)} photos named across ${gaps.length} products.` : `Fewer than 2 named for: ${unnamed.slice(0, 5).map((x) => x.product).join("; ")}. Without them a picture is given whichever photo comes first, with no word on what it shows.`,
            doc: "products",
        });
    }
    const world = brandWorldOf(g);
    const worldN = Object.keys(world ?? {}).length;
    add({ id: "brand_world", group: "On camera", label: "The brand's world: places, props, light, people, what is never in frame", status: worldN >= 4 ? "pass" : "warn", detail: `${worldN} of ${WORLD_FIELDS.length} written.${worldN < 4 ? " A scene with no place given is set in a generic one." : ""}`, doc: "guidelines" });
    const motion = motionSoundOf(g);
    const motionN = Object.keys(motion ?? {}).length;
    add({ id: "motion_sound", group: "On camera", label: "How the brand's video moves and sounds", status: motionN >= 3 ? "pass" : "warn", detail: `${motionN} of ${MOTION_FIELDS.length} written.${motionN < 3 ? " A clip with no word on sound gets whatever the model makes." : ""}`, doc: "guidelines" });
    const comps = competitorsOf(docs.competitors.doc);
    const thin = comps.filter((c) => c.filled < Math.ceil(PROFILE_FIELDS.length * 0.6));
    add({ id: "competitors", group: "Competitors", label: "3 to 5 competitors, each with a profile", status: comps.length >= 3 ? (thin.length ? "warn" : "pass") : comps.length ? "warn" : "fail", detail: !comps.length ? "No competitor profiles yet." : `${comps.length} profiles${thin.length ? `; thin: ${thin.map((c) => c.name).join(", ")}` : ", all filled"}.`, doc: "competitors" });
    const noGap = comps.filter((c) => !filled(c.fields["Gap we can own"] ?? ""));
    if (comps.length)
        add({ id: "gaps", group: "Competitors", label: "A gap to own against each competitor", status: noGap.length ? "warn" : "pass", detail: noGap.length ? `No gap written for: ${noGap.map((c) => c.name).join(", ")}.` : "Written for all.", doc: "competitors" });
    const ads = docs.winning.doc.sections.filter((s: Section) => /^ad\s*\d+/i.test(s.title)).length;
    add({ id: "winning", group: "Competitors", label: "Winning ads are recorded", status: ads ? "pass" : "warn", detail: ads ? `${ads} ads recorded.` : "None recorded. Add the ads that are running, or connect the ad account.", doc: "winning" });
    const log = tableOf(sec(docs.changes.doc, "changeLog"));
    const newest = (log?.rows ?? []).map((r) => r[0]).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().pop() ?? "";
    add({ id: "changes_fresh", group: "Freshness", label: "The change log has an entry from the last 60 days", status: days(newest) <= 60 ? "pass" : "warn", detail: newest ? `Newest entry: ${newest}.` : "No dated entry.", doc: "changes" });
    const stale = BRAIN_DOCS.filter((d) => d.id !== "readme" && docs[d.id].exists && days(docs[d.id].updated) > 180);
    add({ id: "docs_fresh", group: "Freshness", label: "No document is older than 6 months", status: stale.length ? "warn" : "pass", detail: stale.length ? `Not touched in 6 months: ${stale.map((d) => d.label).join(", ")}.` : "All recent." });
    const passed = checks.filter((c) => c.status === "pass").length;
    const fails = checks.filter((c) => c.status === "fail").length;
    const summary = fails ? `${fails} thing${fails === 1 ? " is" : "s are"} missing that the writers depend on.` : passed === checks.length ? "The brain is complete and its documents agree." : `${checks.length - passed} thing${checks.length - passed === 1 ? "" : "s"} to tighten. Nothing is blocking.`;
    return { checks, passed, total: checks.length, avatars, summary };
}
export { HEADING };
