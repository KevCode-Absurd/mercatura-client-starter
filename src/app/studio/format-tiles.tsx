import Link from "next/link";
import { ArrowRight, Camera, Clapperboard, FileText, Megaphone } from "lucide-react";
import { formatById } from "@/lib/catalogue";
import { skillTitle, skillTitles } from "@/lib/skills/titles";
import { FORMAT_LOOKS, type FormatLookId } from "@/lib/format-media";
import { GROUPS, GROUP_INFO, galleryByGroup, type FormatGroup } from "@/lib/format-gallery";
import { exampleOf } from "../formats/examples";
const ICON: Record<FormatGroup, typeof Camera> = { ads: Megaphone, photos: Camera, video: Clapperboard, briefs: FileText };
const TWIN_OF: Partial<Record<FormatLookId, string>> = { claymation: "claymation", comic: "comic", ugc: "ugc", "talking-object": "talking-object", podcast: "podcast", explainer: "explainer", satisfying: "satisfying", founder: "brief-founder", "cinematic-3d": "cinematic-3d", "clay-world": "clay-world", wool: "wool", paper: "paper", watercolor: "watercolor", anime: "anime", skeleton: "skeleton", "motion-graphics": "motion-graphics", collage: "collage" };
const imageFormOf = (galleryId: string) => FORMAT_LOOKS.find((l) => TWIN_OF[l.id] === galleryId) ?? null;
const imageFormHref = (look: FormatLookId) => `/studio/new?kind=ad&format=${look}`;
const mediumOfGroup = (g: FormatGroup) => (g === "video" || g === "briefs" ? "video" : "image");
const isNew = (id: string) => formatById(id)?.tried === false;
export function FormatTiles({ advanced, skip }: {
    advanced: boolean;
    skip: string[];
}) {
    return (<div className="space-y-12" data-testid="format-gallery">
      {GROUPS.map((g) => {
            const Icon = ICON[g];
            const formats = galleryByGroup(g).filter((f) => !skip.includes(f.id));
            if (!formats.length)
                return null;
            return (<div key={g} data-testid={`format-group-${g}`} data-format-group>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-3">
              <Icon className="size-4 text-primary" aria-hidden="true"/>
              <h3 className="display text-2xl">{GROUP_INFO[g].label}</h3>
              <span className="text-sm text-muted-foreground">{GROUP_INFO[g].blurb}</span>
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6 max-sm:gap-x-3 md:grid-cols-3 xl:grid-cols-4">
              {formats.map((f) => {
                    const example = exampleOf(f.id);
                    const still = imageFormOf(f.id);
                    const stillExample = still ? (exampleOf(`${still.id}-image`) ?? example) : null;
                    return [
                        <li key={f.id} className="min-w-0" data-medium={mediumOfGroup(g)} data-words={`${f.label} ${f.what} ${GROUP_INFO[g].label}`.toLowerCase()}>
                    <Link href={`/formats/${f.id}`} className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition hover:border-primary/60 hover:shadow-sm" data-testid={`format-tile-${f.id}`}>
                      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                        {example ? (<img src={`/api/assets/${example}?w=480`} alt={`An example of ${f.label.toLowerCase()}`} className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" data-testid="format-example"/>) : (<div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground" data-testid="format-no-example">
                            <Icon className="size-8"/>
                            <span className="text-xs">No example picture yet</span>
                          </div>)}
                        {g === "video" && <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white">Video · a still</span>}
                        {isNew(f.id) && <span className="absolute right-2 top-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">New</span>}
                      </div>
                      <div className="flex flex-1 flex-col p-4 max-sm:p-3">
                        <div className="text-[15px] font-semibold leading-snug">
                          {f.label}
                          {still && g === "video" ? " · video" : ""}
                        </div>
                        <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">{f.what}</p>
                        {advanced && <p className="mt-1.5 text-[11px] text-muted-foreground">Skills: {skillTitles(f.skills)}</p>}
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                          Make this <ArrowRight className="size-4 transition group-hover:translate-x-0.5"/>
                        </span>
                      </div>
                    </Link>
                  </li>,
                        still && (<li key={`${f.id}-image`} className="min-w-0" data-medium="image" data-words={`${still.label} image still static ad ${still.what}`.toLowerCase()}>
                      <Link href={imageFormHref(still.id)} className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition hover:border-primary/60 hover:shadow-sm" data-testid={`format-image-tile-${still.id}`}>
                        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                          {stillExample ? (<img src={`/api/assets/${stillExample}?w=480`} alt={`An example of ${still.label.toLowerCase()}`} className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy"/>) : (<div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                              <Megaphone className="size-8"/>
                              <span className="text-xs">No example picture yet</span>
                            </div>)}
                          <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white">Image</span>
                        </div>
                        <div className="flex flex-1 flex-col p-4 max-sm:p-3">
                          <div className="text-[15px] font-semibold leading-snug">{still.label} · image</div>
                          <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">{still.what} Made as a static ad.</p>
                          {advanced && <p className="mt-1.5 text-[11px] text-muted-foreground">Skills: {skillTitle(still.skill)} (image part)</p>}
                          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                            Make this <ArrowRight className="size-4 transition group-hover:translate-x-0.5"/>
                          </span>
                        </div>
                      </Link>
                    </li>),
                    ];
                })}
            </ul>
          </div>);
        })}
      <p className="max-w-3xl text-[13px] leading-relaxed text-muted-foreground">Each example shows the format on a plain pack with no brand on it. Yours is made with your real product, your words and your colours. A video format shows a still, not a clip. A format marked &quot;image&quot; is the same idea made as 1 static ad. &quot;New&quot; means nobody has made and checked a real one yet. Read its plan closely the first time.</p>
    </div>);
}
