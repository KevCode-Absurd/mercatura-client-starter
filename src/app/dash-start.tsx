import Link from "next/link";
import { ArrowRight, Camera, Image as ImageIcon, Layers, LayoutGrid, Play, Repeat2, Shapes, Video } from "lucide-react";
import { assetExists, exampleOf } from "./formats/examples";
const CARDS = [
    { id: "image-ad", href: "/formats/ad-layout", label: "Image ad", what: "Brief to 4 pictures, about 2 minutes", icon: ImageIcon, example: "ad-layout" },
    { id: "video-ad", href: "/builder", label: "Video ad", what: "Hooks, script and shot list", icon: Video, example: "ugc" },
    { id: "remix", href: "/references", label: "Remix a winner", what: "New hooks for an ad that works", icon: Repeat2, example: "from-references" },
    { id: "sprint", href: "/studio/sprint", label: "100-ad sprint", what: "A month of ads in 1 run", icon: Layers, example: "sprint" },
] as const;
const MORE = [
    { id: "pdp", href: "/formats/pdp", label: "Product images", icon: LayoutGrid },
    { id: "photoshoot", href: "/formats/photoshoot", label: "Photoshoots", icon: Camera },
    { id: "formats", href: "/studio#formats", label: "Every other format", icon: Shapes },
] as const;
const src = (rel: string, w: number) => `/api/assets/${rel}?w=${w}`;
export function DashStart({ work = [], frames = [] }: {
    work?: string[];
    frames?: string[];
}) {
    const own = work.filter(assetExists).slice(0, 24);
    const frame = frames.find(assetExists) ?? own[4];
    return (<div className="space-y-8" data-testid="dash-screens">
      <ul className="grid grid-cols-2 gap-6 max-md:gap-3 xl:grid-cols-4">
        {CARDS.map((c) => {
            const example = exampleOf(c.example);
            return (<li key={c.id} className="min-w-0">
              <Link href={c.href} className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_24px_48px_-28px_rgba(40,30,10,0.45)]" data-testid={`dash-start-${c.id}`}>
                <span className="relative block aspect-square w-full overflow-hidden bg-accent/60 md:aspect-[4/3] xl:aspect-square">
                  <Picture id={c.id} own={own} frame={frame} example={example} icon={c.icon}/>
                </span>
                <span className="flex items-start justify-between gap-3 px-5 pb-5 pt-4 max-md:px-3.5 max-md:pb-4 max-md:pt-3">
                  <span className="min-w-0">
                    <span className="block font-serif text-[1.75rem] leading-none max-md:text-xl">{c.label}</span>
                    <span className="mt-2 block text-sm text-muted-foreground max-md:text-xs">{c.what}</span>
                  </span>
                  <span className="mt-0.5 flex size-8 shrink-0 max-md:hidden items-center justify-center rounded-full border text-muted-foreground transition group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <ArrowRight className="size-4"/>
                  </span>
                </span>
              </Link>
            </li>);
        })}
      </ul>
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm">
        <span className="mr-1 text-muted-foreground">Also</span>
        {MORE.map((m) => (<Link key={m.id} href={m.href} className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-card px-4 text-foreground/80 transition hover:border-primary/50 hover:text-primary" data-testid={m.id === "formats" ? "dash-more-formats" : `dash-start-${m.id}`}>
            <m.icon className="size-3.5"/> {m.label}
          </Link>))}
      </p>
    </div>);
}
const shot = "absolute overflow-hidden rounded-md bg-card shadow-[0_10px_24px_-10px_rgba(30,25,10,0.45)] ring-1 ring-black/5";
function Picture({ id, own, frame, example, icon: Icon }: {
    id: (typeof CARDS)[number]["id"];
    own: string[];
    frame?: string;
    example: string | null;
    icon: typeof ImageIcon;
}) {
    const img = (rel: string, w: number, className: string) => (<img src={src(rel, w)} alt="" loading="lazy" className={className}/>);
    const plain = example ? img(example, 640, "size-full object-cover transition duration-300 group-hover:scale-[1.03]") : <span className="flex size-full items-center justify-center text-primary/50"><Icon className="size-10" strokeWidth={1.25}/></span>;
    if (id === "image-ad") {
        if (!own[0])
            return plain;
        return img(own[0], 640, "size-full object-cover transition duration-300 group-hover:scale-[1.03]");
    }
    if (id === "video-ad") {
        if (!frame)
            return plain;
        return (<>
        {img(frame, 640, "size-full object-cover object-top transition duration-300 group-hover:scale-[1.03]")}
        <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent"/>
        <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-primary shadow-lg transition duration-300 group-hover:scale-110 max-md:size-11">
          <Play className="ml-0.5 size-5 fill-current max-md:size-4"/>
        </span>
        <span className="absolute inset-x-4 bottom-4 h-1 overflow-hidden rounded-full bg-white/40">
          <span className="block h-full w-1/3 rounded-full bg-white"/>
        </span>
      </>);
    }
    if (id === "remix") {
        if (own.length < 4)
            return plain;
        return (<>
        <span className={`${shot} inset-y-[15%] -left-[9%] aspect-square -rotate-[9deg] transition duration-300 group-hover:-translate-x-1 group-hover:-rotate-[11deg]`}>{img(own[2], 320, "size-full object-cover object-top")}</span>
        <span className={`${shot} inset-y-[15%] -right-[9%] aspect-square rotate-[9deg] transition duration-300 group-hover:translate-x-1 group-hover:rotate-[11deg]`}>{img(own[3], 320, "size-full object-cover object-top")}</span>
        <span className={`${shot} inset-y-[9%] left-1/2 aspect-square -translate-x-1/2 transition duration-300 group-hover:scale-[1.03]`}>{img(own[1], 480, "size-full object-cover object-top")}</span>
      </>);
    }
    if (own.length < 12)
        return plain;
    return (<span className="absolute -inset-x-[6%] -inset-y-[4%] grid -rotate-[4deg] grid-cols-4 gap-1.5 transition duration-300 group-hover:scale-[1.04]">
      {[...own.slice(4), ...own].slice(0, 20).map((p, i) => (<span key={`${p}-${i}`} className="aspect-square overflow-hidden rounded-[3px] bg-card ring-1 ring-black/5">
          {img(p, 160, "size-full object-cover object-top")}
        </span>))}
    </span>);
}
