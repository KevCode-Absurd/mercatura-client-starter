"use client";
import { Switch } from "@/components/ui/switch";
export function ClaimsSwitch({ checked, onChange, testid = "claim-checks", disabled }: {
    checked: boolean;
    onChange: (on: boolean) => void;
    testid?: string;
    disabled?: boolean;
}) {
    return (<label className="flex items-start gap-3 text-sm" data-testid={`${testid}-row`}>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} data-testid={testid} className="mt-0.5"/>
      <span>
        <span className="font-medium">Check claims</span>
        <span className="block text-xs text-muted-foreground">
          {checked
            ? "On: every word is read against the brand's approved claims, and a failure is written again before it is made. Anything still flagged is shown on it, and you can approve it either way. Slower."
            : "Off: nothing is read against the claims and nothing is held back."}
        </span>
      </span>
    </label>);
}
