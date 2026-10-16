import Link from "next/link";
import { activeBrandId } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { PageHeader } from "@/components/bits";
import { mechanismsFromEvidence } from "@/lib/production-portfolio/core";
import { portfolioEvidence } from "@/lib/production-portfolio/runtime";
import { listPortfolios } from "@/lib/production-portfolio/store";
import { Workbench } from "./workbench";
export default async function CreativePortfolioPage() { const brandId = await activeBrandId(), brain = loadBrandBrain(brandId), records = portfolioEvidence(brandId); return <main className="space-y-6 p-6"><PageHeader title="Creative portfolio" subtitle="Reserve distinct supported arguments, audition production worlds and review each delivered output."><Link href="/studio">Back to Create</Link></PageHeader><Workbench products={brain.products.map(p => ({ id: p.id, name: p.name, mechanisms: mechanismsFromEvidence(records, { productId: p.id, market: brain.brand.market }) }))} market={brain.brand.market} saved={listPortfolios(brandId)}/></main>; }
