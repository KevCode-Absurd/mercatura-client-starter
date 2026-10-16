import fs from "node:fs";
import Link from "next/link";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { founderFilePath, getFounderAnswers, loadQuestionnaire, questionnaireText } from "@/lib/founder";
import { transcriptionEnabled } from "@/lib/founder-transcribe";
import { isAdvanced } from "@/lib/ui-mode-server";
import { FounderForm } from "./founder-form";
export default async function FounderPage() {
    const row = await activeBrand();
    const sections = loadQuestionnaire();
    const file = founderFilePath(row);
    const advanced = await isAdvanced("brand");
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/brand", label: "Brand brain" }} title="Founder questionnaire" subtitle={<>
            Optional, for {row.name}. The things the brand&apos;s data can&apos;t tell us. Answer any, skip any; nothing else in the app waits on it.
          </>}/>
      {sections.length ? (<FounderForm sections={sections} initial={getFounderAnswers(row.id)} questionnaire={questionnaireText()} file={file} fileExists={fs.existsSync(file)} voice={{ enabled: transcriptionEnabled(), reason: transcriptionEnabled() ? null : advanced ? "They need LLM_MODE=live and GEMINI_API_KEY in .env." : "They are not switched on for this account." }}/>) : (<p className="p-6 text-sm text-muted-foreground">
          {advanced ? <>The questions are missing. They are read from <code className="text-xs">skills/founder-interview/questionnaire.md</code>.</> : "The questions could not be loaded."}
        </p>)}
    </div>);
}
