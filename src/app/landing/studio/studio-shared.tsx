"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { CroBrandSnapshot } from "@/lib/landing/studio-types";
export const button = "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40 disabled:pointer-events-none";
export const primary = `${button} border-transparent bg-primary text-primary-foreground hover:bg-primary/90`;
export const input = "w-full rounded-xl border bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25";
export const fieldLabel = "mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground";
export const labels: Record<string, string> = { pdp: "Product page", home: "Homepage", collection: "Collection", advertorial: "Advertorial", listicle: "Reasons-why listicle", quiz: "Product finder quiz" };
export type BrandReview = {
    snapshot: CroBrandSnapshot;
    oneLiner: string;
    voice: string[];
    avoid: string[];
    claims: {
        text: string;
        source: string;
    }[];
    offers: {
        name: string;
        price: number;
        notes?: string;
    }[];
};
export function BrandCard({ brand, compact = false }: {
    brand: BrandReview;
    compact?: boolean;
}) {
    const { snapshot } = brand;
    return <div className="overflow-hidden rounded-2xl border bg-card">
    <div className="bg-[#182c28] p-6 text-[#f2f6ed]"><p className="text-xs uppercase tracking-[.2em] text-[#b9cdbb]">Brand Brain · shared across your workspace</p><h3 className="mt-3 font-serif text-3xl">{snapshot.name}</h3><p className="mt-3 text-sm leading-6 text-[#b9cdbb]">{brand.oneLiner || snapshot.category}</p></div>
    <div className="space-y-5 p-6"><div><p className={fieldLabel}>Your palette</p><div className="flex flex-wrap gap-3">{["primary", "accent", "paper", "ink", "cta"].map(key => <div key={key} className="text-center"><span className="mb-1 block size-9 rounded-full border" style={{ background: snapshot.tokens[key] }}/><span className="text-[10px] text-muted-foreground">{snapshot.tokens[key]}</span></div>)}</div></div>
      <div><p className={fieldLabel}>Typography</p><p className="text-sm">{snapshot.tokens["font-heading"]} / {snapshot.tokens["font-body"]}</p><p className="mt-1 text-xs text-muted-foreground">{snapshot.fonts.length} uploaded font files · {snapshot.assets.length} available images</p><div className="mt-4 space-y-3">{(["heading", "body"] as const).map(role => <FontSpecimen key={`${snapshot.hash}-${role}`} snapshot={snapshot} role={role}/>)}</div><details className="mt-3"><summary className="cursor-pointer text-xs font-semibold">Font files ({snapshot.fonts.length})</summary>{snapshot.fonts.map((font, index) => <p key={index} className="mt-2 break-all text-xs leading-5 text-muted-foreground">{font.family} · {font.weight} · {font.style} · {font.file}</p>)}</details></div>
      {!compact && <><div><p className={fieldLabel}>Voice to use</p>{brand.voice.length ? brand.voice.map((line, i) => <p key={i} className="mt-2 text-sm leading-6">{line}</p>) : <p className="text-sm text-muted-foreground">No voice rules saved yet.</p>}</div>
        {brand.avoid.length > 0 && <details><summary className="cursor-pointer text-sm font-semibold">Language and claims to avoid ({brand.avoid.length})</summary>{brand.avoid.map((line, i) => <p key={i} className="mt-2 text-sm leading-6 text-muted-foreground">{line}</p>)}</details>}
        <details><summary className="cursor-pointer text-sm font-semibold">Approved claims ({brand.claims.length})</summary>{brand.claims.length ? brand.claims.map((claim, i) => <div key={i} className="mt-3 border-t pt-3"><p className="text-sm leading-6">{claim.text}</p><p className="mt-1 break-words text-xs text-muted-foreground">Source: {claim.source || "Brand Brain"}</p></div>) : <p className="mt-3 text-sm text-muted-foreground">No substantiated claims saved.</p>}</details>
        <details><summary className="cursor-pointer text-sm font-semibold">Saved offers ({brand.offers.length})</summary>{brand.offers.map((offer, i) => <div key={i} className="mt-3 text-sm"><p>{offer.name} · {snapshot.currency} {offer.price}</p>{offer.notes && <p className="mt-1 text-xs text-muted-foreground">{offer.notes}</p>}</div>)}</details></>}
      <Link href="/brand" className="inline-block text-sm font-semibold underline underline-offset-4">Review or update Brand Brain</Link>
    </div>
  </div>;
}
function FontSpecimen({ snapshot, role }: {
    snapshot: CroBrandSnapshot;
    role: "heading" | "body";
}) {
    const family = (snapshot.tokens[`font-${role}`] || "").split(",")[0].replace(/["']/g, "").trim();
    const weight = snapshot.tokens[`weight-${role}`] || (role === "heading" ? "700" : "400"), style = snapshot.tokens[`style-${role}`] || "normal";
    const candidates = snapshot.fonts.map((font, index) => ({ font, index })).filter(({ font }) => font.family.toLowerCase() === family.toLowerCase());
    const selected = candidates.find(({ font }) => font.weight === weight && font.style === style) || candidates.find(({ font }) => font.style === style) || candidates[0];
    const alias = `cro-proof-font-${snapshot.hash.slice(0, 12).replace(/[^a-z0-9]/gi, "")}-${selected?.index ?? "missing"}`;
    const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
    useEffect(() => {
        if (!selected) {
            setStatus("failed");
            return;
        }
        let alive = true;
        const font = selected.font;
        const face = new FontFace(alias, `url(${JSON.stringify(`/api/brand-file/look/fonts/${encodeURIComponent(font.file)}`)})`, { weight: /^\d+(?: \d+)?$/.test(font.weight) ? font.weight : "400", style: font.style });
        face.load().then(loaded => { if (alive) {
            document.fonts.add(loaded);
            setStatus("loaded");
        } }).catch(() => alive && setStatus("failed"));
        return () => { alive = false; document.fonts.delete(face); };
    }, [alias, selected?.font.file]);
    return <div className="rounded-xl border bg-secondary/20 p-4"><p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{role} · {family} · {weight} · {style}</p>{status === "loaded" ? <p style={{ fontFamily: `'${alias}'`, fontWeight: weight, fontStyle: style, fontSynthesis: "none", letterSpacing: snapshot.tokens[`tracking-${role}`], textTransform: snapshot.tokens[`case-${role}`] as "uppercase" | "lowercase" | "none" }} className={role === "heading" ? "text-2xl leading-tight" : "text-sm leading-6"}>{role === "heading" ? "A page that feels like you." : "Your product, your voice, and a clear reason to choose it."}</p> : <p className="text-xs leading-5 text-muted-foreground">{status === "loading" ? "Loading the actual font file…" : "Font file unavailable for this role. Review Brand Brain typography."}</p>}<p className="mt-2 text-[10px] text-muted-foreground">{status === "loaded" ? `Loaded: ${selected?.font.file}` : "No fallback is presented as a brand-font specimen."}</p></div>;
}
