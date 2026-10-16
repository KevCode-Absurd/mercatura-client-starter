const OFF = "This is not switched on for this account. It can be switched on in Settings.";
const INSIDE = "Something went wrong inside the app. Try again; if it happens a second time, it needs a fix on our side, not yours.";
const RULES: {
    when: RegExp;
    said: string;
}[] = [
    { when: /spend cap reached|spending (cap|limit)|LLM_BUDGET|image cap|MEDIA_IMAGE_CAP|video budget/i, said: "The spending limit was reached. Raise it in Settings to continue." },
    { when: /LLM_MODE|\b(live|mock) mode\b|_API_KEY\b|\bin \.env\b|\.env\b|STORAGE_(ENDPOINT|BUCKET)|MODEL_[A-Z]+=|LlmDisabled/i, said: OFF },
    { when: /key was rejected|unauthori[sz]ed|\bHTTP 40[13]\b|permission denied/i, said: "A service the app uses refused the request. Whoever set the app up needs to check its connection in Settings." },
    { when: /rate limit|\b(HTTP )?429\b|overloaded|temporarily unavailable|not enough provider credits/i, said: "A service the app uses was too busy to answer. Try again in a minute." },
    { when: /^(Gemini|OpenAI|DeepSeek|Anthropic|Claude|Seedance|Higgsfield)\b[^.]*\b\d{3}\b|\bHTTP 5\d\d\b|did not return|failed after \d+ attempts|LLM call failed|failed: no answer|could not process the video/i, said: "The service that does this did not answer. Try again in a minute." },
    { when: /time(d)? ?out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|fetch failed|socket hang up/i, said: "The app could not reach a service it uses. Check the connection and try again." },
    { when: /Refusing to send unredacted/i, said: "This text still has contact details in it (an email address or a phone number), so it was not sent. Take them out and try again." },
    { when: /failed validation|ZodError|invalid_type|Unexpected token|is not valid JSON|not a valid \w+ file|can't be read: [\w.[\]]+ /i, said: "Something the app read came back in a shape it could not use. Try again." },
    { when: /brand\.json|lessons\.json|SKILL\.md|sample-data|\bbrands\/|\bskills\/|No folder under|[A-Za-z]:\\\S+|\/(home|Users)\/\S+/, said: "A part of this brand's setup is missing or could not be opened. Open the Brand brain and check it is complete." },
    { when: /Playwright|\bpnpm \w|ffmpeg|\bE(NOENT|PERM|BUSY|ACCES)\b|argument must be of type|Cannot read propert|is not a function|is not defined|SQLITE|node_modules|^Prompt \w+ needs /, said: INSIDE },
];
export function plainMessage(raw: string | null | undefined): string {
    const text = (raw ?? "").trim();
    if (!text)
        return INSIDE;
    return RULES.find((r) => r.when.test(text))?.said ?? text;
}
export const errorText = (e: unknown): string => plainMessage(e instanceof Error ? e.message : typeof e === "string" ? e : "");
