import Link from "next/link";
import { ArrowRight } from "lucide-react";
export function EmptyNext({ title, why, href, act, also, testid = "empty-next" }: {
    title: string;
    why: string;
    href: string;
    act: string;
    also?: {
        href: string;
        label: string;
    };
    testid?: string;
}) {
    return (<div className="mx-6 mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border bg-card p-6" data-testid={testid}>
      <div className="min-w-0 flex-1 basis-80">
        <div className="font-serif text-2xl leading-tight">{title}</div>
        <p className="mt-1.5 text-sm text-muted-foreground">{why}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {also && (<Link href={also.href} className="text-sm font-medium text-primary hover:underline">
            {also.label}
          </Link>)}
        <Link href={href} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90" data-testid={`${testid}-go`}>
          {act}
          <ArrowRight className="size-4"/>
        </Link>
      </div>
    </div>);
}
