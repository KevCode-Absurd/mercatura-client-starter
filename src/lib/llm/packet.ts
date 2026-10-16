import type { Provider } from "./models";
import type { Effort } from "./steps";
export interface ResultBudget {
    profile: "static-plan" | "static-words" | "static-prompt" | "static-feed" | "storyboard" | "avatar" | "character-sheet" | "verdict";
    items: number;
    textTokens?: number;
    verbatim?: readonly string[];
}
const PER_ITEM: Record<ResultBudget["profile"], number> = {
    "static-plan": 1800,
    "static-words": 1000,
    "static-prompt": 1300,
    "static-feed": 700,
    storyboard: 1900,
    avatar: 2300,
    "character-sheet": 650,
    verdict: 700,
};
function positiveInteger(n: number, label: string, zero = false): number {
    if (!Number.isSafeInteger(n) || n < (zero ? 0 : 1))
        throw new Error(`${label} must be a ${zero ? "nonnegative" : "positive"} safe integer.`);
    return n;
}
export function verbatimAllowance(text: readonly string[] = []): number {
    return Buffer.byteLength(JSON.stringify(text), "utf8");
}
export function answerRoom(budget: ResultBudget | undefined, fallback = 16000, locked = false): number {
    positiveInteger(fallback, "Answer room");
    if (!budget || locked)
        return fallback;
    const items = positiveInteger(budget.items, "Requested item count");
    const prose = positiveInteger(budget.textTokens ?? 0, "Prose allowance", true);
    const perItem = PER_ITEM[budget.profile];
    if (!perItem)
        throw new Error(`Unknown result profile: ${budget.profile}`);
    const room = 768 + items * perItem + prose + verbatimAllowance(budget.verbatim);
    return positiveInteger(room, "Result allowance");
}
export interface ProviderHeadroom {
    effort?: Effort;
    resultBudget?: boolean;
    locked?: boolean;
    lengthRetry?: boolean;
}
const DEEPSEEK_HIGH_RESERVE = 48000;
const DEEPSEEK_LOW_RESERVE = 24000;
const DEEPSEEK_LIMIT = 64000;
export function providerRoom(provider: Provider, model: string, answer: number, headroom: ProviderHeadroom = {}): number {
    positiveInteger(answer, "Answer room");
    if (provider === "claude" && /^claude-haiku-4/.test(model))
        return answer;
    const multiple = provider === "gemini" ? 3 : provider === "deepseek" ? 4 : 2;
    const legacy = Math.min(answer * multiple, provider === "gemini" ? 65536 : 64000);
    if (provider !== "deepseek" || !headroom.resultBudget || headroom.locked)
        return legacy;
    if (headroom.lengthRetry)
        return DEEPSEEK_LIMIT;
    if (headroom.effort === "low")
        return Math.min(Math.max(legacy, answer + DEEPSEEK_LOW_RESERVE), DEEPSEEK_LIMIT);
    return Math.min(Math.max(legacy, answer + DEEPSEEK_HIGH_RESERVE), DEEPSEEK_LIMIT);
}
export interface PacketRecord<T> {
    id: string;
    value: T;
    requires?: readonly string[];
}
export function completePacket<T>(records: readonly PacketRecord<T>[], required: readonly string[], optional: readonly string[] = [], optionalLimit = 0): PacketRecord<T>[] {
    positiveInteger(optionalLimit, "Optional record limit", true);
    const byId = new Map<string, PacketRecord<T>>();
    for (const record of records) {
        const prior = byId.get(record.id);
        if (prior && JSON.stringify(prior) !== JSON.stringify(record))
            throw new Error(`Conflicting packet record: ${record.id}`);
        byId.set(record.id, record);
    }
    const selected = new Set<string>();
    const add = (id: string) => {
        if (selected.has(id))
            return;
        const record = byId.get(id);
        if (!record)
            throw new Error(`Missing required packet record: ${id}`);
        selected.add(id);
        for (const dependency of record.requires ?? [])
            add(dependency);
    };
    for (const id of required)
        add(id);
    let added = 0;
    for (const id of optional) {
        if (added >= optionalLimit)
            break;
        if (selected.has(id) || !byId.has(id))
            continue;
        add(id);
        added++;
    }
    return [...byId.values()].filter((record) => selected.has(record.id));
}
