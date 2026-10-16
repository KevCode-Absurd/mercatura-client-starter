import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { listScans } from "@/lib/landing/store";
import { SecurityView } from "./security-view";
export const dynamic = "force-dynamic";
export default async function SecurityPage() {
    const row = await activeBrand();
    return (<div>
      <PageHeader title="Security scan" subtitle="Check your website for common security issues and get a list of fixes. The scan only reads public pages and settings; it does not sign in or submit forms."/>
      <SecurityView scans={listScans(row.id, "security")}/>
    </div>);
}
