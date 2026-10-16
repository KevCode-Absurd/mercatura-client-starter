import { zip, type ZipEntry } from "../zip";
import { pageFingerprint, seoHandoff } from "./quality";
import { qualityExportHtml } from "./quality-browser";
import { exportCroShopify } from "./studio-export";
import { exportDigest } from "./export-quality";
import { landingImageHolds } from "./image-claims";
import type { QualityDocument } from "./quality-types";
const entry = (name: string, value: unknown): ZipEntry => ({ name, data: Buffer.from(typeof value === "string" ? value : JSON.stringify(value, null, 2)) });
export function reviewedExportPackage(doc: QualityDocument) {
    const passive = qualityExportHtml(doc), holds = [...landingImageHolds(doc), ...(doc.sourceReview?.needsReview ? ["Underlying factual sources changed; review the affected wording."] : [])];
    const candidate = doc.source.kind !== "html" ? qualityExportHtml(doc, "functional") : null;
    const checks = (doc.exportChecks ?? []).filter(check => check.packageSha256 === (check.mode === "passive" ? exportDigest(passive) : candidate ? exportDigest(candidate) : ""));
    for (const check of checks.filter(check => check.mode === "functional"))
        for (const finding of check.findings)
            if (["name", "selector-name", "selector-state", "gallery-state", "gallery-alt", "image-alt", "keyboard", "heading-order", "focus"].includes(finding.kind))
                holds.push(`Final functional export ${check.viewport}px ${finding.sectionId}: ${finding.detail}`);
    const canFunction = !!candidate && !holds.length, functional = canFunction ? candidate : null;
    const entries: ZipEntry[] = [entry("passive.html", passive), entry("seo-handoff.json", seoHandoff(doc))];
    if (functional)
        entries.push(entry("functional.html", functional));
    if (doc.run && canFunction)
        entries.push({ name: "shopify-theme.zip", data: exportCroShopify(doc.run) });
    const files = entries.map(item => ({ name: item.name, sha256: exportDigest(item.data), bytes: item.data.length }));
    const manifest = { schema: "landing-reviewed-package/1", pageId: doc.id, revision: doc.revision, pageFingerprint: pageFingerprint(doc), source: doc.source, evidenceFingerprint: doc.evidence?.fingerprint ?? null, files, capabilities: { passive: { scriptedInteraction: false, nativeDisclosure: true }, functional: { included: !!functional, knownFirstPartyOnly: true, externalCheckoutVerified: false }, theme: { included: !!doc.run && canFunction, destinationRuntimeVerified: false } }, holds, accessibility: { checkedPackages: checks.map(check => ({ mode: check.mode, viewport: check.viewport, sha256: check.packageSha256, findings: check.findings })), unverified: files.filter(file => file.name.endsWith(".html") && !checks.some(check => check.packageSha256 === file.sha256)).map(file => file.name) }, limits: ["Preview navigation checks cannot verify a remote checkout.", "Theme Liquid needs the actual destination runtime, product data, subscription app and theme checks."] };
    const receipt = { schema: "landing-export-receipt/1", createdAt: new Date().toISOString(), manifestSha256: exportDigest(JSON.stringify(manifest, null, 2)), pageId: doc.id, revision: doc.revision, packageFiles: files, imageReviews: doc.imageClaims ?? [], accessibility: checks };
    entries.push(entry("manifest.json", manifest), entry("receipt.json", receipt), entry("READ-ME.txt", "passive.html is an offline audit view. functional.html retains app-owned interactions when included; it is held when image/source facts are unresolved. shopify-theme.zip requires an unpublished destination-theme check. Review manifest.json for exact byte identities, capabilities and unresolved checks. No external checkout was tested."));
    return { manifest, receipt, entries, buffer: zip(entries), passive, functional };
}
