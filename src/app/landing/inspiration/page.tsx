import { inspirationBrands } from "@/lib/landing/inspiration";
import { InspirationView } from "./view";
export const dynamic = "force-dynamic";
export default function Page() { return <InspirationView brands={inspirationBrands()}/>; }
