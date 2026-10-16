"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PRODUCT_IN_PICTURE, PRODUCT_IN_PICTURE_INFO, type ProductInPicture } from "@/lib/product-in-picture";
import { cn } from "@/lib/utils";
export interface OutputOptions {
    textOnImage: boolean;
    feedCopy: boolean;
    baseImage: boolean;
    productInPicture: ProductInPicture;
}
export const defaultOutputOptions = (words = true): OutputOptions => ({ textOnImage: words, feedCopy: words, baseImage: words, productInPicture: "auto" });
export const picturesOf = (ads: number, sizes: number, o: OutputOptions) => ads * sizes * (o.textOnImage && o.baseImage ? 2 : 1);
export function ProductInPicturePicker({ value, onChange, className }: {
    value: ProductInPicture;
    onChange: (v: ProductInPicture) => void;
    className?: string;
}) {
    return (<div className={cn("text-sm", className)} data-testid="opt-product-in-picture-row">
      <span className="font-medium">The product in the picture</span>
      <Select value={value} onValueChange={(v) => onChange(v as ProductInPicture)}>
        <SelectTrigger className="mt-1.5 w-full sm:w-72" aria-label="The product in the picture" data-testid="opt-product-in-picture">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_IN_PICTURE.map((id) => (<SelectItem key={id} value={id} data-testid={`opt-product-in-picture-${id}`}>
              {PRODUCT_IN_PICTURE_INFO[id].label}
            </SelectItem>))}
        </SelectContent>
      </Select>
      <span className="mt-1 block text-xs text-muted-foreground">{PRODUCT_IN_PICTURE_INFO[value].hint}</span>
    </div>);
}
export function OutputOptionsPicker({ value, onChange, show = { text: true, copy: true, base: true, product: true }, className }: {
    value: OutputOptions;
    onChange: (v: OutputOptions) => void;
    show?: {
        text?: boolean;
        copy?: boolean;
        base?: boolean;
        product?: boolean;
    };
    className?: string;
}) {
    const row = "flex items-start gap-3 text-sm";
    return (<div className={cn("space-y-2", className)} data-testid="output-options">
      {show.text && (<label className={row}>
          <Switch checked={value.textOnImage} onCheckedChange={(on) => onChange({ ...value, textOnImage: on })} className="mt-0.5" data-testid="opt-text-on-image"/>
          <span>
            <span className="font-medium">Words on the image</span>
            <span className="block text-xs text-muted-foreground">{value.textOnImage ? "On: the headline and the other words are part of the picture." : "Off: the picture only, with clean space left for your own type."}</span>
          </span>
        </label>)}
      {show.copy && (<label className={row}>
          <Switch checked={value.feedCopy} onCheckedChange={(on) => onChange({ ...value, feedCopy: on })} className="mt-0.5" data-testid="opt-feed-copy"/>
          <span>
            <span className="font-medium">Write the copy for the feed</span>
            <span className="block text-xs text-muted-foreground">{value.feedCopy ? "On: primary text, headline, description and button, in the brand's voice." : "Off: the image only. You write what runs beside it."}</span>
          </span>
        </label>)}
      {show.base && value.textOnImage && (<label className={row}>
          <Switch checked={value.baseImage} onCheckedChange={(on) => onChange({ ...value, baseImage: on })} className="mt-0.5" data-testid="opt-base-image"/>
          <span>
            <span className="font-medium">Also give me each image without its words</span>
            <span className="block text-xs text-muted-foreground">{value.baseImage ? "On: 1 extra picture for each image, the same scene with the words taken off, to set your own type on." : "Off: only the finished image."}</span>
          </span>
        </label>)}
      {show.product && <ProductInPicturePicker value={value.productInPicture} onChange={(v) => onChange({ ...value, productInPicture: v })} className="pt-1"/>}
    </div>);
}
