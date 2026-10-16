import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import type { StudioItem, StudioOutput, StudioRunRow, StudioVariant } from "@/db/schema";
import { env } from "../env";
import { zip, type ZipEntry } from "../zip";
import { currentOutputs } from "./outputs";
import { deliveryFile } from "../production/delivery";
const latest = (outputs: StudioOutput[]) => currentOutputs(outputs);
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "image";
const numberOf = (it: StudioItem, i: number) => String(it.slot ?? i + 1).padStart(2, "0");
export const exportName = (it: StudioItem, i: number, o: StudioOutput) => `${numberOf(it, i)}-${slug(it.plan?.title || it.label)}-${o.aspect.replace(":", "x")}${path.extname(o.path) || ".png"}`;
export const variantName = (it: StudioItem, i: number, v: StudioVariant) => `${numberOf(it, i)}-${slug(it.plan?.title || it.label)}-${v.aspect.replace(":", "x")}-variant-${v.id.replace(/^v/, "")}.png`;
function variantEntries(it: StudioItem, i: number, only?: Set<string>): ZipEntry[] {
    return (it.variants ?? [])
        .filter((v) => v.path && (!only || only.has(v.id)))
        .map((v) => ({ v, abs: path.join(env.DATA_DIR, "assets", v.path!) }))
        .filter(({ abs }) => fs.existsSync(abs))
        .map(({ v, abs }) => ({ name: variantName(it, i, v), data: fs.readFileSync(abs) }));
}
export function variantsZip(run: StudioRunRow, itemId: string, ids?: string[]): {
    zip: Buffer;
    images: number;
} {
    const i = run.items.findIndex((x) => x.id === itemId);
    const entries = i < 0 ? [] : variantEntries(run.items[i], i, ids?.length ? new Set(ids) : undefined);
    return { zip: zip(entries), images: entries.length };
}
export interface CopyRow {
    set: string;
    ad: string;
    format: string;
    title: string;
    buyer: string;
    stage: string;
    argument: string;
    on_image_text: string;
    primary_text: string;
    headline: string;
    description: string;
    button: string;
    image_files: string;
}
export function copyRows(run: StudioRunRow): CopyRow[] {
    return run.items
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => !!it.plan)
        .map(({ it, i }) => {
        const p = it.plan!;
        return {
            set: run.id,
            ad: numberOf(it, i),
            format: it.label,
            title: p.title,
            buyer: p.buyer ?? "",
            stage: (p.awareness ?? "").replace(/_/g, " "),
            argument: p.argument,
            on_image_text: p.text_elements.map((t) => `${t.role}: ${t.text}`).join("\n"),
            primary_text: p.ad_copy?.primary_text ?? "",
            headline: p.ad_copy?.headline ?? "",
            description: p.ad_copy?.description ?? "",
            button: p.ad_copy?.cta ?? "",
            image_files: latest(it.outputs).map((o) => exportName(it, i, o)).join(", "),
        };
    });
}
const HEAD: Record<keyof CopyRow, string> = { set: "Set", ad: "Ad", format: "Format", title: "Title", buyer: "Buyer", stage: "Stage", argument: "Argument", on_image_text: "Words on the image", primary_text: "Primary text", headline: "Headline", description: "Description", button: "Button", image_files: "Image files" };
const BOM = String.fromCharCode(0xfeff);
export function copyCsv(runs: StudioRunRow[]): string {
    const rows = runs.flatMap(copyRows);
    const keys = Object.keys(HEAD) as (keyof CopyRow)[];
    return `${BOM}${Papa.unparse({ fields: keys.map((k) => HEAD[k]), data: rows.map((r) => keys.map((k) => r[k])) })}\n`;
}
export function exportZip(runs: StudioRunRow[]): {
    zip: Buffer;
    images: number;
} {
    const entries: ZipEntry[] = [];
    for (const run of runs) {
        run.items.forEach((it, i) => {
            for (const o of latest(it.outputs)) {
                const abs = path.join(env.DATA_DIR, "assets", o.path);
                if (!fs.existsSync(abs))
                    continue;
                entries.push({ name: exportName(it, i, o), data: fs.readFileSync(abs) });
                const base = o.base_path ? path.join(env.DATA_DIR, "assets", o.base_path) : "";
                if (base && fs.existsSync(base))
                    entries.push({ name: exportName(it, i, o).replace(/(.[a-z]+)$/i, "_no-words$1"), data: fs.readFileSync(base) });
            }
            entries.push(...variantEntries(it, i));
        });
    }
    const images = entries.length;
    entries.push({ name: "ad-copy.csv", data: Buffer.from(copyCsv(runs), "utf-8") });
    return { zip: zip(entries), images };
}
export function selectedCreativeZip(run: StudioRunRow, itemId: string, root = path.join(env.DATA_DIR, "assets")): {
    zip: Buffer;
    images: number;
} {
    const index = run.items.findIndex((item) => item.id === itemId);
    if (index < 0)
        throw new Error("This creative is not in the selected set.");
    const item = run.items[index];
    const entries: ZipEntry[] = [];
    const missing: string[] = [];
    const included: string[] = [];
    let bytes = 0;
    const add = (file: string, name: string) => {
        const abs = deliveryFile(root, file);
        if (!abs) {
            missing.push(name);
            return;
        }
        bytes += fs.statSync(abs).size;
        if (bytes > 512 * 1024 * 1024)
            throw new Error("This creative package is over 512 MB. Download its images separately.");
        entries.push({ name, data: fs.readFileSync(abs) });
        included.push(name);
    };
    const outputs = latest(item.outputs);
    for (const output of outputs) {
        const name = exportName(item, index, output);
        add(output.path, `images/${name}`);
        if (output.base_path)
            add(output.base_path, `images/${name.replace(/\.[a-z0-9]+$/i, "")}-no-words${path.extname(output.base_path) || ".png"}`);
    }
    const images = entries.length;
    for (const output of outputs) {
        const repair = output.repair;
        if (!repair)
            continue;
        const prefix = `editable/${exportName(item, index, output).replace(/\.[a-z0-9]+$/i, "")}`;
        if (repair.editable_svg_path)
            add(repair.editable_svg_path, `${prefix}-layers.svg`);
        if (repair.editable_layers_path)
            add(repair.editable_layers_path, `${prefix}-layers.json`);
        if (repair.editable_base_path)
            add(repair.editable_base_path, `${prefix}-source${path.extname(repair.editable_base_path) || ".png"}`);
        add(repair.approval_path, `${prefix}-approval.json`);
    }
    const copy = copyRows(run).find((row) => row.ad === numberOf(item, index));
    if (copy)
        entries.push({ name: "copy/ad-copy.json", data: Buffer.from(JSON.stringify(copy, null, 2)) });
    entries.push({ name: "copy/rendered-on-image-text.json", data: Buffer.from(JSON.stringify(outputs.map((o) => ({ aspect: o.aspect, version: o.version, text: o.texts ?? null, copy_status: o.copy_status ?? "not_checked", copy_content_hash: o.copy_content_hash ?? null, repair: o.repair ?? null, note: o.texts ? "Saved with this render" : "No render text snapshot exists; check the image against the current plan." })), null, 2)) });
    if (item.plan)
        entries.push({ name: "plan/editable-image-plan.json", data: Buffer.from(JSON.stringify(item.plan, null, 2)) });
    entries.push({ name: "manifest.json", data: Buffer.from(JSON.stringify({ sourceId: `studio:${run.id}:${item.id}`, brandId: run.brand_id, productId: run.product_id, included, missing, selected: outputs.map((o) => ({ path: o.path, aspect: o.aspect, version: o.version, qa: o.qa?.status ?? "not_checked", copy_status: o.copy_status ?? "not_checked", copy_content_hash: o.copy_content_hash ?? null, repair: o.repair ?? null })), complete_copy_review: item.copy_review ?? null, review: "Copy approval applies to its recorded content and evidence hashes. Editable repair sources may contain the original painted words under the SVG; they are not words-free bases. Editable drafts and unverified copy remain review candidates; compare the current copy with each selected image and check actual legibility before publishing. No missing asset has been replaced." }, null, 2)) });
    return { zip: zip(entries), images };
}
