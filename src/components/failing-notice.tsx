import Link from "next/link";
import { failureGroups } from "@/lib/failures";
export function FailingNotice({ brandId, area }: {
    brandId: string;
    area: "pictures" | "words";
}) {
    const groups = failureGroups(brandId).filter((g) => g.area === area);
    if (!groups.length)
        return null;
    const top = groups[0];
    return (<p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="failing-notice">
      The checks keep finding the same {groups.length === 1 ? "thing" : `${groups.length} things`} on this brand&apos;s {area === "pictures" ? "images" : "scripts and copy"}. The most frequent: {top.label.toLowerCase()} ({top.count} times).{" "}
      <Link href="/lessons#failing" className="font-medium underline underline-offset-2">
        Decide what becomes a rule
      </Link>
    </p>);
}
