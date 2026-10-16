"use client";
import { Download, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
const link = "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted max-sm:h-auto max-sm:py-1.5 max-sm:wrap-anywhere [&_svg]:shrink-0";
export function ExportButtons({ id, images, className }: {
    id: string;
    images: number;
    className?: string;
}) {
    return (<span className={cn("inline-flex min-w-0 flex-wrap items-center gap-2", className)} data-testid="export-buttons">
      {images > 0 && (<a href={`/api/studio/${id}/download`} download className={link} title="Every finished image, named and numbered, with the ad copy as a spreadsheet" data-testid="download-all">
          <Download className="size-3.5"/>
          Download all {images} image{images === 1 ? "" : "s"}
        </a>)}
      <a href={`/api/studio/${id}/download?what=csv`} download className={link} title="The words of every ad as a spreadsheet: on-image text, primary text, headline, description, button" data-testid="download-copy">
        <FileSpreadsheet className="size-3.5"/>
        Ad copy as a spreadsheet
      </a>
    </span>);
}
