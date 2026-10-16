import type { Metadata } from "next";
import { PageHeader } from "@/components/bits";
import { SHOWCASE, SHOWCASE_REVIEWED } from "@/lib/sprint/showcase";
import { ExampleGallery } from "./example-gallery";
export const metadata: Metadata = { title: "100 ad examples · Creative Studio" };
export default function SprintExamplesPage() {
    return (<div className="mx-auto w-full max-w-[96rem]">
      <PageHeader back={{ href: "/studio/sprint", label: "100-ad sprint" }} title="100 ways to make an ad" subtitle="A curated look at what you can create. Explore finished ads and base images, from paper craft and skeleton characters to everyday photography."/>
      <ExampleGallery examples={SHOWCASE} reviewed={SHOWCASE_REVIEWED}/>
    </div>);
}
