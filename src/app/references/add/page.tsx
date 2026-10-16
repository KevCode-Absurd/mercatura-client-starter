import { PageHeader } from "@/components/bits";
import { referenceAnalysisEnabled } from "@/lib/references/analyze";
import { ReferencesTabs } from "../references-tabs";
import { AddReferencesView } from "./add-references-view";
export default function AddReferencesPage() {
    return (<div className="mx-auto max-w-[96rem]">
      <PageHeader title="Add references" subtitle="Bring your own images and videos into the shared reference library."/>
      <ReferencesTabs />
      <AddReferencesView analysisEnabled={referenceAnalysisEnabled()}/>
    </div>);
}
