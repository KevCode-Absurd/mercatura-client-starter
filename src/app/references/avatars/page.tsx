import { PageHeader } from "@/components/bits";
import { listAvatars } from "@/lib/avatars/store";
import { listedVoices } from "@/lib/avatars/voices";
import { activeBrand } from "@/lib/brand-context";
import { FORMAT_RECIPES } from "@/lib/formats";
import { llmEnabled } from "@/lib/llm/gateway";
import { listPersonas } from "@/lib/personas/store";
import { recipeUsesCharacterOnly } from "@/lib/production/prompts";
import { ReferencesTabs } from "../references-tabs";
import { AvatarLibraryView } from "./avatar-library-view";
import { MakeYourOwn } from "./make-your-own";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function AvatarReferencesPage() {
    const row = await activeBrand();
    const personas = listPersonas(row.id);
    return (<div className="mx-auto max-w-[96rem]">
      <PageHeader title="Avatar references" subtitle="Find a face for your next ad. Use an avatar as it is, put its face into a scene photo to make a photorealistic picture, or make your own. The ones you keep can be picked when you make a video."/>
      <ReferencesTabs />
      <div className="px-6 pt-5"><Button asChild variant="outline"><Link href="/references/avatars/packs">Avatar settings packs</Link></Button><p className="mt-2 text-xs text-muted-foreground">Put a saved avatar in settings chosen for your brand, then keep images as references for your next creative.</p></div>
      <AvatarLibraryView personas={personas.map((p) => ({ id: p.id, name: p.name }))} makeYourOwn={<MakeYourOwn personas={personas.map((p) => ({ id: p.id, name: p.name, who: p.who, look: p.look }))} avatars={listAvatars(row.id)} voices={listedVoices()} looks={FORMAT_RECIPES.filter((r) => r.character && recipeUsesCharacterOnly(r)).map((r) => ({ id: r.id, label: r.label }))} live={llmEnabled()}/>}/>
    </div>);
}
