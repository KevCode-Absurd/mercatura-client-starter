import { PageHeader } from "@/components/bits";
import { NeedsBrain } from "@/components/needs-brain";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { llmEnabled } from "@/lib/llm/gateway";
import { builderState, type BuilderState } from "./actions";
import { BuilderView } from "./builder-view";
export const dynamic = "force-dynamic";
export default async function BuilderPage() {
    const row = await activeBrand();
    let state: BuilderState;
    try {
        state = await builderState();
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
        return <NeedsBrain title="Script builder" brandName={row.name} why="A script is built from the brand's products, personas, angles and offers, which are kept with the brand brain."/>;
    }
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader title="Script builder" subtitle={<>A script is 6 choices: the product, the buyer&apos;s stage, the persona, the angle, the offer and the format. Tick what you want, say how many, and {row.name}&apos;s scripts are written for the combinations.</>}/>
      <BuilderView initial={state} live={llmEnabled()}/>
    </div>);
}
