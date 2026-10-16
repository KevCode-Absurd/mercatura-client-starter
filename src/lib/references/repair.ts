import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { importedAnalysis, readReferenceAnalysis, type ReferenceAnalysis } from "./analysis";
export async function fileHash(file: string): Promise<string> {
    const hash = createHash("sha256");
    for await (const chunk of fs.createReadStream(file))
        hash.update(chunk);
    return hash.digest("hex");
}
export async function libraryHashIndex(root: string, rows: {
    id: string;
    file: string;
}[]): Promise<{
    hashes: Map<string, string>;
    missing: number;
}> {
    const hashes = new Map<string, string>();
    const files = new Map<string, string>();
    let missing = 0;
    for (const row of [...rows].sort((a, b) => a.id.localeCompare(b.id))) {
        const file = path.resolve(root, row.file);
        if (!fs.existsSync(file)) {
            missing++;
            continue;
        }
        const hash = files.get(file) ?? await fileHash(file);
        files.set(file, hash);
        if (!hashes.has(hash))
            hashes.set(hash, row.id);
    }
    return { hashes, missing };
}
export function repairAnalysis(current: ReferenceAnalysis | null, source?: {
    analysis?: unknown;
    native?: unknown;
}, libraryId?: string): ReferenceAnalysis {
    const read = readReferenceAnalysis(current);
    const recovered = importedAnalysis(source?.analysis, source?.native);
    return { ...current,
        ...(!read.transcript_segments?.length && recovered.transcript_segments?.length ? { transcript_segments: recovered.transcript_segments } : {}),
        ...(!read.transcript && recovered.transcript ? { transcript: recovered.transcript } : {}),
        ...(libraryId ? { library_ref_id: libraryId } : {}),
    };
}
export const phantomReferences = (script: {
    axes: {
        flow?: boolean;
    };
    reference_mode: string | null;
    reference_ids: string[];
}) => script.axes.flow === true && !script.reference_mode && script.reference_ids.length > 0;
