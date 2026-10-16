import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { ReferencesTabs } from "../../references-tabs";
import { AvatarPacksWorkspace } from "./workspace";
export const dynamic = "force-dynamic";
export default async function AvatarPacksPage({ searchParams }: {
    searchParams: Promise<{
        avatar?: string;
    }>;
}) {
    const brand = await activeBrand();
    const sp = await searchParams;
    return <div className="mx-auto max-w-6xl">
    <PageHeader title="Avatar settings packs" back={{ href: "/references/avatars", label: "Avatar references" }} subtitle={`The same creator in settings that fit ${brand.name}. Keep individual images to reuse in your next creative.`}/>
    <ReferencesTabs />
    <AvatarPacksWorkspace brandId={brand.id} brandName={brand.name} initialAvatarId={sp.avatar}/>
  </div>;
}
