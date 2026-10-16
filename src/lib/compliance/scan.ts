import path from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { ComplianceFinding, ComplianceVerdict } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { callStructured } from "../llm/gateway";
import { MODELS, modelInfo } from "../llm/models";
import { providerEnabled } from "../llm/providers";
import { modelOf } from "../llm/routing";
import { digestForScan, policies, policyIndex, type Policy } from "./policies";
export type Piece = {
    kind: "copy";
    text: string;
} | {
    kind: "script";
    title: string;
    lines: {
        beat?: string;
        text: string;
        on_screen?: string;
        visual_note?: string;
    }[];
} | {
    kind: "image";
    file: string;
    texts?: {
        role: string;
        text: string;
    }[];
} | {
    kind: "video";
    file: string;
    transcript?: string;
};
export interface ScanInput {
    brandId: string;
    piece: Piece;
    productId?: string | null;
    wroteWith?: string | null;
    refId?: string | null;
}
export interface Review {
    verdict: ComplianceVerdict;
    findings: ComplianceFinding[];
    passed: string[];
    model: string;
    costUsd: number;
    policiesReadAt: string;
    note: string;
}
export { SEVERITY_LABEL, VERDICT_LABEL } from "./labels";
const Finding = z.object({
    policy: z.string(),
    severity: z.enum(["reject", "restriction", "warning"]),
    where: z.string().default(""),
    problem: z.string(),
    fix: z.string().default(""),
});
const Answer = z.object({
    verdict: z.enum(["ready", "fix", "rejected"]),
    findings: z.array(Finding).max(30).default([]),
    passed: z.array(z.string()).max(60).default([]),
});
export function verdictFrom(findings: ComplianceFinding[], said: ComplianceVerdict): ComplianceVerdict {
    if (findings.some((f) => f.severity === "reject"))
        return "rejected";
    if (!findings.length)
        return "ready";
    if (findings.some((f) => f.severity === "restriction"))
        return said === "rejected" ? "rejected" : "fix";
    return said === "ready" ? "ready" : "fix";
}
function policyFor(id: string, list: Policy[]): Policy | undefined {
    const key = id.trim().toLowerCase();
    return list.find((p) => p.id === key) ?? list.find((p) => p.name.toLowerCase() === key) ?? list.find((p) => key.includes(p.id) || p.id.includes(key.replace(/\s+/g, "-")));
}
export function groundFindings(raw: z.infer<typeof Finding>[], list: Policy[] = policies()): ComplianceFinding[] {
    return raw.map((f) => {
        const p = policyFor(f.policy, list);
        return {
            policy: p?.id ?? f.policy.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 60),
            name: p?.name ?? f.policy.trim().slice(0, 80),
            url: p?.url ?? "https://transparency.meta.com/policies/ad-standards/",
            severity: f.severity,
            where: f.where.trim().slice(0, 400),
            problem: f.problem.trim().slice(0, 600),
            fix: (f.fix.trim() || p?.fix || "").slice(0, 600),
        };
    });
}
export function brandLines(brand: BrandBrain, productId?: string | null): string {
    const product = brand.products.find((p) => p.id === productId) ?? brand.products[0];
    const b = brand.brand;
    return [
        `Brand: ${b.name}. ${b.category}. ${b.one_liner}`,
        `Market: ${b.market}. Prices in ${b.currency}.`,
        product ? `Product in the ad: ${product.name}. What it is: ${product.format}.` : "Product: not known.",
        brand.guarantee?.text ? `Guarantee the brand gives: ${brand.guarantee.text}` : "",
        brand.forbidden_claims?.length ? `Claims the brand itself never makes: ${brand.forbidden_claims.slice(0, 8).join("; ")}.` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
export function pieceText(piece: Piece): string {
    if (piece.kind === "copy")
        return `Ad copy, as it would run (the primary text, the headline, the words on the picture, as given):\n"""\n${piece.text.trim()}\n"""`;
    if (piece.kind === "script")
        return `A video script, "${piece.title}". Each line: what is said; what is written on screen; what is shown.\n${piece.lines
            .map((l, i) => `${i + 1}. ${l.beat ? `[${l.beat}] ` : ""}said: "${l.text.trim()}"${l.on_screen ? ` | on screen: "${l.on_screen.trim()}"` : ""}${l.visual_note ? ` | shown: ${l.visual_note.trim()}` : ""}`)
            .join("\n")}`;
    if (piece.kind === "image")
        return `An image ad: Image 1 is the ad as it would run. Read every word on it letter by letter, then the picture as a whole.${piece.texts?.length ? `\nThe words planned for it: ${piece.texts.map((t) => `${t.role}: "${t.text}"`).join("; ")}.` : ""}`;
    return `A video ad, attached. Watch it whole: what is shown, what is written on screen, what is said and what is heard. Name the second of each finding.${piece.transcript ? `\nWhat is said, as written for it:\n"""\n${piece.transcript.trim()}\n"""` : ""}`;
}
export function pieceSummary(piece: Piece): string {
    const cut = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
    if (piece.kind === "copy")
        return cut(piece.text.replace(/\s+/g, " ").trim());
    if (piece.kind === "script")
        return cut(piece.title);
    return cut(path.basename(piece.file));
}
const SYSTEM = `You review 1 ad for an online shop against Meta's Advertising Standards, as a careful ad reviewer would before the ad is submitted. Below is the digest of the standards: each policy has an id, what it forbids or restricts, what to look for and the usual fix. Judge only against these policies, and only what the piece shows or says. Do not invent a rule the digest does not hold; do not judge taste, grammar, spelling or quality.

Return JSON:
- verdict: "ready" when nothing in the piece breaks or restricts under the digest; "fix" when something must change or a restriction (18+ targeting, a permission, a licence, a disclaimer) must be set before it runs; "rejected" when a policy marked prohibits is plainly breached, or a restricts policy's condition is broken by the creative itself (a cure claim for a listed disease, a pinched-fat close-up).
- findings: 1 for each thing found, most serious first; none when nothing is found. Each: policy (the digest id, exactly), severity ("reject": a prohibits policy breached, or a restriction broken in the creative; "restriction": the ad can run once a condition is set outside the creative, name it; "warning": close to a rule, a reviewer may read it either way), where (copy: the words, quoted exactly; image: the place, "the headline", "bottom left"; video: the second, "0:04", with what is seen or said), problem (1 or 2 plain sentences: what breaks which rule), fix (how to change the piece so it runs, in 1 or 2 sentences).
- passed: the ids of the policies that matter for this kind of piece and product, looked for and not found (health-wellness, prohibited-commercial-practices, privacy-violations-personal-attributes, profanity and the others that apply). A policy with a finding is not in passed.

Be exact and fair: a supplement, food or cosmetic ad is not restricted for being one, unless the digest restricts it; a "you" with no personal attribute is fine; a claim about the product is fine unless a policy forbids it. Targeting, permissions, licences and the landing page cannot be seen here: a finding that depends on them is "restriction" or "warning", never "reject", and names what to check.

=== The digest ===
`;
export function readerModel(wroteWith: string | null | undefined, kind: Piece["kind"]): {
    model: string;
    pin: boolean;
} {
    const routed = modelOf("compliance_scan", env.MODEL_REFERENCE);
    const writer = wroteWith ? modelInfo(wroteWith) : undefined;
    const reader = modelInfo(routed);
    if (!writer || !reader || writer.family !== reader.family)
        return { model: routed, pin: false };
    const other = MODELS.find((m) => m.vision && m.family !== writer.family && (kind === "video" ? m.provider === "gemini" : m.provider !== writer.provider) && providerEnabled(m.provider)) ?? MODELS.find((m) => m.vision && m.family !== writer.family && providerEnabled(m.provider));
    return other ? { model: other.id, pin: true } : { model: routed, pin: false };
}
const DISEASES = "diabetes|herpes|thyroid|psoriasis|ebola|cancer|autism|alzheimer'?s|parkinson'?s|als|hiv";
const RULES: {
    policy: string;
    severity: ComplianceFinding["severity"];
    find: RegExp;
    problem: string;
    fix: string;
}[] = [
    { policy: "health-wellness", severity: "reject", find: new RegExp(`\\b(cures?|heals?|eliminates?|reverses?)\\b[^.!?\\n]{0,40}\\b(${DISEASES})\\b`, "i"), problem: "A claim to cure, heal or eliminate a disease on Meta's list.", fix: "Say what the product does for the symptoms, never that it cures the disease." },
    { policy: "health-wellness", severity: "reject", find: /\b(lose|drop|shed)\b[^.!?\n]{0,30}\b\d+\s?(kg|kilos?|lbs?|pounds?|stone)\b[^.!?\n]{0,30}\b(in|within)\s+(a|one|\d+)\s*(day|days|week|weeks)\b/i, problem: "A promise of a specific weight result within a set time, with no qualifier.", fix: "Take the number and the timeframe out, or add a plain qualifier and say how long the result took." },
    { policy: "privacy-violations-personal-attributes", severity: "reject", find: new RegExp(`\\b(are you|do you have|do you suffer from|have you been diagnosed with|struggling with your|tired of your|are you (over|under)weight)\\b[^.!?\\n]{0,40}\\b(${DISEASES}|overweight|obese|fat|depress\\w*|anxi\\w*|acne|wrinkles?|bald\\w*|broke|bankrupt|in debt|single|lonely|gay|christian|muslim|jewish|pregnant|disabled)\\b`, "i"), problem: "A question that pins a personal attribute, a condition or a state on the viewer.", fix: "Describe the product and who it is for instead: \"A cream for acne-prone skin\", not \"Tired of your acne?\"." },
    { policy: "profanity", severity: "reject", find: /\b(fuck\w*|f\*+k\w*|f\*{2,}|shit\w*|\$hit|sh\*t|bitch\w*|asshole|wtf|stfu)\b/i, problem: "A swear word, written plainly or disguised.", fix: "Take the word out; a fully blurred word is the only form allowed." },
    { policy: "prohibited-commercial-practices", severity: "warning", find: /\bguaranteed?\b[^.!?\n]{0,30}\b(results?|returns?|to work|weight loss|cure)\b/i, problem: "A guarantee of a result: read as deceptive unless the brand really gives it as a refund.", fix: "Say the refund guarantee the brand gives in its own words, not that the product is guaranteed to work." },
    { policy: "misinformation", severity: "warning", find: /\b(miracle cure|cures? everything|doctors hate|big pharma)\b/i, problem: "Miracle-cure language that reads as health misinformation.", fix: "Drop the line; say what the product is and what it does, plainly." },
];
export function ruleFindings(text: string): ComplianceFinding[] {
    const list = policies();
    const out: ComplianceFinding[] = [];
    for (const r of RULES) {
        const m = text.match(r.find);
        if (!m)
            continue;
        const p = list.find((x) => x.id === r.policy);
        out.push({ policy: r.policy, name: p?.name ?? r.policy, url: p?.url ?? "https://transparency.meta.com/policies/ad-standards/", severity: r.severity, where: `"${m[0].trim().slice(0, 200)}"`, problem: r.problem, fix: r.fix });
    }
    return out;
}
const WORD_POLICIES = ["health-wellness", "prohibited-commercial-practices", "privacy-violations-personal-attributes", "profanity", "misinformation", "suicide-selfinjury-eating-disorders", "relevance"];
function wordsOf(piece: Piece): string {
    if (piece.kind === "copy")
        return piece.text;
    if (piece.kind === "script")
        return piece.lines.map((l) => [l.text, l.on_screen ?? ""].join("\n")).join("\n");
    if (piece.kind === "image")
        return (piece.texts ?? []).map((t) => t.text).join("\n");
    return piece.transcript ?? "";
}
export async function scanPiece(input: ScanInput): Promise<Review> {
    const readAt = policyIndex()?.read_at ?? "";
    const live = env.LLM_MODE === "live";
    const kind = input.piece.kind;
    if (!live) {
        const findings = ruleFindings(wordsOf(input.piece));
        const hit = new Set(findings.map((f) => f.policy));
        return {
            verdict: verdictFrom(findings, "ready"),
            findings,
            passed: WORD_POLICIES.filter((p) => !hit.has(p)),
            model: "",
            costUsd: 0,
            policiesReadAt: readAt,
            note: kind === "copy" || kind === "script" ? "Read by the app's own rules on the words: no model is switched on." : "Only the words were read, by the app's own rules: no model is switched on, so the picture was not looked at.",
        };
    }
    const brand = loadBrandBrain(input.brandId);
    const { model, pin } = readerModel(input.wroteWith, kind);
    const req = {
        brandId: input.brandId,
        task: "compliance_scan",
        model,
        pin,
        system: SYSTEM + digestForScan(),
        user: `${brandLines(brand, input.productId)}\n\n=== PER CALL ===\n\n${pieceText(input.piece)}`,
        schema: Answer,
        effort: "medium" as const,
        maxTokens: 6000,
        refType: "compliance",
        refId: input.refId ?? undefined,
        ...(kind === "image" ? { images: [input.piece.file] } : {}),
        ...(kind === "video" ? { video: input.piece.file } : {}),
    };
    const res = await callStructured(req);
    const findings = groundFindings(res.data.findings);
    const list = policies();
    const hit = new Set(findings.map((f) => f.policy));
    const passed = [...new Set(res.data.passed.map((id) => policyFor(id, list)?.id).filter((x): x is string => !!x && !hit.has(x)))];
    const used = db.select({ model: schema.llmCalls.model }).from(schema.llmCalls).where(eq(schema.llmCalls.id, res.callId)).get()?.model ?? model;
    return {
        verdict: verdictFrom(findings, res.data.verdict),
        findings,
        passed,
        model: used,
        costUsd: res.costUsd,
        policiesReadAt: readAt,
        note: "",
    };
}
