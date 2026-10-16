import fs from "node:fs";
import path from "node:path";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { env } from "@/lib/env";
import { EDIT_MODES } from "@/lib/video-editing/plan";
import { listVideoEdits } from "@/lib/video-editing/store";
import { VideoEditor } from "./video-editor";
import { transcriptionEnabled } from "@/lib/video-editing/captions";
export const metadata = { title: "Video editing" };
export default async function VideoEditingPage({ searchParams }: {
    searchParams: Promise<{
        mode?: string;
    }>;
}) {
    const [brand, query] = await Promise.all([activeBrand(), searchParams]);
    const guides = Object.fromEntries(Object.entries(EDIT_MODES).map(([mode, item]) => [mode, fs.readFileSync(path.join(env.SKILLS_DIR, item.skill, "SKILL.md"), "utf8").replace(/^---[\s\S]*?---\s*/, "")]));
    return <div className="mx-auto max-w-[80rem]">
    <PageHeader title="Video editing" subtitle={`Edit ${brand.name}'s existing footage into an organic post or an ecommerce ad. Keep the originals and export a separate MP4.`}/>
    <VideoEditor brandId={brand.id} initialMode={query.mode === "organic" ? "organic" : "ad"} guides={guides} saved={listVideoEdits(brand.id)} speechEnabled={transcriptionEnabled()}/>
  </div>;
}
