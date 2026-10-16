import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db, schema } from "@/db";
import type { ProductionState } from "@/db/schema";
import { avatarFile, getAvatar } from "../avatars/store";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { FORMAT_RECIPES, castRoles, isCinematic, type FormatRecipe } from "../formats";
import { videoModel } from "../media/chosen";
import { videoModelInfo, type VideoModelInfo } from "../media/models";
import { dataPath } from "../media/providers";
import { loadCreativeKit, photoLabel, productImages, type CreativeKit } from "./kit";
import { partFile } from "./parts";
import { API_PROMPT_LIMIT, PACK_MODEL, clipPrompt, clipSeconds, clipsSaid, drawnFrames, frameRef, hasStoryboard, personAnchor, planSeconds, productIn, promptTags, propsIn, recipeUsesCharacterOnly, segmentSeconds, shotAt, shotStarts, type ClipRef } from "./prompts";
export const packModel = (): VideoModelInfo => {
    const inUse = videoModelInfo(videoModel());
    return inUse.chain === "extend" ? inUse : videoModelInfo(PACK_MODEL);
};
export interface ClipRefFile extends ClipRef {
    src: string | null;
    slug: string;
    kind: "person" | "product" | "product-view" | "first" | "place" | "key" | "end";
}
export interface HandoffRef {
    tag: string;
    file: string;
    purpose: string;
}
export interface HandoffClip {
    index: number;
    dir: string;
    seconds: number;
    prompt: string;
    refs: HandoffRef[];
    overlays?: string[];
}
export interface HandoffPack {
    dir: string;
    index: string;
    seconds: number;
    total: number;
    aspect: string;
    limit: number;
    model: string;
    voice?: string;
    clips: HandoffClip[];
}
const lower = (s: string) => `${s[0]?.toLowerCase() ?? ""}${s.slice(1)}`.replace(/\.$/, "");
export function clipReferences(a: {
    p: ProductionState;
    recipe: FormatRecipe;
    brandId: string;
    kit: CreativeKit | null;
    index: number;
    startFrame?: string | null;
    stills?: boolean;
}): ClipRefFile[] {
    const { p, recipe, index } = a;
    const plan = p.video_plan!;
    const out: ClipRefFile[] = [];
    const who = personAnchor(plan.cast.presenter).split(",")[0] || "the presenter";
    const views = p.character?.panels ?? [];
    const duo = (recipe.people ?? 1) > 1;
    if (!recipeUsesCharacterOnly(recipe) && views.length >= 3) {
        const [aRole, bRole] = castRoles(recipe);
        const name = duo ? `the ${aRole} (sheet left) and the ${bRole} (sheet right)` : who;
        const same = duo ? "the same 2 people" : `the same ${who.replace(/^the /, "")}`;
        out.push({ kind: "person", slug: "face", src: dataPath(views[0]), purpose: `defines ${name}: face, hair and skin, close up. Ignore its plain wall and identity-sheet lighting`, short: `defines ${name}: the face` });
        out.push({ kind: "person", slug: "waist-up", src: dataPath(views[1]), purpose: `defines ${same} from the waist up, in the same outfit`, short: `defines ${same}, waist up` });
        out.push({ kind: "person", slug: "full-figure", src: dataPath(views[2]), purpose: `defines ${same}: full figure and outfit`, short: `defines ${same}, full figure` });
        if (views.length >= 6 && plan.cut) {
            const shots = plan.segments[index]?.scenes ?? [];
            if (shots.some((s) => s.angle === "profile"))
                out.push({ kind: "person", slug: "profile", src: dataPath(views[3]), purpose: `defines ${same} from the side`, short: `defines ${same}, in profile` });
            if (shots.some((s) => s.angle === "over the shoulder"))
                out.push({ kind: "person", slug: "from-behind", src: dataPath(views[4]), purpose: `defines ${same} from behind: the back of the hair and the outfit`, short: `defines ${same}, from behind` });
            if (shots.some((s) => s.focus === "hands"))
                out.push({ kind: "person", slug: "hands", src: dataPath(views[5]), purpose: `defines the hands of ${same}`, short: `defines the hands of ${same}` });
        }
    }
    else if (p.character)
        out.push({ kind: "person", slug: "character-sheet", src: dataPath(p.character.file), purpose: "defines the character: its shape, colours, proportions and material. Ignore its background and its pose", short: "defines the character" });
    const directed = !!plan.cut;
    const shown = !directed || productIn(plan, index);
    const imgs = a.kit && shown ? productImages(a.brandId, a.kit, p.product_id) : { hero: null, extras: [] };
    const samePhoto = (x: string | null, y: string | null) => !!x && !!y && path.resolve(x) === path.resolve(y);
    const parts = directed && shown ? (plan.product_parts ?? []).filter((x) => propsIn(plan, index).some((q) => q.name.trim().toLowerCase() === x.name.trim().toLowerCase())) : [];
    const own = parts.map((x) => ({ name: x.name, src: partFile(a.brandId, x.photo) })).filter((x) => x.src);
    const asSold = !own.length || own.some((x) => samePhoto(x.src, imgs.hero));
    if (imgs.hero && asSold) {
        const lone = directed && parts.length > 0 && !own.length;
        out.push({ kind: "product", slug: "product", src: imgs.hero, purpose: lone ? `shows the pack ${parts.map((x) => x.name).join(" and ")} ${parts.length > 1 ? "come" : "comes"} in. Take its colours, artwork and printed name from it. That pack is not in this clip: its shape and size are not copied onto anything` : "defines the product: its exact shape, colours, label and printed words. Ignore its background and the angle it was photographed from", short: lone ? "shows the outer pack: its colours and artwork only. That pack is not in this clip" : "defines the product: exact shape, colours and label" });
    }
    const viewCount = () => out.filter((r) => r.kind === "product-view").length;
    for (const part of own) {
        if (viewCount() < 3 && !out.some((r) => samePhoto(r.src, part.src)))
            out.push({ kind: "product-view", slug: `product-view-${viewCount() + 1}`, src: part.src, purpose: `defines ${part.name}: its exact shape, colours and printing. Ignore its background, and anything else in the photo`, short: `defines ${part.name}, and nothing else in its photo` });
    }
    const ofAnObject = (label: string) => /single unit|out of its packaging|as it is sold/i.test(label);
    for (const file of imgs.extras) {
        const label = photoLabel(a.brandId, p.product_id, file);
        if (label && viewCount() < (own.length ? 3 : 2) && !out.some((r) => samePhoto(r.src, file)) && !(own.length && ofAnObject(label)))
            out.push({ kind: "product-view", slug: `product-view-${viewCount() + 1}`, src: file, purpose: `defines ${lower(label)}`, short: `defines ${lower(label.split(/[.:]/)[0])}` });
    }
    if (!directed)
        for (const part of plan.product_parts ?? []) {
            const src = partFile(a.brandId, part.photo);
            if (src && viewCount() < 2 && !out.some((r) => samePhoto(r.src, src)))
                out.push({ kind: "product-view", slug: `product-view-${viewCount() + 1}`, src, purpose: `defines ${part.name}: its exact shape, colours and printing. Ignore its background`, short: `defines ${part.name}` });
        }
    const look = p.look ? dataPath(p.look.file) : null;
    if (index === 0 && directed && a.stills === false && plan.cut?.cover) {
        if (look)
            out.push({ kind: "place", slug: "look", src: look, purpose: "defines the place, the light and the look of the film only. Ignore its framing and the pose in it", short: "defines the place, light and look only" });
    }
    else if (index === 0) {
        if (look)
            out.push({ kind: "first", slug: "first-frame", src: look, purpose: directed ? "is the first frame: shot 1 as it opens" : "is the first frame: the opening pose, where each object stands, the place, the light and the camera", short: "is the first frame" });
    }
    else if (directed) {
        if (look)
            out.push({ kind: "place", slug: "look", src: look, purpose: "defines the light, the colours and the look of the film only. Ignore its framing and what is in it", short: "defines the light and look only" });
    }
    else {
        const before = drawnFrames(p.storyboard, index - 1).filter((f) => f.moment === "end")[0];
        const start = a.startFrame === undefined ? (before ? dataPath(before.file) : null) : a.startFrame;
        if (start || a.startFrame === null)
            out.push({ kind: "first", slug: "first-frame", src: start, purpose: `is the first frame: where clip ${index} ended. Continue directly from it`, short: "is the first frame" });
        if (look)
            out.push({ kind: "place", slug: "place", src: look, purpose: "defines the place, the light and the camera position only. Ignore the pose in it", short: "defines the place and light only" });
    }
    const frames = directed && a.stills === false ? [] : drawnFrames(p.storyboard, index);
    const keys = frames.filter((f) => f.moment !== "end").length;
    let nth = 0;
    for (const f of frames) {
        const end = f.moment === "end";
        if (!end)
            nth++;
        const seg = plan.segments[index];
        const shot = directed ? (end ? seg.scenes.length - 1 : shotAt(seg, f.at)) : undefined;
        out.push({ kind: end ? "end" : "key", slug: shot !== undefined ? `shot-${shot + 1}` : end ? "last-frame" : `key-moment-${nth}`, src: dataPath(f.file), ...frameRef(shot !== undefined ? { ...f, at: shotStarts(seg)[shot] } : f, nth, keys, shot) });
    }
    let ok = out.filter((r) => r.src === null || fs.existsSync(r.src));
    const most = packModel().maxImages;
    for (const kind of ["product-view", "place", "key"] as const) {
        while (ok.length > most) {
            const at = ok.findIndex((r) => r.kind === kind);
            if (at < 0)
                break;
            ok = ok.filter((_, i) => i !== at);
        }
    }
    return ok.slice(0, most);
}
function refNotes(refs: ClipRefFile[], duo: boolean, directed = false, cinematic = false): {
    full: string[];
    short: string[];
} {
    const tag = (i: number) => `@Image${i + 1}`;
    const each = (tags: string[]) => (tags.length < 3 ? tags.join(" and ") : `${tags.slice(0, -1).join(", ")} and ${tags[tags.length - 1]}`);
    const people = refs.map((r, i) => (r.kind === "person" ? i : -1)).filter((i) => i >= 0);
    const keys = refs.map((r, i) => (r.kind === "key" ? tag(i) : "")).filter(Boolean);
    const first = refs.findIndex((r) => r.kind === "first");
    const end = refs.findIndex((r) => r.kind === "end");
    const one = people.length > 1 ? `${each(people.map(tag))} show ${duo ? cinematic ? "the same 2 adults: Character A is sheet left, Character B sheet right; each shot shows only its named cast members, positioned by the scene" : "the same 2 people, and only those 2 appear: the Host on the left, the Guest on the right" : "1 person, and only that person appears"}.` : "";
    if (directed) {
        const stills = refs.map((r, i) => (r.kind === "key" || r.kind === "end" ? tag(i) : "")).filter(Boolean);
        const shots = stills.length ? `${stills.length === 1 ? `${stills[0]} is a still of 1 shot` : `${each(stills)} are stills of the shots, 1 each, in order`}. Each shot fills the whole frame, set up as its still shows, and the film cuts straight from one shot to the next. Never show a grid or a split screen.` : "";
        const pose = people.length ? `${each(people.map(tag))} ${people.length > 1 ? "give" : "gives"} identity only, never scene light or layout: nobody holds the pose of a reference picture, and no shot copies its framing.` : "";
        const photo = refs.findIndex((r) => r.kind === "product" && /^defines /.test(r.purpose));
        const real = photo >= 0 && stills.length ? `Where a still and ${tag(photo)} show the product differently, ${tag(photo)} is right: a still shows where the product sits, ${tag(photo)} shows what it looks like.` : "";
        return { full: [one, pose, shots, real, first >= 0 ? `The video opens on ${tag(first)}.` : ""].filter(Boolean), short: [one, people.length ? "No shot copies a reference picture's pose or framing." : "", stills.length ? `Each shot is set up as its still shows: full frame, hard cuts, no grid.` : "", real ? `Where a still and ${tag(photo)} differ on the product, ${tag(photo)} is right.` : ""].filter(Boolean) };
    }
    const order = keys.length ? `${keys.length === 1 ? `${keys[0]} is a still` : `${each(keys)} are stills`} of the action in time order. The action passes through ${keys.length === 1 ? "it" : "each"} without stopping or cutting. Never show a grid or a split screen: the output is 1 full-frame shot.` : "";
    const flow = end >= 0 ? `The video ${first >= 0 ? `begins on ${tag(first)} and ` : ""}reaches ${tag(end)} through the continuous action below.` : "";
    return { full: [one, order, flow].filter(Boolean), short: [one, keys.length ? `Pass through ${keys.length === 1 ? keys[0] : `${keys[0]} to ${keys[keys.length - 1]}`} in order: no stop, no cut, no grid.` : ""].filter(Boolean) };
}
export function clipPackage(a: {
    p: ProductionState;
    recipe: FormatRecipe;
    brandId: string;
    brandName: string;
    product: string;
    kit: CreativeKit | null;
    language: string;
    index: number;
    startFrame?: string | null;
    limit?: number;
    stills?: boolean;
    video?: boolean;
}): {
    refs: ClipRefFile[];
    prompt: string;
} {
    const { p, recipe, index } = a;
    const plan = p.video_plan!;
    const refs = clipReferences(a);
    const notes = refNotes(refs, (recipe.people ?? 1) > 1, !!plan.cut, isCinematic(recipe));
    const prompt = clipPrompt({ refNotes: notes.full, refNotesShort: notes.short, language: a.language, index, count: plan.segments.length, chainByVideo: a.video !== false, chain: plan.cut ? "reference" : "extend", timing: "seconds", speech: "quotes", cuts: p.reference_mode === "exact", aspect: p.aspect, resolution: p.resolution, recipe, preset: p.preset, brand: a.brandName, product: a.product, plan, images: refs, limit: a.limit ?? API_PROMPT_LIMIT, audio: p.video_audio });
    return { refs, prompt };
}
export const missingTags = (prompt: string, count: number): string[] => {
    const named = new Set(promptTags(prompt));
    return Array.from({ length: count }, (_, i) => `@Image${i + 1}`).filter((t) => !named.has(t));
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function indexPage(title: string, pack: Omit<HandoffPack, "index">): string {
    const clips = pack.clips
        .map((c) => `<section>
<h2>Clip ${c.index + 1} <small>${c.prompt.length} of ${pack.limit} characters · folder ${esc(c.dir)}</small></h2>
<p>1. Attach these in this order. 2. Paste the prompt. 3. Set ${c.seconds} seconds and ${esc(pack.aspect)}.</p>
<ol class="refs">${c.refs.map((r) => `<li>${r.file ? `<a href="${esc(r.file)}"><img src="${esc(r.file)}" alt="${esc(r.tag)}" loading="lazy"></a>` : `<span class="video">your clip ${c.index}</span>`}<div><b>${esc(r.tag)}</b> <code>${r.file ? esc(r.file.split("/").pop()!) : "the clip you made for clip " + c.index}</code><br>${esc(r.purpose)}</div></li>`).join("")}</ol>
<button data-copy="p${c.index}">Copy the prompt</button>
<pre id="p${c.index}">${esc(c.prompt)}</pre>
</section>`)
        .join("\n");
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>
body{font:15px/1.5 system-ui,sans-serif;max-width:860px;margin:0 auto;padding:16px;background:#fff;color:#1a1a1a}
h1{font-size:20px}h2{font-size:17px;margin-top:32px}small{font-weight:400;color:#666;font-size:13px}
.refs{padding-left:20px}.refs li{display:flex;gap:12px;align-items:flex-start;margin:8px 0}
.refs img,.video{width:72px;height:96px;object-fit:cover;border:1px solid #ccc;border-radius:4px;flex:none}
.video{display:flex;align-items:center;justify-content:center;font-size:11px;color:#666;background:#f3f3f3;text-align:center}
pre{white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px;font:13px/1.45 ui-monospace,monospace}
button{padding:6px 12px;border:1px solid #888;border-radius:6px;background:#fff;cursor:pointer}code{font-size:12px}
@media (prefers-color-scheme: dark){body{background:#161616;color:#eee}pre{background:#242424}.video{background:#242424}button{background:#242424;color:#eee}small{color:#aaa}}
</style></head><body>
<h1>${esc(title)}</h1>
<p>${clipsSaid(pack.clips.map((c) => c.seconds))}, ${esc(pack.aspect)}. Each clip has its own length, set beside it. Written for ${esc(pack.model)} with reference pictures. Make the clips in order. From clip 2 on, also attach the clip you just made as the video reference (@Video1).</p>${pack.voice ? `\n<p>${esc(pack.voice)}</p>` : ""}
${clips}
<script>
document.querySelectorAll("button[data-copy]").forEach(function (b) {
  b.addEventListener("click", function () {
    var text = document.getElementById(b.getAttribute("data-copy")).textContent;
    var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy the prompt"; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { b.textContent = "Select the text and copy it by hand"; });
    else b.textContent = "Select the text and copy it by hand";
  });
});
</script>
</body></html>`;
}
function avatarVoiceLine(brandId: string, p: ProductionState, dir: string): string {
    const a = p.avatar_reference?.avatar ?? (p.avatar_id ? getAvatar(brandId, p.avatar_id) : undefined);
    if (!a)
        return "";
    const recording = avatarFile(a.voice.sample);
    if (recording) {
        const name = `voice${path.extname(recording).toLowerCase() || ".mp3"}`;
        fs.copyFileSync(recording, path.join(dir, name));
        return `Voice: ${a.name} speaks in your own recording, ${name} in this folder. Give it to the video tool as the voice to match, for every clip.`;
    }
    return a.voice.name ? `Voice: ${a.name} speaks in the voice ${a.voice.name}, from the voice list. Pick it in the video tool for every clip.` : "";
}
export async function buildHandoff(jobId: string, o: {
    stills?: boolean;
    video?: boolean;
    folder?: string;
} = {}): Promise<HandoffPack> {
    const job = db.select().from(schema.outputJobs).where(eq(schema.outputJobs.id, jobId)).get();
    const p = job?.production;
    if (!job || !p)
        throw new Error(`Production job ${jobId} not found`);
    const plan = p.video_plan;
    if (!plan)
        throw new Error("This job has no shot plan yet. Run the plan step first.");
    const recipe = FORMAT_RECIPES.find((r) => r.id === p.recipe);
    if (!recipe)
        throw new Error("This job isn't a video job.");
    if (hasStoryboard(p) && p.storyboard?.status !== "approved")
        throw new Error(p.storyboard ? "Approve the storyboard first: the clip prompts are written around its frames." : "Draw and approve the storyboard first: the clip prompts are written around its frames.");
    const brand = loadBrandBrain(job.brand_id);
    const kit = loadCreativeKit(job.brand_id);
    const product = brand.products.find((x) => x.id === p.product_id)?.name ?? brand.products[0]?.name ?? brand.brand.name;
    const language = brand.brand.locale_accent ? `English, ${brand.brand.locale_accent} accent` : "";
    const rel = `assets/${job.id}/${o.folder ?? "handoff"}`;
    const dir = path.join(env.DATA_DIR, rel);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const made = packModel();
    const clips: HandoffClip[] = [];
    for (let i = 0; i < plan.segments.length; i++) {
        const { refs, prompt } = clipPackage({ p, recipe, brandId: job.brand_id, brandName: brand.brand.name, product, kit, language, index: i, limit: made.promptLimit, stills: o.stills, video: o.video });
        const missing = missingTags(prompt, refs.length);
        if (missing.length)
            throw new Error(`Clip ${i + 1}: the prompt does not name ${missing.join(", ")}. Shorten the plan's scenes for this clip and build the pack again.`);
        const clipDir = `clip-${i + 1}`;
        fs.mkdirSync(path.join(dir, clipDir), { recursive: true });
        const out: HandoffRef[] = [];
        for (const [k, r] of refs.entries()) {
            const name = `${clipDir}/${String(k + 1).padStart(2, "0")}_${r.slug}.png`;
            await sharp(r.src!).png().toFile(path.join(dir, name));
            out.push({ tag: `@Image${k + 1}`, file: name, purpose: `${r.purpose}${r.detail ? `: ${r.detail}` : ""}` });
        }
        if (i > 0 && o.video !== false)
            out.push({ tag: "@Video1", file: "", purpose: `The clip you made for clip ${i}. Attach it as the video reference` });
        fs.writeFileSync(path.join(dir, clipDir, "prompt.txt"), prompt);
        fs.writeFileSync(path.join(dir, clipDir, "attach-in-this-order.txt"), out.map((r, k) => `${k + 1}. ${r.tag} = ${r.file ? r.file.split("/").pop() : `(the clip you made for clip ${i})`}\n   ${r.purpose}`).join("\n"));
        const overlays = plan.segments[i].scenes.map((s) => s.overlay?.trim() ?? "").filter(Boolean);
        clips.push({ index: i, dir: clipDir, seconds: segmentSeconds(plan.segments[i]), prompt, refs: out, ...(overlays.length ? { overlays } : {}) });
    }
    const voice = p.video_audio?.enabled === false ? "" : avatarVoiceLine(job.brand_id, p, dir);
    const pack = { dir: rel, seconds: clipSeconds(p), total: planSeconds(plan), aspect: p.aspect, limit: made.promptLimit, model: made.name, ...(voice ? { voice } : {}), clips };
    const readme = [
        `${job.id}: ${plan.title}`,
        `${clipsSaid(clips.map((c) => c.seconds))}, ${p.aspect}. Made for ${made.name} with reference pictures ("omni reference").`,
        ...(voice ? [voice] : []),
        `Open index.html for every prompt with a copy button and its pictures.`,
        ``,
        `For each clip, in order (1 folder per clip):`,
        `1. Attach the numbered pictures in its folder, in number order (01 is @Image1).`,
        `2. Paste prompt.txt. If the tool has its own way to pick a reference when you type @, use it for each tag.`,
        `3. Set the length to the clip's own seconds (each clip has its own, listed below and said first in its prompt) and the shape to ${p.aspect}. Generate.`,
        `4. From clip 2 on, also attach the clip you just made as the video reference (@Video1). The prompt asks for an extension of it.`,
        `5. Make a short, low-resolution draft first and watch all of it. Change 1 thing per retry, the prompt or a picture, never both.`,
        `6. If a join stutters, trim 6 frames off the end of the earlier clip and 1 frame off the start of the next.`,
        ``,
        ...clips.flatMap((c) => [`Clip ${c.index + 1} (${c.dir}, ${c.seconds} seconds, ${c.prompt.length} characters):`, ...c.refs.map((r) => `  ${r.tag} = ${r.file || "(your previous clip)"}: ${r.purpose}`), ``]),
    ].join("\n");
    fs.writeFileSync(path.join(dir, "README.txt"), readme);
    fs.writeFileSync(path.join(dir, "index.html"), indexPage(`${job.id}: ${plan.title}`, pack));
    return { ...pack, index: "index.html" };
}
