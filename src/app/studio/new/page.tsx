import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/bits";
import type { LibraryKind } from "@/db/schema";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandLook } from "@/lib/brand-look";
import { loadBrandBrain } from "@/lib/brands";
import { aLook, formatLook } from "@/lib/format-media";
import { libraryCounts } from "@/lib/library/import";
import { AD_TYPES, KIND_INFO, PDP_GROUPS, PDP_TYPES, SHOT_TYPES, VERTICALS } from "@/lib/library/taxonomy";
import { llmEnabled } from "@/lib/llm/gateway";
import { mediaUsage } from "@/lib/media/providers";
import { loadCreativeKit, productImageChoices } from "@/lib/production/kit";
import { brandImageSheet, productPhotoSheet, VIEW_INFO } from "@/lib/studio/photos";
import { unreadAssets } from "@/lib/sprint/assets";
import { listPersonas } from "@/lib/personas/store";
import { getSetting } from "@/lib/settings";
import { offerChoices } from "@/lib/offers/book";
import { isAdvanced } from "@/lib/ui-mode-server";
import { readLab } from "@/lib/creative-lab/store";
import { NewSet, type BrandImageOption, type ProductOption, type TypeOption } from "./new-set";
const HEAD: Record<LibraryKind, {
    title: string;
    subtitle: string;
}> = {
    pdp: { title: "Product images for a landing page", subtitle: "Pick a product. The 12 frames of the product page template appear, each beside a real example from the library. Swap an example, switch a frame off, then review the words before any image is made." },
    photoshoot: { title: "A photoshoot for your brand", subtitle: "Pick a product. The app suggests looks from the photoshoot library that suit it. Swap, add or remove, then review before any image is made." },
    ad: { title: "Static ads from winning layouts", subtitle: "Pick a product. The app suggests 1 layout for each type of ad from the library of ads that worked. Swap, add or remove, then review the words before any image is made." },
};
export default async function NewSetPage({ searchParams }: {
    searchParams: Promise<{
        kind?: string;
        product?: string;
        buyer?: string;
        offer?: string;
        format?: string;
        labRevision?: string;
    }>;
}) {
    const sp = await searchParams;
    const kind = sp.kind as LibraryKind;
    if (!KIND_INFO[kind])
        redirect("/studio");
    const row = await activeBrand();
    const advanced = await isAdvanced("create");
    const lab = sp.labRevision ? readLab(row.id).find(r => r.id === sp.labRevision && r.draft.productId === sp.product) : undefined;
    let products: ProductOption[] = [];
    let brandImages: BrandImageOption[] = [];
    let problem: string | null = null;
    let kitNote: string | null = null;
    let personas: {
        id: string;
        name: string;
        summary: string;
        image?: string | null;
    }[] = [];
    let offers: {
        id: string;
        name: string;
        price: string;
        designed: boolean;
    }[] = [];
    try {
        const brand = loadBrandBrain(row.id);
        const profiles = new Map(listPersonas(row.id).map((x) => [x.id, x]));
        personas = brand.personas.map((x) => ({ id: x.id, name: x.name, summary: x.summary, image: profiles.get(x.id)?.image ?? null }));
        offers = offerChoices(row.id, brand).map((o) => ({ id: o.id, name: o.name, price: `${brand.brand.currency} ${o.price}`, designed: o.designed }));
        const kit = loadCreativeKit(row.id);
        products = brand.products.map((p) => {
            const c = productImageChoices(row.id, kit, p.id);
            const sheet = productPhotoSheet(row.id, kit, p.id);
            const own = brandImageSheet(row.id, p.id);
            return { id: p.id, name: p.name, format: p.format, folder: c.folder, files: c.files, chosen: sheet.picked.length ? sheet.picked : [c.hero].filter(Boolean), photos: sheet.photos.filter((x) => !(x.locked && x.known === "no")).map((x) => ({ name: x.name, label: VIEW_INFO[x.view].label, shows: x.shows, locked: x.locked, why: x.why, note: x.note })), brandPicked: [...own.looks, ...own.world] };
        });
        brandImages = brandImageSheet(row.id, "").images.map((b) => ({ rel: b.rel, kind: b.kind, productId: b.productId, note: b.note }));
        if (!kit)
            kitNote = advanced ? "The creative kit isn't built yet, so the app doesn't know which photos show each product. Build it on the Brand brain page (a few cents) before making real images." : "The creative kit isn't built yet, so the app doesn't know which photos show each product. Build it on the Brand brain page before making real images.";
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
        problem = `${row.name} has no brand.json yet. Build the brand brain first.`;
    }
    const count = libraryCounts()[kind];
    const types: TypeOption[] = kind === "pdp"
        ? PDP_TYPES.map((t) => ({ id: t.id, label: t.label, group: t.group, hint: `${t.job}. Needs: ${t.needs}` }))
        : kind === "ad"
            ? AD_TYPES.map((t) => ({ id: t.id, label: t.label, group: t.funnel, hint: t.job }))
            : SHOT_TYPES.map((t) => ({ id: t.id, label: t.label, group: "", hint: t.job }));
    const groups = kind === "pdp" ? PDP_GROUPS.map((g) => ({ id: g.id as string, label: `${g.id}: ${g.question}` })) : kind === "ad" ? [{ id: "TOF", label: "Top of funnel: stop the scroll" }, { id: "MOF", label: "Middle: prove it" }, { id: "BOF", label: "Bottom: act now" }] : [];
    const look = loadBrandLook(row.id);
    const usage = mediaUsage();
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: kind === "ad" ? "/studio/ads" : "/studio", label: "Back" }} title={HEAD[kind].title} subtitle={HEAD[kind].subtitle}/>
      {problem || !count ? (<div className="max-w-2xl space-y-2 p-6 text-sm">
          <p className="text-amber-800">{advanced ? (problem ?? "The library for this isn't imported yet. Run pnpm libraries:import once.") : problem ? `${row.name} is not set up yet. Build the brand brain first.` : "The library for this is not set up yet."}</p>
          <Link href="/brand" className="text-primary hover:underline">
            Open the Brand brain
          </Link>
        </div>) : (<>
          {kitNote && (<p className="mx-6 mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="kit-note">
              {kitNote}{" "}
              <Link href="/brand" className="font-medium underline">
                Open the Brand brain
              </Link>
            </p>)}
          {kind === "ad" && formatLook(sp.format) && (<p className="mx-6 mt-6 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm" data-testid="format-look-note">
              Every ad of this set will be made as {aLook(formatLook(sp.format)!.label)} image. {formatLook(sp.format)!.what} You can change it under Creative format, further down.
            </p>)}
        <NewSet kind={kind} info={KIND_INFO[kind]} brandName={row.name} products={products} brandImages={brandImages} unreadImages={unreadAssets(row.id)} initialProduct={products.find((p) => p.id === sp.product)?.id ?? (products.length === 1 ? products[0].id : null)} types={types} groups={groups} verticals={[...VERTICALS]} live={llmEnabled()} look={look ? { fonts: look.fonts.map((f) => `${f.family} ${f.weight}`), colors: look.palette.map((c) => c.hex), specimen: look.specimen } : null} imagesLeft={Math.max(0, usage.imageCap - usage.images)} personas={personas} initialBuyers={personas.some((x) => x.id === sp.buyer) ? [sp.buyer!] : []} offers={offers} initialOffer={offers.some((o) => o.id === sp.offer) ? sp.offer! : null} checks={getSetting(row.id, "checks")} initialFormatLook={kind === "ad" ? (formatLook(sp.format)?.id ?? null) : null} initialNotes={lab ? `Creative Lab revision: ${lab.id}\nUse the selected argument and campaign world from Creative Lab v${lab.version}.` : ""} initialAspects={lab?.draft.aspects} initialTextOnImage={lab ? lab.draft.textMode !== "text_free" : undefined}/>
        </>)}
    </div>);
}
