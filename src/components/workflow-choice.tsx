"use client";
import type { WorkflowMode } from "@/lib/production/workflow";
import { useId } from "react";
export function WorkflowChoice({ value, onChange, disabled = false }: {
    value: WorkflowMode;
    onChange: (value: WorkflowMode) => void;
    disabled?: boolean;
}) {
    const group = useId();
    return <fieldset disabled={disabled} className="space-y-2" data-testid="workflow-choice">
    <legend className="mb-2 text-sm font-semibold">How do you want to create?</legend>
    <div className="grid gap-2 sm:grid-cols-2">
      {([
            ["guided", "Approve step by step", "Recommended to start. Review the script and plan, character, storyboard and clips. Approval starts the next step."],
            ["automatic", "AI end to end", "Create the finished video automatically with the same models and checks. Pause anytime; failed checks need your review."],
        ] as const).map(([mode, label, description]) => <label key={mode} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${value === mode ? "border-primary bg-primary/5" : "bg-card"}`}>
        <input type="radio" name={group} value={mode} checked={value === mode} onChange={() => onChange(mode)} className="mt-1" data-testid={`workflow-${mode}`}/>
        <span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span>
      </label>)}
    </div>
  </fieldset>;
}
