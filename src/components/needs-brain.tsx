import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/bits";
export function NeedsBrain({ title, brandName, why }: {
    title: string;
    brandName: string;
    why?: string;
}) {
    return (<div>
      <PageHeader title={title}/>
      <div className="m-6 max-w-2xl rounded-lg border border-input p-5" data-testid="needs-brain">
        <div className="text-lg font-extrabold tracking-tight">{brandName} has no brand brain yet</div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {why ?? "This screen works from what the brand sells, what it may claim and who buys it."} Build the brand brain first: add the brand&apos;s website or documents, or answer the founder questionnaire, then press Build on the Brand brain screen. It takes a few minutes and is done once.
        </p>
        <Link href="/brand" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90" data-testid="needs-brain-go">
          Set up the brand brain
          <ArrowRight className="size-4"/>
        </Link>
      </div>
    </div>);
}
