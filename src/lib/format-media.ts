import { FORMAT_SKILL } from "./script-types";
import type { OutputType } from "./taxonomy";
export type Medium = "image" | "video";
export const FORMAT_MEDIA: Record<string, {
    media: Medium[];
    why: string;
}> = {
    "script-format-claymation": { media: ["image", "video"], why: "A clay set reads in 1 frame (1 state of the thing that changes) as well as in a story." },
    "script-format-comic": { media: ["image", "video"], why: "A comic is a page before it is a film: 1 to 4 panels are a static ad." },
    "script-format-ugc": { media: ["image", "video"], why: "A phone photo someone posted is the still form of a phone video." },
    "script-format-talking-object": { media: ["image", "video"], why: "The object's face and its 1 line in a speech bubble carry the idea without sound." },
    "script-format-podcast": { media: ["image", "video"], why: "A frame of a clip with its caption is a known static: the reaction and the line." },
    "script-format-explainer": { media: ["image", "video"], why: "The mechanism at the moment 1 thing meets the other is 1 picture: a cutaway or a scale shot." },
    "script-format-satisfying": { media: ["image", "video"], why: "The motion frozen just before it resolves still holds the eye. Weaker than the video, but it works." },
    "script-format-founder": { media: ["image", "video"], why: "1 decision in the founder's words, on a real photo or a note. The founder is never generated in either medium." },
    "script-format-cinematic-3d": { media: ["image", "video"], why: "A film still is the look itself: 1 character, 1 moment, 1 feeling on a face." },
    "script-format-clay-world": { media: ["image", "video"], why: "A frame of the clay world, with its cast caught mid-scene, reads at once as a stop-motion film." },
    "script-format-wool": { media: ["image", "video"], why: "A knitted scene is a photograph of a small made world: the material stops the eye without moving." },
    "script-format-paper": { media: ["image", "video"], why: "Paper is layers and shadows, and those are all there in 1 frame." },
    "script-format-watercolor": { media: ["image", "video"], why: "A watercolour is a painting first. The still loses the moving pigment and keeps the look." },
    "script-format-anime": { media: ["image", "video"], why: "A key pose with 1 balloon is a drawn panel: the still form of the animation." },
    "script-format-skeleton": { media: ["image", "video"], why: "The question as the headline, and 1 to 3 rungs of the journey as panels." },
    "script-format-motion-graphics": { media: ["image", "video"], why: "The system frozen is a designed graphic: the product, 1 diagram and the type." },
    "script-format-collage": { media: ["image", "video"], why: "1 claim, 1 proof image and 1 arrow is a collage poster." },
    "script-format-song": { media: ["video"], why: "The song is the format. A still has no sound, so it has no still form." },
    "script-format-cinematic": { media: ["video"], why: "A directed live-action-style ad scene with timed coverage, performance and a product-led payoff." },
    "script-format-vsl": { media: ["video"], why: "It is length: education over minutes. Its still forms already exist as the long-copy static and the advertorial." },
    "script-format-static": { media: ["image"], why: "It is 1 designed image by definition." },
    "script-format-long-copy-static": { media: ["image"], why: "A plain image with long text beside it in the feed. As a video it would be a VSL." },
    "script-format-advertorial": { media: ["image"], why: "An image that looks like the top of an article. As a video it would be a VSL." },
    "script-format-carousel": { media: ["image"], why: "A row of still cards read in order." },
    "wide-face-portrait": { media: ["image"], why: "A selectable overhead ultra-wide portrait treatment for still ads, not a video script format." },
};
export const IMAGE_ONLY_OUTSIDE_THE_TABLE = ["native-ad-copy", "native-ad-creative", "scroll-stopper-static-ads"] as const;
export const mediumOf = (type: OutputType): Medium => (type.startsWith("static_") || type === "carousel" ? "image" : "video");
export const formatHas = (skill: string, medium: Medium): boolean => !!FORMAT_MEDIA[skill]?.media.includes(medium);
export const FORMAT_LOOKS = [
    { id: "wide-face", label: "Wide Face portrait", skill: "wide-face-portrait", type: "static_image", what: "An extreme overhead ultra-wide adult portrait: a dominant face, receding shoulders and natural skin detail.", named: /\bwide[- ]face\b/, reference: "assets/canonical-wide-face.png", referenceRole: "Wide Face camera reference only: reproduce the overhead viewpoint, extremely close rectilinear ultra-wide perspective, face-to-frame scale and receding shoulders. Identity comes from the selected character or scene brief, never this reference. Do not copy its person, markings, clothing, room, product or strong skin shine" },
    { id: "claymation", label: "Claymation", skill: "script-format-claymation", type: "ai_claymation", what: "A small clay set: 1 character and 1 thing that is plainly wrong or put right.", named: /\bclay ?mation\b|\bplasticine\b|stop[- ]motion|\bclay[- ](style|look|world|set|character|figure|ads?|images?|statics?)\b/ },
    { id: "comic", label: "Comic", skill: "script-format-comic", type: "ai_comic", what: "A comic page of 1 to 4 panels: the problem, then the turn.", named: /\bcomics?\b|graphic novel|\bmanga\b/, lettering: "comic lettering in the captions and the speech bubble" },
    { id: "ugc", label: "UGC photo", skill: "script-format-ugc", type: "ai_ugc", what: "A phone photo someone posted, with a typed-on caption.", named: /\bugc\b|creator[- ]style/ },
    { id: "talking-object", label: "Talking object", skill: "script-format-talking-object", type: "ai_talking_object", what: "An object from the buyer's life with a face and 1 line in a speech bubble.", named: /talking (object|thing|product)/ },
    { id: "podcast", label: "Podcast clip", skill: "script-format-podcast", type: "ai_podcast", what: "A frame of 2 people at microphones, with the line just said as its caption.", named: /\bpodcast[- ](style |clip |hook |book )?(ads?|images?|statics?|stills?|looks?|frames?|photos?|pictures?)\b/, lettering: "subtitle lettering on the caption" },
    { id: "explainer", label: "CGI explainer", skill: "script-format-explainer", type: "ai_explainer", what: "The mechanism in 1 rendered picture: a cutaway or a scale shot with 2 or 3 labels.", named: /\bcgi\b|\bexplainer[- ](style |clip |hook |book )?(ads?|images?|statics?|stills?|looks?|frames?|photos?|pictures?)\b/ },
    { id: "satisfying", label: "Satisfying", skill: "script-format-satisfying", type: "ai_satisfying", what: "The product's 1 motion, frozen just before it resolves.", named: /\bsatisfying[- ](style |clip |hook |book )?(ads?|images?|statics?|stills?|looks?|frames?|photos?|pictures?)\b/ },
    { id: "founder", label: "Founder", skill: "script-format-founder", type: "human_brief_founder", what: "1 decision in the founder's words, on a real photo or a note. Nobody is generated.", named: null, lettering: "typewriter or book type on a founder's note" },
    { id: "cinematic-3d", label: "Cinematic 3D", skill: "script-format-cinematic-3d", type: "ai_cinematic_3d", what: "A still from a 3D animated film: 1 character, 1 moment, lit like a photograph.", named: /\bcinematic 3d\b|\b3d[- ](animat[a-z]+|film|feature)\b|\banimated[- ](film|feature)\b/ },
    { id: "clay-world", label: "Clay world", skill: "script-format-clay-world", type: "ai_clay_world", what: "A frame of a miniature clay world with its cast, in 1 of 4 clay looks.", named: /\b(cinematic|goofy|puppet)[- ]clay|\bclay[- ](world|film|puppets?|cast)\b/, narrow: true },
    { id: "wool", label: "Knitted wool", skill: "script-format-wool", type: "ai_wool", what: "A scene in a world knitted from yarn, with the pack knitted too.", named: /\b(crochet(ed)?|knit(ted)?|yarn|wool(len|ly)?)[- ](style|look|world|scene|animation|ads?|images?|statics?|stills?|pictures?|version)\b|\bamigurumi\b/ },
    { id: "paper", label: "Paper craft", skill: "script-format-paper", type: "ai_paper", what: "A scene cut, layered or folded from real paper, seen from inside it.", named: /\bpaper ?craft\b|\bpaper[- ]?cut ?outs?\b|\bpaper[- ](world|style|look|animation|ads?|images?|statics?)\b|\borigami\b|pop[- ]up book/ },
    { id: "watercolor", label: "Watercolour", skill: "script-format-watercolor", type: "ai_watercolor", what: "A watercolour painting on textured paper, with bare paper left around it.", named: /\bwater ?colou?rs?\b|\baquarelle\b|\bpainterly\b/ },
    { id: "anime", label: "Anime", skill: "script-format-anime", type: "ai_anime", what: "1 drawn hero in a key pose, with 1 speech balloon or caption.", named: /\banime\b|\bcel[- ]shaded\b/ },
    { id: "skeleton", label: "Skeleton", skill: "script-format-skeleton", type: "ai_skeleton", what: "The question as the headline, and 1 to 3 rungs of the journey as panels.", named: /\bskeleton[- ](ads?|images?|statics?|stills?|style|look|story|video)\b|what (happens|would happen) if you/ },
    { id: "motion-graphics", label: "Motion graphic", skill: "script-format-motion-graphics", type: "ai_motion_graphics", what: "A designed graphic: the product cut out, 1 diagram or chart, and type in your brand's typefaces.", named: /\bmotion[- ]graphics?\b|\bkinetic typ[a-z]+|\binfographics?\b/ },
    { id: "collage", label: "Editorial collage", skill: "script-format-collage", type: "ai_collage", what: "1 claim, 1 proof picture and 1 arrow, in cut paper and product photos.", named: /\bcollages?\b/ },
] as const satisfies readonly {
    id: string;
    label: string;
    skill: string;
    type: OutputType;
    what: string;
    named: RegExp | null;
    narrow?: boolean;
    lettering?: string;
    reference?: string;
    referenceRole?: string;
}[];
export type FormatLookId = (typeof FORMAT_LOOKS)[number]["id"];
export const formatLook = (id: string | null | undefined) => FORMAT_LOOKS.find((f) => f.id === id) ?? null;
export const LOOK_TYPES = ["look", "brand"] as const;
export type LookType = (typeof LOOK_TYPES)[number];
export const lookTypeOf = (v: string | null | undefined): LookType => (v === "look" ? "look" : "brand");
export const lookLettering = (id: string | null | undefined): string | null => {
    const look = formatLook(id);
    return look && "lettering" in look ? look.lettering : null;
};
export function aLook(label: string): string {
    const said = label.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase());
    return `${/^[aeiou]/.test(said) ? "an" : "a"} ${said}`;
}
export function formatLookNamed(text: string | null | undefined): FormatLookId | null {
    const t = (text ?? "").toLowerCase();
    const hit = (narrow: boolean) => FORMAT_LOOKS.find((f) => ("narrow" in f) === narrow && f.named?.test(t))?.id;
    return hit(true) ?? hit(false) ?? null;
}
export function formatLookOfType(type: OutputType | null | undefined): FormatLookId | null {
    if (!type)
        return null;
    const skill = FORMAT_SKILL[type];
    return FORMAT_LOOKS.find((f) => f.skill === skill)?.id ?? null;
}
