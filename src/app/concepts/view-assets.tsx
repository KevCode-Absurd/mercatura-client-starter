import Link from "next/link";
import { Images } from "lucide-react";
import { Button } from "@/components/ui/button";
export function ViewConceptAssets({ conceptId, count, variant }: {
    conceptId: string;
    count: number;
    variant?: string;
}) {
    const href = `/production?concept=${encodeURIComponent(conceptId)}${variant ? `&variant=${variant}` : ""}&finished=1`;
    return count ? <Button size="sm" variant="outline" asChild data-testid="concept-view-assets"><Link href={href}><Images className="size-3.5"/>View assets <span className="text-xs text-muted-foreground">({count})</span></Link></Button>
        : <Button size="sm" variant="outline" disabled title="Finished creatives will appear here after production." data-testid="concept-view-assets"><Images className="size-3.5"/>View assets</Button>;
}
