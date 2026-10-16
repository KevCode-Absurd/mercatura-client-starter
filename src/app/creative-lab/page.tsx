import Link from "next/link";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { creativeLabData } from "@/lib/creative-lab/data";
import { CreativeLab } from "./workbench";
export default async function CreativeLabPage() {
    const brand = await activeBrand();
    return <div className="mx-auto max-w-[90rem]"><PageHeader title="Creative Lab" subtitle={`${brand.name} · local production tools`}><Link className="text-sm underline" href="/studio">Back to Create</Link></PageHeader><CreativeLab {...creativeLabData(brand.id)}/></div>;
}
