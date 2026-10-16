import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { formatById } from "@/lib/catalogue";
import { galleryFormat } from "@/lib/format-gallery";
import { llmEnabled } from "@/lib/llm/gateway";
import { mediaUsage, mediaLive } from "@/lib/media/providers";
import { avatarsFor } from "@/lib/avatars/store";
import { FORMAT_RECIPES } from "@/lib/formats";
import { avatarKindFor } from "@/lib/production/prompts";
import { getSetting } from "@/lib/settings";
import { listPersonas } from "@/lib/personas/store";
import { loadCreativeKit, productImageChoices } from "@/lib/production/kit";
import { isAdvanced } from "@/lib/ui-mode-server";
import { exampleOf } from "../examples";
import { offerChoices } from "@/lib/offers/book";
import { FormatFlow, type FlowPersona, type FlowProduct } from "./format-flow";
import type { FlowOffer } from "./offer-pick";
import type { FlowAngle } from "./angle-pick";
import { angleLibrary } from "@/lib/angles/server";
export default async function FormatPage({ params, searchParams }: {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        workflow?: string;
        avatar?: string;
        start?: string;
    }>;
}) {
    const [{ id }, choices] = await Promise.all([params, searchParams]);
    const format = galleryFormat(id);
    if (!format)
        notFound();
    const row = await activeBrand();
    const advanced = await isAdvanced("create");
    let products: FlowProduct[] = [];
    let personas: FlowPersona[] = [];
    let problem = "";
    let offers: FlowOffer[] | undefined;
    let angles: FlowAngle[] | undefined;
    try {
        const brand = loadBrandBrain(row.id);
        const kit = loadCreativeKit(row.id);
        const profiles = new Map(listPersonas(row.id).map((x) => [x.id, x]));
        products = brand.products.map((p) => {
            const c = productImageChoices(row.id, kit, p.id);
            return { id: p.id, name: p.name, format: p.format, folder: c.folder, photo: c.hero || c.files[0] || null };
        });
        if (format.start.via === "studio" && format.start.picks === "ready")
            offers = offerChoices(row.id, brand).map((o) => ({ id: o.id, name: o.name }));
        if (format.start.via === "studio" && format.start.picks === "review")
            angles = angleLibrary(row.id).angles.slice(0, 12).map((a) => ({ id: a.theme_id, label: a.label, phrase: a.best.quote, ref: a.best.ref, status: a.status, frequency: a.frequency }));
        personas = brand.personas.map((p) => ({ id: p.id, name: p.name, summary: p.summary, image: profiles.get(p.id)?.image ?? null }));
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
        problem = `${row.name} is not set up yet. Build the brand brain first.`;
    }
    const usage = mediaUsage();
    const picked = format.start.via === "studio" ? formatById(format.id)?.start : undefined;
    const own = picked?.how === "screen" ? picked.href : null;
    const written = format.start.via === "script" ? formatById(format.start.catalogue) : undefined;
    const lengths = written && written.medium !== "image" && written.start.how === "script" ? written.start.lengths : [];
    const recipeId = written?.start.how === "script" ? written.start.recipe : undefined;
    const recipe = FORMAT_RECIPES.find((r) => r.id === recipeId);
    const avatarKind = recipe ? avatarKindFor(recipe) : null;
    const avatars = avatarKind ? avatarsFor(row.id, { kind: avatarKind, style: recipe?.id }).map((a) => ({ id: a.id, name: a.name, portrait: a.portrait, kind: a.kind })) : [];
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader back={{ href: "/studio#formats", label: "All formats" }} title={format.label} subtitle={`For ${row.name}.`}/>
      {problem ? (<p className="p-6 text-sm text-amber-800">
          {problem}{" "}
          <Link href="/brand" className="underline">
            Open the Brand brain
          </Link>
        </p>) : (<FormatFlow initialWorkflow={choices.workflow === "automatic" ? "automatic" : "guided"} initialAvatarId={choices.avatar} initialStart={choices.start === "1"} format={format} example={exampleOf(format.id)} own={own} lengths={lengths} offers={offers} angles={angles} products={products} personas={personas} avatars={avatars} liveImages={mediaLive()} live={llmEnabled()} imagesLeft={Math.max(0, usage.imageCap - usage.images)} advanced={advanced} claims={getSetting(row.id, "checks").claims}/>)}
    </div>);
}
