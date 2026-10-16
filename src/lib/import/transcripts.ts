export interface Turn {
    speaker: string;
    role: "agent" | "customer";
    text: string;
    start?: string;
}
const TS = String.raw `(\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?`;
const CUE_TIME = new RegExp(`^${TS}\\s*-->\\s*${TS}`);
const AGENT_HINT = /\b(agent|support|rep|team|care|cs|host|interviewer)\b|\(.+\)/i;
function splitSpeaker(line: string): {
    speaker: string | null;
    text: string;
} {
    const v = line.match(/^<v\s+([^>]+)>(.*)$/);
    if (v)
        return { speaker: v[1].trim(), text: v[2].replace(/<\/v>\s*$/, "").trim() };
    const m = line.match(/^([^:]{1,60}?):\s+(.*)$/);
    if (m && !/https?$/i.test(m[1]))
        return { speaker: m[1].trim(), text: m[2].trim() };
    return { speaker: null, text: line.trim() };
}
const AGENT_TALK = /thanks? (?:so much )?for (?:calling|hopping on|jumping on|joining|taking the time)|this is \w+ (?:from|at|with)|call is (?:being )?recorded|how can i help|pull(?:ing)? up (?:your|the) account|anything else i can help/gi;
export function assignRoles(turns: {
    speaker: string;
    text: string;
    start?: string;
}[], brandTerms: string[] = []): Turn[] {
    const isAgentLabel = (s: string) => /^agent\b/i.test(s) || AGENT_HINT.test(s) || brandTerms.some((b) => b && s.toLowerCase().includes(b.toLowerCase()));
    const isCustomerLabel = (s: string) => /^(customer|caller|client|prospect|interviewee)\b/i.test(s);
    const stats = new Map<string, {
        turns: number;
        agentTalk: number;
    }>();
    for (const t of turns) {
        const s = stats.get(t.speaker) ?? { turns: 0, agentTalk: 0 };
        s.turns++;
        s.agentTalk += (t.text.match(AGENT_TALK) ?? []).length;
        stats.set(t.speaker, s);
    }
    const candidates = [...stats.entries()].filter(([s]) => !isAgentLabel(s) && !isCustomerLabel(s));
    const labelledCustomer = [...stats.keys()].some(isCustomerLabel);
    const mainCustomer = labelledCustomer
        ? undefined
        : candidates.sort((a, b) => a[1].agentTalk - b[1].agentTalk || b[1].turns - a[1].turns)[0]?.[0];
    return turns.map((t) => ({
        ...t,
        role: isCustomerLabel(t.speaker) ? "customer" : isAgentLabel(t.speaker) ? "agent" : t.speaker === mainCustomer ? "customer" : "agent",
    }));
}
function mergeTurns(cues: {
    speaker: string;
    text: string;
    start?: string;
}[]) {
    const out: {
        speaker: string;
        text: string;
        start?: string;
    }[] = [];
    for (const c of cues) {
        if (!c.text)
            continue;
        const last = out[out.length - 1];
        if (last && last.speaker === c.speaker)
            last.text = `${last.text} ${c.text}`;
        else
            out.push({ ...c });
    }
    return out;
}
function parseCues(content: string): {
    speaker: string;
    text: string;
    start?: string;
}[] {
    const blocks = content.replace(/\r/g, "").replace(/^WEBVTT[^\n]*\n/, "").split(/\n{2,}/);
    const cues: {
        speaker: string;
        text: string;
        start?: string;
    }[] = [];
    let lastSpeaker = "Unknown";
    for (const block of blocks) {
        const lines = block.split("\n").filter((l) => l.trim() && !/^\d+$/.test(l.trim()) && !/^NOTE\b/.test(l));
        const timeIdx = lines.findIndex((l) => CUE_TIME.test(l.trim()));
        if (timeIdx === -1)
            continue;
        const start = lines[timeIdx].split("-->")[0].trim();
        for (const line of lines.slice(timeIdx + 1)) {
            const { speaker, text } = splitSpeaker(line);
            if (speaker)
                lastSpeaker = speaker;
            cues.push({ speaker: speaker ?? lastSpeaker, text, start });
        }
    }
    return mergeTurns(cues);
}
function parseTxt(content: string): {
    speaker: string;
    text: string;
    start?: string;
}[] {
    const cues: {
        speaker: string;
        text: string;
        start?: string;
    }[] = [];
    let lastSpeaker = "Unknown";
    for (const raw of content.replace(/\r/g, "").split("\n")) {
        let line = raw.trim();
        if (!line)
            continue;
        let start: string | undefined;
        const ts = line.match(/^\[?((?:\d{1,2}:)?\d{1,2}:\d{2})\]?\s*/);
        if (ts) {
            start = ts[1];
            line = line.slice(ts[0].length);
        }
        const { speaker, text } = splitSpeaker(line);
        if (speaker)
            lastSpeaker = speaker;
        cues.push({ speaker: speaker ?? lastSpeaker, text, start });
    }
    return mergeTurns(cues);
}
export interface ParsedCall {
    title?: string;
    date?: string;
    duration_sec?: number;
    customer_label?: string;
    persona_hint?: string | null;
    external_id?: string;
    turns: Turn[];
}
export function parseTranscriptFile(filename: string, content: string, brandTerms: string[] = []): ParsedCall[] {
    const ext = filename.toLowerCase().split(".").pop();
    if (ext === "json") {
        const data = JSON.parse(content);
        const calls = Array.isArray(data) ? data : [data];
        return calls.map((c) => ({
            title: c.title,
            date: c.date,
            duration_sec: c.duration_sec,
            customer_label: c.customer_label,
            persona_hint: c.persona_hint ?? null,
            external_id: c.id,
            turns: assignRoles((c.transcript ?? c.turns ?? []).map((t: {
                speaker: string;
                text: string;
            }) => ({ speaker: t.speaker, text: t.text })), brandTerms),
        }));
    }
    const cues = ext === "vtt" || ext === "srt" || /^WEBVTT/.test(content) ? parseCues(content) : parseTxt(content);
    if (!cues.length)
        throw new Error(`${filename}: no transcript lines found`);
    return [{ title: filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "), external_id: filename, turns: assignRoles(cues, brandTerms) }];
}
