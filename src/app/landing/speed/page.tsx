import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { listPages, listScans } from "@/lib/landing/store";
import { SpeedView } from "./speed-view";
export const dynamic = "force-dynamic";
export default async function SpeedPage({ searchParams }: {
    searchParams: Promise<{
        page?: string;
    }>;
}) {
    const sp = await searchParams;
    const row = await activeBrand();
    const pages = listPages(row.id).map((p) => ({ id: p.id, title: p.title }));
    const scans = listScans(row.id, "speed");
    return (<div>
      <PageHeader title="Page speed" subtitle="See how your page loads on a simulated slow phone and what to improve before sending shoppers to it."/>
      <SpeedView pages={pages} scans={scans} preselectPage={sp.page ?? null}/>
    </div>);
}
