"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FORMAT_LOOKS, aLook, formatLook, lookLettering, lookTypeOf, type LookType } from "@/lib/format-media";
const NONE = "none";
export function FormatLookPicker({ value, onChange, lookType, onLookType, className, id = "set-format" }: {
    value: string | null;
    onChange: (next: string | null) => void;
    lookType?: LookType;
    onLookType?: (next: LookType) => void;
    className?: string;
    id?: string;
}) {
    const chosen = formatLook(value);
    const lettering = onLookType ? lookLettering(chosen?.id) : null;
    return (<div className={className} data-testid={id}>
      <p className="text-sm font-medium">Creative format</p>
      <Select value={chosen?.id ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
        <SelectTrigger className="mt-1 w-full max-w-xs" data-testid={`${id}-trigger`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE} data-testid={`${id}-none`}>
            None
          </SelectItem>
          {FORMAT_LOOKS.map((f) => (<SelectItem key={f.id} value={f.id} data-testid={`${id}-${f.id}`}>
              {f.label}
            </SelectItem>))}
        </SelectContent>
      </Select>
      <p className="mt-1 max-w-xl text-xs text-muted-foreground" data-testid={`${id}-hint`}>
        {chosen ? `Every ad of this set is made as ${aLook(chosen.label)} image. ${chosen.what}` : "Leave it at None for an ordinary static. Pick one to make every ad of this set in that format, as a still image: claymation, comic, knitted wool, watercolour and so on."}
      </p>
      {lettering && onLookType && (<div className="mt-3" data-testid={`${id}-lettering`}>
          <p className="text-sm font-medium">Lettering</p>
          <Select value={lookTypeOf(lookType)} onValueChange={(v) => onLookType(lookTypeOf(v))}>
            <SelectTrigger className="mt-1 w-full max-w-xs" data-testid={`${id}-lettering-trigger`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="look" data-testid={`${id}-lettering-look`}>
                The format&apos;s own
              </SelectItem>
              <SelectItem value="brand" data-testid={`${id}-lettering-brand`}>
                The brand&apos;s fonts
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground" data-testid={`${id}-lettering-hint`}>
            {lookTypeOf(lookType) === "brand"
                ? "Every word is set in your brand's fonts, drawn the way this format draws its words."
                : `This format has lettering of its own: ${lettering}. An offer, a price and a button are still set in your brand's fonts.`}
          </p>
        </div>)}
    </div>);
}
