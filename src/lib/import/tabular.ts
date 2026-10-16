import Papa from "papaparse";
import type { SegmentInput } from "../segments";
import type { CustomerSource } from "../taxonomy";
export type Row = Record<string, unknown>;
export interface TargetField {
    key: string;
    label: string;
    required?: boolean;
    multi?: boolean;
    pii?: boolean;
    guess: RegExp;
}
export const TARGET_FIELDS: Record<Exclude<CustomerSource, "call">, TargetField[]> = {
    ticket: [
        { key: "id", label: "Ticket id", guess: /^(ticket_?)?id$|ticket/i },
        { key: "date", label: "Date", guess: /date|created|time/i },
        { key: "subject", label: "Subject", guess: /subject|title/i },
        { key: "message", label: "Customer message", guess: /^(message|body|text|description|customer_message|first_message)$/i },
        { key: "thread", label: "Message thread (list of {from, text})", guess: /^(messages|thread|conversation)$/i },
        { key: "agent_reply", label: "Agent reply", guess: /agent|reply|response/i },
        { key: "followup", label: "Customer follow-up", guess: /follow/i },
        { key: "channel", label: "Channel", guess: /channel|source/i },
        { key: "tags", label: "Tags", guess: /tag/i },
        { key: "status", label: "Status", guess: /status/i },
        { key: "return_reason", label: "Return reason", guess: /return|reason/i },
        { key: "pii", label: "Contact columns (dropped)", multi: true, pii: true, guess: /name|email|phone|order/i },
    ],
    review: [
        { key: "id", label: "Review id", guess: /^(review_?)?id$/i },
        { key: "date", label: "Date", guess: /date|created/i },
        { key: "rating", label: "Rating", required: true, guess: /rating|stars|score/i },
        { key: "title", label: "Title", guess: /title|headline|subject/i },
        { key: "body", label: "Review text", required: true, guess: /^(body|review|text|content|comment)$/i },
        { key: "product", label: "Product", guess: /product|sku|item/i },
        { key: "verified", label: "Verified", guess: /verified/i },
        { key: "incentivised", label: "Incentivised (free product, paid, gifted)", guess: /incentiv|free_?product|gifted|sample|sweepstake/i },
        { key: "helpful", label: "Helpful votes", guess: /helpful|votes|upvote/i },
        { key: "source", label: "Site", guess: /^(source|site|platform|channel)$/i },
        { key: "pii", label: "Contact columns (dropped)", multi: true, pii: true, guess: /name|author|email|reviewer/i },
    ],
    survey: [
        { key: "id", label: "Response id", guess: /^(response_?)?id$/i },
        { key: "date", label: "Date", guess: /date|submitted|created/i },
        { key: "free_text", label: "Free-text answers", required: true, multi: true, guess: /what|why|anything|else|comment|reason_text|nearly|happened/i },
        { key: "choice", label: "Multiple-choice answers", multi: true, guess: /how_did|hear|main_reason|channel|choice/i },
        { key: "pii", label: "Contact columns (dropped)", multi: true, pii: true, guess: /email|order|name|phone/i },
    ],
    community: [
        { key: "id", label: "Post id", guess: /^id$/i },
        { key: "date", label: "Date", guess: /date|created/i },
        { key: "platform", label: "Platform", guess: /platform|site/i },
        { key: "community", label: "Community", guess: /community|subreddit|group|forum/i },
        { key: "url", label: "Link", guess: /url|link/i },
        { key: "title", label: "Title", guess: /title/i },
        { key: "body", label: "Post text", required: true, guess: /^(body|text|content|post)$/i },
        { key: "comments", label: "Comments (list)", guess: /comments|replies/i },
        { key: "pii", label: "Contact columns (dropped)", multi: true, pii: true, guess: /author|user|name|email/i },
    ],
};
export type Mapping = Record<string, string>;
export function parseRows(filename: string, content: string): {
    rows: Row[];
    columns: string[];
} {
    if (filename.toLowerCase().endsWith(".json") || /^\s*[[{]/.test(content)) {
        const data = JSON.parse(content);
        const rows: Row[] = Array.isArray(data) ? data : (data.items ?? data.rows ?? data.data ?? [data]);
        const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
        return { rows, columns };
    }
    const res = Papa.parse<Row>(content.replace(/^﻿/, ""), { header: true, skipEmptyLines: true });
    if (res.errors.length && !res.data.length)
        throw new Error(`${filename}: ${res.errors[0].message}`);
    return { rows: res.data, columns: res.meta.fields ?? [] };
}
export function guessMapping(type: Exclude<CustomerSource, "call">, columns: string[]): Mapping {
    const used = new Set<string>();
    const mapping: Mapping = {};
    for (const f of TARGET_FIELDS[type]) {
        if (f.multi) {
            const hits = columns.filter((c) => !used.has(c) && f.guess.test(c));
            hits.forEach((c) => used.add(c));
            if (hits.length)
                mapping[f.key] = hits.join(",");
        }
        else {
            const hit = columns.find((c) => !used.has(c) && f.guess.test(c));
            if (hit) {
                used.add(hit);
                mapping[f.key] = hit;
            }
        }
    }
    return mapping;
}
export function missingRequired(type: Exclude<CustomerSource, "call">, mapping: Mapping): string[] {
    const missing = TARGET_FIELDS[type].filter((f) => f.required && !mapping[f.key]).map((f) => f.label);
    if (type === "ticket" && !mapping.message && !mapping.thread)
        missing.push("Customer message or Message thread");
    return missing;
}
export interface ImportRecord {
    external_id: string | null;
    date: string | null;
    title: string | null;
    parts: SegmentInput[];
    meta: Record<string, unknown>;
    persona_hint?: string | null;
}
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v)).trim();
const cols = (m: Mapping, key: string) => (m[key] ? m[key].split(",").filter(Boolean) : []);
const humanCol = (c: string) => c.replace(/^q\d+_/, "").replace(/_/g, " ").replace(/^\w/, (x) => x.toUpperCase());
const isoDate = (v: unknown) => {
    const s = str(v);
    if (!s)
        return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s.slice(0, 10) : d.toISOString().slice(0, 10);
};
export function rowsToRecords(type: Exclude<CustomerSource, "call">, rows: Row[], m: Mapping): ImportRecord[] {
    const get = (r: Row, key: string) => (m[key] ? str(r[m[key]]) : "");
    const out: ImportRecord[] = [];
    for (const r of rows) {
        if (type === "ticket") {
            const thread = m.thread && Array.isArray(r[m.thread]) ? (r[m.thread] as Row[]) : null;
            const parts: SegmentInput[] = thread
                ? thread.map((msg) => {
                    const agent = /agent|support|staff|brand/i.test(str(msg.from ?? msg.author ?? msg.role));
                    return { label: agent ? "Agent" : "Customer", role: agent ? ("agent" as const) : ("customer" as const), text: str(msg.text ?? msg.body ?? msg.message) };
                })
                : [
                    { label: "Customer", role: "customer", text: get(r, "message") },
                    { label: "Agent", role: "agent", text: get(r, "agent_reply") },
                    { label: "Customer", role: "customer", text: get(r, "followup") },
                ];
            if (!parts.some((p) => p.role === "customer" && p.text))
                continue;
            out.push({
                external_id: get(r, "id") || null,
                date: isoDate(get(r, "date")),
                title: get(r, "subject") || null,
                parts,
                meta: {
                    subject: get(r, "subject") || null,
                    channel: get(r, "channel") || null,
                    tags: get(r, "tags") ? get(r, "tags").split(/[;,|]/).map((t) => t.trim()).filter(Boolean) : [],
                    status: get(r, "status") || null,
                    return_reason: get(r, "return_reason") || null,
                },
            });
        }
        else if (type === "review") {
            const body = get(r, "body");
            const rating = Number(get(r, "rating"));
            if (!body || !Number.isFinite(rating))
                continue;
            out.push({
                external_id: get(r, "id") || null,
                date: isoDate(get(r, "date")),
                title: get(r, "title") || null,
                parts: [
                    { label: "Title", role: "customer", text: get(r, "title") },
                    { label: "Review", role: "customer", text: body },
                ],
                meta: {
                    rating: Math.round(rating),
                    verified: /^(true|yes|1|y)$/i.test(get(r, "verified")),
                    incentivised: /^(true|yes|1|y|incentivi[sz]ed|free|gifted|paid)$/i.test(get(r, "incentivised")),
                    helpful: Number.isFinite(Number(get(r, "helpful"))) && get(r, "helpful") !== "" ? Math.round(Number(get(r, "helpful"))) : null,
                    product: get(r, "product") || null,
                    site: get(r, "source") || null,
                },
            });
        }
        else if (type === "survey") {
            const free = cols(m, "free_text").map((c) => ({ question: humanCol(c), value: str(r[c]) || null, free_text: true }));
            const choice = cols(m, "choice").map((c) => ({ question: humanCol(c), value: str(r[c]) || null, free_text: false }));
            const answers = [...choice, ...free];
            const parts = free.filter((a) => a.value).map((a) => ({ label: a.question, role: "customer" as const, text: a.value! }));
            if (!parts.length)
                continue;
            out.push({ external_id: get(r, "id") || null, date: isoDate(get(r, "date")), title: parts[0].text.slice(0, 80), parts, meta: { answers } });
        }
        else {
            const rawComments = m.comments ? r[m.comments] : [];
            const comments = (Array.isArray(rawComments) ? rawComments : [])
                .map((c) => (typeof c === "string" ? { text: c, upvotes: 0 } : { text: str((c as Row).text ?? (c as Row).body), upvotes: Number((c as Row).upvotes ?? (c as Row).score ?? 0) }))
                .filter((c) => c.text)
                .sort((a, b) => b.upvotes - a.upvotes);
            const body = get(r, "body");
            if (!body)
                continue;
            out.push({
                external_id: get(r, "id") || null,
                date: isoDate(get(r, "date")),
                title: get(r, "title") || null,
                parts: [
                    { label: "Post title", role: "customer", text: get(r, "title") },
                    { label: "Post", role: "customer", text: body },
                    ...comments.map((c) => ({ label: `Comment · ${c.upvotes} upvotes`, role: "customer" as const, text: c.text })),
                ],
                meta: { platform: get(r, "platform") || null, community: get(r, "community") || null, url: get(r, "url") || null, comments: comments.map((c) => ({ upvotes: c.upvotes })) },
            });
        }
    }
    return out;
}
