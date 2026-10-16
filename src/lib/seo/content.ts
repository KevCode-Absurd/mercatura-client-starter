import { buildDemoSnapshot, productSearchType, type SeoContext, type SeoFinding, type SeoOpportunity } from "./model";
import type { SeoCodeFile } from "./code";
import type { AnswerImplementation } from "./answer-implementation";
import { assessArticleDepth, hasStructuredDecisionAid, type ArticleDepth } from "./article-quality";
export type ArtifactStatus = "draft" | "approved" | "exported" | "applied" | "verified";
export type SeoArtifact = {
    id: string;
    brandId: string;
    contextHash: string;
    kind: "blog" | "fix";
    title: string;
    keyword: string;
    productId: string | null;
    targetUrl: string;
    description: string;
    body: string;
    sourceIds: string[];
    status: ArtifactStatus;
    revision: number;
    mode: "demo" | "live";
    createdAt: string;
    updatedAt: string;
    appliedUrl?: string;
    verification?: string;
    history: {
        at: string;
        message: string;
    }[];
    codeFiles?: SeoCodeFile[];
    answerEntry?: AnswerImplementation;
};
export const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "buying-guide";
const clean = (s: string) => s.replace(/[\r\n]+/g, " ").replace(/[<>]/g, "");
type BuyingFactor = {
    title: string;
    guidance: string;
};
function buyingFactors(format: string, category: string): BuyingFactor[] {
    const context = `${format} ${category}`.toLowerCase();
    if (/gumm|supplement|nutrition|vitamin|protein|greens|capsule|electrolyte/.test(context))
        return [
            { title: "Format and preparation", guidance: "Compare the physical format before comparing promises. A powder may involve mixing, while a capsule or chewable has different handling instructions. Read the exact product directions and consider the preparation, storage and carrying steps you can realistically follow. Do not assume that two formats contain the same ingredients or are interchangeable." },
            { title: "Label details and suitability", guidance: "Read the complete ingredient information, declared quantities, allergens and warnings for the selected version. A product name or category label cannot establish whether it is appropriate for an individual. Questions about conditions, medicines or other personal health circumstances require advice from a qualified professional, not a conclusion drawn from this buying guide." },
            { title: "Pack quantity and purchase terms", guidance: "Compare package contents using the units actually stated by each brand. Price per pack can be misleading when pack quantities differ. Only calculate a comparable unit price when both the current price and the relevant quantity are known. Check recurring-order terms separately; never infer a daily amount, duration or health benefit from pack size." },
        ];
    if (/cookware|skillet|stockpot|pan\b|kitchen|bottle|drinkware/.test(context))
        return [
            { title: "Capacity, dimensions and available space", guidance: "Match the stated dimensions and capacity to the job and the space available. A nominal size alone may not describe the usable interior or the room taken by handles and lids. Compare measurements consistently and check storage space as well as working space. If the specification is missing, ask for it instead of estimating from a photograph." },
            { title: "Materials and compatibility", guidance: "Check the exact material, finish and compatibility statements for the selected item. For cookware, confirm the manufacturer's guidance for the intended heat source; for other kitchen products, check the intended contents and conditions of use. Similar appearances do not establish equal compatibility. Keep undocumented heat, coating or durability claims out of the comparison." },
            { title: "Care and what comes in the box", guidance: "Read cleaning and care guidance before deciding whether the product fits your routine. Confirm whether lids, inserts or other accessories are included or sold separately. Compare the complete purchase needed for your use, rather than a headline price that omits an essential component. Keep warranty and return terms separate from assumptions about how long an item will last." },
        ];
    if (/apparel|clothing|shoe|footwear|fashion|shirt|dress|bag|hoodie|sweatshirt|\bhat/.test(context))
        return [
            { title: "Fit and measurements", guidance: "Use the product's own measurement or size guide instead of assuming that the same size label means the same fit across brands. Check which measurements refer to the item and which refer to the wearer. For bags, compare usable dimensions with what you need to carry. Ask about a missing measurement before making an irreversible customization choice." },
            { title: "Material and everyday use", guidance: "Read the material composition and care instructions for the exact variant. Think about where you will wear or carry the item and what maintenance you can manage. Product photography can suggest appearance, but it cannot establish comfort, waterproofing or long-term durability by itself. Treat those as separate questions requiring product-specific evidence." },
            { title: "Variant and exchange conditions", guidance: "Confirm the selected size, color and included components before comparing prices. Check exchange and return conditions, particularly for customized or final-sale items. A discounted option that cannot be exchanged may be a different practical choice from a full-price option. Record that distinction without assuming one is better for every shopper." },
        ];
    if (/skincare|cosmetic|beauty|cream|serum|cleanser/.test(context))
        return [
            { title: "Format and intended application", guidance: "Check whether the item is intended to be rinsed off, left on or used in another documented way. Compare the application steps with the routine you actually want to maintain. Do not treat a similar product name as evidence that two products have the same use instructions. Follow the directions for the exact item rather than a generic routine." },
            { title: "Ingredients and label cautions", guidance: "Read the current ingredient list and any stated cautions for the selected version. A highlighted ingredient is only one part of a formulation and does not establish a guaranteed result. Personal suitability cannot be determined from a category description. Where a concern is medical or an individual reaction is involved, seek qualified advice rather than inferring safety from promotional language." },
            { title: "Quantity, packaging and ongoing purchase", guidance: "Compare the declared amount and packaging format, then check current price and delivery terms. Unit prices are meaningful only when their units and quantities are comparable. Do not infer how many weeks a product will last without supported usage information. If replenishment is offered, inspect renewal and cancellation terms independently of a first-order offer." },
        ];
    return [
        { title: "Exact format and intended task", guidance: "Describe the task you need the product to perform, then compare its documented format and intended use with that task. Separate essential requirements from optional features. Similar names do not establish that two products solve the same problem, and a broad category description should not substitute for the specification of the item in your basket." },
        { title: "Specifications, options and included items", guidance: "Compare the same specifications across each option, including the selected version and what the package contains. Check any dimensions, compatibility requirements or accessories relevant to the task. Mark missing details as unknown. If an unanswered question could change your choice, ask the brand instead of treating the missing information as a product advantage." },
        { title: "Ownership and purchase conditions", guidance: "Check the instructions, maintenance requirements, current availability and complete purchase terms. Include delivery and any essential accessories when considering cost. Read returns and recurring-order conditions where applicable. A headline discount does not tell you whether the entire purchase fits your requirements, and a review cannot guarantee that your experience will match another customer's." },
    ];
}
function questionAngle(query: string, name: string): {
    heading: string;
    answer: string;
    check: string;
} {
    if (/stor|shelf|expir|fresh|refriger/.test(query))
        return { heading: "Start with the storage instructions", answer: `Follow the current label or instructions for ${name}. Check the recommended storage conditions, the printed date and whether the directions change after opening. Keep those details together: an unopened shelf-life statement may not describe how to look after the product once you begin using it.`, check: "Retain the original packaging information and ask the brand if the label is unclear. Avoid borrowing a temperature or storage rule from a different product." };
    if (/cost|price|worth|budget|value|how (many|much)|quantity|pack/.test(query))
        return { heading: "Compare the quantity and complete cost", answer: `Check the current product page for the selected ${name} pack and confirm its quantity before comparing prices. Divide the relevant price by the stated quantity only when the units are comparable. A larger pack can have a lower unit price yet still be the wrong purchase if you do not need that amount.`, check: "Separate the first order from repeat orders. Include delivery and required accessories, and check whether an introductory offer changes at renewal." };
    if (/fit|size|compatib|work with|hob|stove|induction/.test(query))
        return { heading: "Match the specification to what it must fit", answer: `Compare the stated dimensions or compatibility of ${name} with the item or space you want to use it with. Check both sides of the match, including clearance, attachments and any restrictions in the instructions. A similar product name or appearance is not enough to confirm compatibility.`, check: "Write down the required measurements or model identifiers, then ask the brand about the exact selected version if the product page leaves the match unclear." };
    if (/safe|benefit|healthy|health|daily|every day|take|dose|effective|work\b/.test(query))
        return { heading: "Read the directions for the exact product", answer: `Start with the current instructions and supporting information for ${name}. The format or product name alone does not tell you an appropriate amount, expected result or whether it suits your circumstances. Read the conditions attached to any product statement and distinguish a documented specification from someone else's personal experience.`, check: "Questions involving personal health, medicines or a condition belong with a qualified professional who can consider your circumstances." };
    return { heading: "Start with the detail that matters to your decision", answer: `To answer “${query}”, focus on the specification, instruction or purchase condition that would change your choice. Check the product page for ${name}, then compare the exact selected option with your needs. A specific answer about that version is more useful than a broad statement about the category.`, check: "If the detail remains unclear, ask the brand using the exact product name and question. Save the answer alongside the option you are considering." };
}
export function draftBlog(ctx: SeoContext, opportunity: SeoOpportunity): Pick<SeoArtifact, "kind" | "title" | "keyword" | "productId" | "targetUrl" | "description" | "body" | "sourceIds"> {
    const product = ctx.products.find((p) => p.id === opportunity.productId) ?? ctx.products[0];
    if (opportunity.productId && !ctx.products.some((p) => p.id === opportunity.productId))
        throw new Error("This product is not in the active Brand Brain.");
    if (!product)
        throw new Error("Add a product to the shared Brand Brain before creating a blog.");
    const query = clean(opportunity.query).trim();
    if (!query)
        throw new Error("Choose a buyer question or keyword before creating a blog.");
    const name = clean(product.name);
    const format = clean(productSearchType(product, ctx.category));
    const brand = clean(ctx.brandName);
    const subject = query.charAt(0).toUpperCase() + query.slice(1).replace(/[?]+$/, "");
    const comparison = /\b(vs\.?|versus|compar(?:e|ing|ison)|differences?|alternatives?)\b/i.test(query);
    const choosing = /\b(how to (choose|pick|select)|buying guide|best|choosing)\b/i.test(query);
    const question = !comparison && !choosing && /^(how|what|why|when|where|which|can|could|is|are|do|does|should|will)\b/i.test(query);
    const title = comparison ? `${subject}: a practical comparison` : question ? `${subject}? What to check before deciding` : choosing ? subject : `${subject}: what to look for before buying`;
    const factors = buyingFactors(format, "");
    const angle = questionAngle(query.toLowerCase(), name);
    const productUrl = product.url ?? (opportunity.mode === "demo" ? buildDemoSnapshot(ctx).pages.find((page) => page.kind === "pdp" && page.productId === product.id)!.url : "");
    const opening = comparison
        ? `When comparing ${format.toLowerCase()}, the useful differences are the ones that affect how you will use the product. Start with the exact options, compare the same details on each side, and weigh them against your own requirements. A longer feature list or a lower headline price is only part of the decision.`
        : question
            ? `A useful answer starts with the exact product and the way you intend to use it. For ${format.toLowerCase()}, small differences in the selected option, instructions or purchase terms can matter. Work through the checks below to answer your question and decide what belongs in your basket.`
            : `Choosing ${format.toLowerCase()} is easier when you focus on the details that affect your own purchase. Start with the intended use, the format and the exact version you are considering. Then compare a few meaningful criteria, instead of trying to find the product with the longest feature list.`;
    const firstSection = comparison
        ? `## Define the two options before comparing them\n\nStart with the exact product versions available to you. Check the selected size, format and package rather than relying on a collection image or a broad category name. Open the product details side by side and compare the same specifications. A difference in presentation is not necessarily a difference in the product.\n\nKeep prices comparable too. Check whether one includes delivery or an accessory that the other sells separately. An introductory offer and a regular purchase may have different conditions, so consider the cost and terms of the order you actually intend to place.`
        : question
            ? `## ${angle.heading}\n\n${angle.answer}\n\n${angle.check}`
            : `## Choose your essential requirements first\n\nPicture when and where you will use the product. Decide which requirements an option must meet and which features would simply be nice to have. A short list helps you avoid paying for extras you will rarely use or overlooking a small detail that matters every day.\n\nUse the criteria below to narrow your choices. Confirm essential details before ordering; let less important differences remain preferences. Two shoppers can reasonably choose different products from the same shortlist because their routines, space and purchase plans differ.`;
    const criteria = factors.map((factor) => `## ${factor.title}\n\n${factor.guidance}`).join("\n\n");
    const decision = comparison
        ? `## Choose the option that fits your priorities\n\nReturn to the requirement that matters most to you. If one product meets it and another does not, that difference may decide the comparison. If both meet your essentials, weigh the remaining tradeoffs: preparation, care, included items, available space or the complete cost of purchase.\n\nDo not let a minor extra outweigh an important mismatch. If you still need an answer that could change your choice, ask before buying. A clear explanation about the selected version is more useful than guessing from a similar-looking product.`
        : question
            ? `## Turn the answer into a buying decision\n\nOnce you have the relevant measurement, instruction or policy, check that it applies to your selected product and circumstances. If it does, decide whether the option meets your original requirement. If the information rules it out, look for an alternative that addresses that particular need instead of restarting with an unrelated list of features.\n\nFor an unanswered question, contact the brand with the exact product name and version. Include the measurement, model or purchase condition you need to check so the reply is specific enough to help.`
            : `## Narrow your shortlist\n\nSet aside options that do not meet an essential requirement. For the remaining products, separate meaningful differences from optional extras. Compare the complete purchase, including required accessories or delivery, using current information. A review can offer another customer's perspective, but it does not guarantee that your experience will be the same.\n\nIf two choices still look similar, return to the criterion that matters most to you. Ask for a missing detail instead of adding more unrelated features to the comparison. The goal is a product that fits your needs and a purchase you understand.`;
    const body = `# ${title}

${opening}

${firstSection}

${criteria}

## Take a closer look at ${name}

${name} is part of the ${brand} range. Review ${productUrl ? `[${name}](${productUrl})` : name} alongside your shortlist and check the currently available options. Keep your essential requirements in view while reading the product details, then confirm the selected item and purchase terms before ordering.

${decision}

## Before you order

- Identify the exact product, version and market being compared.
${factors.map((factor) => `- Check ${factor.title.toLowerCase()} using current product-specific information.`).join("\n")}
- Resolve any unanswered question that could change your choice.
- Confirm availability, price and purchase terms before ordering.

## Common buying questions

### Is the lowest price always the best value?

Compare what you receive and what you will actually use. A lower price can involve a smaller quantity, fewer included items or different purchase conditions. An extra feature has little value if it does not help with your needs. Consider the full order rather than the discount alone.

### What if two product pages use different descriptions?

Look for comparable details beneath the wording: the exact format, measurements, quantity, included items and instructions. Ask for clarification when an important term is unclear. Treat a missing specification as a question to resolve, not a reason to assume the products are equivalent.

### Should I check the details again when reordering?

Yes. Check the selected version and current purchase terms, especially if the packaging, options or offer have changed. A previous order is a useful reference, but the current page and order confirmation describe the purchase you are making now.
`;
    return { kind: "blog", title, keyword: query, productId: product.id, targetUrl: opportunity.destination === "blog" ? opportunity.targetUrl : `/blogs/guides/${slug(query)}`, description: `${comparison ? "Compare" : question ? "Explore" : "A buying guide to"} ${query.toLowerCase()}: ${factors.map((factor) => factor.title.toLowerCase()).join(", ")}.`.slice(0, 160), body, sourceIds: [`brand:${ctx.brandId}:product:${product.id}`] };
}
export function draftFix(finding: SeoFinding): Pick<SeoArtifact, "kind" | "title" | "keyword" | "productId" | "targetUrl" | "description" | "body" | "sourceIds"> {
    return { kind: "fix", title: finding.title, keyword: "", productId: null, targetUrl: finding.url, description: finding.why,
        sourceIds: [`audit:${finding.ruleId}`, `finding:${finding.id}`], body: `# ${finding.title}\n\n## Evidence (${finding.mode === "live" ? "live website audit" : "demo snapshot"})\n\n${finding.evidence.map((s) => `- ${s}`).join("\n")}\n\n## Recommended change\n\n${finding.remedy}\n\n## Implementation checklist\n\n- Confirm this issue on the current store page: ${finding.url}.\n- Save a copy of the current page or theme before editing.\n- Apply the recommended change in a duplicate theme or draft page.\n- Check the rendered page, selected variant, mobile layout, and existing markup.\n- Have the store owner approve and publish the change.\n\n## Verification and rollback\n\nRecord the actual URL and a fresh observation of the affected field. A manual completion report does not establish indexing or ranking improvement. If the change causes a regression, restore the saved page or theme revision.\n\nTheme-specific code requires the real template and page evidence; this package is an implementation brief.\n` };
}
export function contentChecks(a: Pick<SeoArtifact, "title" | "body" | "description" | "keyword" | "kind" | "answerEntry"> & {
    codeFiles?: SeoCodeFile[];
}, ctx: SeoContext): {
    blockers: string[];
    notes: string[];
} {
    const normalize = (s: string) => s.normalize("NFKC").toLowerCase()
        .replace(/&#(x[0-9a-f]+|[0-9]+);?/gi, (_m, n: string) => { const code = n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : parseInt(n, 10); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ""; })
        .replace(/&(nbsp|ensp|emsp|thinsp);/g, " ")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
        .replace(/[*_~`\\\u200b-\u200d\ufeff]/g, "")
        .replace(/\s+/g, " ").trim();
    const prose = a.kind === "fix" ? a.body.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "[developer code evidence]") : a.body;
    const text = normalize(`${a.title} ${prose} ${a.description}`);
    const blockers = ctx.forbiddenClaims.filter((c) => c.trim().length > 2 && text.includes(normalize(c))).map((c) => `Restricted or unapproved claim: ${c}`);
    if (!a.title.trim() || !a.body.trim())
        blockers.push("A title and body are required.");
    if (a.answerEntry?.route === "content" && /\[\[REVIEW:/i.test(a.body))
        blockers.push("Complete the answer and evidence section before approving this editorial starter.");
    if (/<\s*(script|iframe|object)|javascript\s*:/i.test(`${a.title} ${prose} ${a.description}`))
        blockers.push("Remove embedded scripts or unsafe URLs from the content.");
    const notes = ["Review every product statement against its evidence before publishing.", "Confirm proposed article URLs and exact product destinations before publishing."];
    if (a.kind === "blog" && !text.includes(a.keyword.toLowerCase()))
        notes.push("The target keyword is absent from the draft.");
    if (a.title.length > 65)
        notes.push("The title is long; preview it in the store's search listing editor.");
    if (a.kind === "blog" && a.body.split(/\s+/).length < 400)
        notes.push("This draft is short. Check whether it fully answers the buyer's question.");
    if (a.kind === "blog")
        for (const file of a.codeFiles ?? []) {
            if (!file.name.endsWith("-editorial-brief.json"))
                continue;
            try {
                const brief = JSON.parse(file.code);
                if (!["short_answer", "standard", "deep"].includes(brief.depth))
                    continue;
                const quality = assessArticleDepth(a.body, brief.depth as ArticleDepth);
                if (brief.depth !== "short_answer" && /\b(?:worksheet|checklist|table)\b/i.test(brief.originalContribution?.description ?? "") && !hasStructuredDecisionAid(a.body))
                    quality.blockers.push("Deliver the promised worksheet, checklist or table in the article itself, with filled known facts and explicit unresolved fields.");
                blockers.push(...quality.blockers);
                notes.push(`${quality.wordCount} reader-facing words · ${brief.depth.replace("_", " ")} depth.`, ...quality.notes);
            }
            catch {
                blockers.push("The article depth brief is unreadable. Restore it before approving this revision.");
            }
        }
    return { blockers, notes };
}
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
export function articleHtml(body: string): string {
    const inline = (s: string) => {
        const escaped = escapeHtml(s), emphasis = (text: string) => text.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
        let html = "", end = 0;
        for (const match of escaped.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
            html += emphasis(escaped.slice(end, match.index));
            const [, label, url] = match;
            html += /^(\/[^/]|https?:\/\/)/i.test(url) ? `<a href="${url}">${emphasis(label)}</a>` : emphasis(label);
            end = match.index! + match[0].length;
        }
        return html + emphasis(escaped.slice(end));
    };
    const tableCells = (line: string) => {
        const value = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, ""), cells = [""];
        for (let i = 0; i < value.length; i++) {
            if (value[i] === "\\" && value[i + 1] === "|") {
                cells[cells.length - 1] += "|";
                i++;
            }
            else if (value[i] === "|")
                cells.push("");
            else
                cells[cells.length - 1] += value[i];
        }
        return cells.map(cell => cell.trim());
    };
    return body.split(/\n\s*\n/).filter(Boolean).map((p) => {
        const lines = p.split(/\r?\n/), headers = tableCells(lines[0]), separators = lines.length > 1 ? tableCells(lines[1]) : [];
        if (headers.length > 1 && headers.length === separators.length && separators.every(cell => /^:?-{3,}:?$/.test(cell)) && lines.slice(2).every(line => tableCells(line).length > 1)) {
            const rows = lines.slice(2).map(tableCells);
            return `<table><thead><tr>${headers.map(cell => `<th scope="col">${inline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map((_header, i) => `<td>${inline(row[i] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        }
        const h = /^(#{1,3}) (.*)$/.exec(p);
        if (h)
            return `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;
        if (lines.every(l => /^\d+\.\s+/.test(l)))
            return `<ol>${lines.map(l => `<li>${inline(l.replace(/^\d+\.\s+/, ""))}</li>`).join("")}</ol>`;
        if (p.split("\n").every((l) => l.startsWith("- ")))
            return `<ul>${p.split("\n").map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`;
        return `<p>${inline(p).replace(/\n/g, "<br>\n")}</p>`;
    }).join("\n\n");
}
export function exportPackage(a: SeoArtifact, ctx: SeoContext) {
    if (a.brandId !== ctx.brandId || (a.productId && !ctx.products.some((p) => p.id === a.productId)))
        throw new Error("This artifact does not belong to the active brand's catalogue.");
    if (a.contextHash !== ctx.contextHash)
        throw new Error("Brand Brain changed. Create a fresh draft before approving an export.");
    if (!["approved", "exported", "applied", "verified"].includes(a.status))
        throw new Error("Approve this revision before exporting it.");
    if (contentChecks(a, ctx).blockers.length)
        throw new Error("Resolve blocked content before exporting.");
    return { version: 1, executor: "manual", mode: a.mode, artifact: a, html: articleHtml(a.body),
        instructions: a.answerEntry ? ["Review the research brief and complete the route-specific worksheet.", ...a.answerEntry.tasks.map(t => t.label), "Use this package in the appropriate store, CMS or commerce platform. No changes are applied by exporting.", "Record the actual destination or record URL and fresh verification evidence. Repeat the original answer protocol separately."] : [a.mode === "demo" ? "Legacy demo package: verify facts and replace all proposed URLs." : "Verify current product facts, captured audit evidence and proposed URLs before implementation.", "Save the current page/theme as your rollback copy.", "For a blog: Shopify Admin → Content → Blog posts → Add blog post. Paste the title and HTML body; review formatting.", "Set the search listing title, description and URL handle. Avoid changing an existing URL without a redirect plan.", "Check product links, claims, attribution, images and mobile preview. The store owner publishes manually.", "Return here to record implementation, then add fresh verification evidence. No store changes are made by this app."],
        checks: contentChecks(a, ctx),
    };
}
