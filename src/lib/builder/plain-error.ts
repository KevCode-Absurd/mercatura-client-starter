export interface PlainError {
    said: string;
    retry: boolean;
}
const RULES: {
    when: RegExp;
    said: string;
    retry: boolean;
}[] = [
    { when: /budget|spend(ing)? (cap|limit)|cap (is|was) (hit|reached)|LLM_BUDGET/i, said: "The spending limit was reached before this script was written. Raise the limit in Settings, then try again.", retry: true },
    { when: /live mode|mock mode|LLM_MODE|LlmDisabled|disabled/i, said: "Writing is not switched on for this account. It can be switched on in Settings.", retry: false },
    { when: /api key|unauthori[sz]ed|\b401\b|\b403\b|permission denied/i, said: "The writer could not be reached. Whoever set the app up needs to check its connection in Settings.", retry: false },
    { when: /rate limit|\b429\b|overloaded|\b529\b|\b503\b|\b502\b|temporarily unavailable/i, said: "The writer was too busy to answer. Try again in a minute.", retry: true },
    { when: /time(d)? ?out|ETIMEDOUT|ECONNRESET|ENOTFOUND|fetch failed|network|socket hang up|aborted/i, said: "The writer did not answer in time. Try again.", retry: true },
    { when: /closed while this was running|paused|stopped/i, said: "It was stopped before it finished. Try again to write it.", retry: true },
    { when: /refus/i, said: "The writer declined to write this one. Try again, or change the angle.", retry: true },
    { when: /concept .*not found|persona .*not found|no longer|not found/i, said: "Something this script was planned from (its persona, angle or offer) is no longer there. Plan it again from the lists above.", retry: false },
    { when: /JSON|schema|validation|invalid|parse|expected|zod/i, said: "The writer's answer came back in a shape the app could not read. Try again: a second go usually works.", retry: true },
];
export function plainError(raw: string | null | undefined): PlainError {
    const text = (raw ?? "").trim();
    const hit = RULES.find((r) => r.when.test(text));
    if (hit)
        return { said: hit.said, retry: hit.retry };
    return { said: "Something went wrong inside the app while this script was being written. Try again; if it fails a second time, it needs a fix on our side, not yours.", retry: true };
}
