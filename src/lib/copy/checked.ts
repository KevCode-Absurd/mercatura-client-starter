import { brandOwnWords } from "../brand-voice";
import { loadBrandBrain } from "../brands";
import { countedOf } from "./figures";
import { llmEnabled } from "../llm/gateway";
import { RunStoppedError } from "../llm/run-control";
import { getSetting } from "../settings";
import { checkWords, type WordsRequest, type WordsResult } from "./words-read";
export type WordsAsk = Omit<WordsRequest, "voice" | "own"> & Partial<Pick<WordsRequest, "voice" | "own">>;
export interface WordsChecked extends WordsResult {
    failed?: string;
}
function countedFor(brandId: string): WordsRequest["counted"] {
    try {
        return countedOf(loadBrandBrain(brandId));
    }
    catch {
        return undefined;
    }
}
export async function checkWordsQuietly(ask: WordsAsk, o: {
    read?: boolean;
    fix?: boolean;
    rounds?: number;
} = {}): Promise<WordsChecked> {
    const asWritten = (): WordsResult => ({ lines: ask.lines.map((l) => ({ ...l })), changed: [], refused: [], left: [], found: [] });
    if (!ask.lines.some((l) => l.text.trim()))
        return asWritten();
    try {
        const req: WordsRequest = { ...ask, voice: ask.voice ?? getSetting(ask.brandId, "voice"), own: ask.own ?? brandOwnWords(ask.brandId), counted: ask.counted ?? countedFor(ask.brandId) };
        return await checkWords(req, llmEnabled() ? o : { ...o, read: false, fix: false });
    }
    catch (e) {
        if (e instanceof RunStoppedError)
            throw e;
        return { ...asWritten(), failed: String((e as Error)?.message ?? e).slice(0, 120) };
    }
}
