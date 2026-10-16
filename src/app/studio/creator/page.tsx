import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { listAvatars } from "@/lib/avatars/store";
import { creatorData } from "@/lib/creator-data";
import { mediaLive } from "@/lib/media/providers";
import { llmEnabled } from "@/lib/llm/gateway";
import { CreatorWorkspace } from "./workspace";
import { FORMAT_RECIPES } from "@/lib/formats";
import { avatarKindFor } from "@/lib/production/prompts";
import { GALLERY } from "@/lib/format-gallery";
import { formatById } from "@/lib/catalogue";
export const dynamic = "force-dynamic";
export default async function CreatorWorkspacePage({ searchParams }: {
    searchParams: Promise<{
        avatar?: string;
        script?: string;
    }>;
}) {
    const brand = await activeBrand();
    const sp = await searchParams;
    const data = creatorData(brand.id);
    const recipeRoutes = Object.fromEntries(GALLERY.flatMap((format) => {
        const entry = format.start.via === "script" && format.group === "video" ? formatById(format.start.catalogue)?.start : null;
        return entry?.how === "script" ? [[entry.recipe, `/formats/${format.id}`]] : [];
    }));
    return <div className="mx-auto w-full max-w-[80rem]"><PageHeader title="Creator Studio" back={{ href: "/studio", label: "All creations" }} subtitle={`Create a finished video for ${brand.name}.`}/><CreatorWorkspace brandId={brand.id} recipeRoutes={recipeRoutes} recipeKinds={Object.fromEntries(FORMAT_RECIPES.map((r) => [r.id, avatarKindFor(r)]))} avatars={listAvatars(brand.id)} scripts={data.scripts} concepts={data.concepts} jobs={data.jobs} liveImages={mediaLive()} liveScript={llmEnabled()} initialAvatarId={sp.avatar} initialScriptId={sp.script}/></div>;
}
