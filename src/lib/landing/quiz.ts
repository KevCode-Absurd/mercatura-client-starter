import { z } from "zod";
const key = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const productKey = z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/);
const copy = z.string().trim().min(1).max(1000);
const productUrl = z.string().max(2048).refine((value) => {
    if (/[\s\\<>{}\u0000-\u001f]/.test(value) || value.startsWith("//"))
        return false;
    try {
        const url = new URL(value, "https://quiz.invalid");
        return url.protocol === "https:" && !url.username && !url.password && (value.startsWith("/") || value.startsWith("https://"));
    }
    catch {
        return false;
    }
}, "Use an HTTPS product URL or a same-store absolute path.");
export const QuizSchema = z.object({
    title: copy, introduction: copy, resultTitle: copy, fallbackMessage: copy,
    minScore: z.number().int().min(1).max(40).default(1),
    products: z.array(z.object({ id: productKey, name: copy, url: productUrl, reason: copy })).min(1).max(20),
    questions: z.array(z.object({
        id: key, prompt: copy, help: z.string().max(1000).default(""),
        options: z.array(z.object({
            id: key, label: copy,
            productWeights: z.array(z.object({ productId: productKey, weight: z.number().int().min(-5).max(5) })).max(20),
            excludeProductIds: z.array(productKey).max(20).default([]),
            nextQuestionId: z.string().max(64).nullable().optional(),
        })).min(2).max(5),
    })).min(1).max(8),
});
export type CroQuiz = z.infer<typeof QuizSchema>;
export interface QuizRecommendation {
    complete: boolean;
    productId: string | null;
    scores: Record<string, number>;
    visitedQuestionIds: string[];
    tiedProductIds: string[];
    excludedProductIds: string[];
}
export function validateQuiz(input: unknown, allowedProductIds?: readonly string[]): CroQuiz {
    const quiz = QuizSchema.parse(input);
    const ids = new Set(quiz.questions.map((q) => q.id));
    const products = new Set(quiz.products.map((p) => p.id));
    if (ids.size !== quiz.questions.length || ids.has("end"))
        throw new Error("Quiz question IDs must be unique; end is reserved.");
    if (products.size !== quiz.products.length)
        throw new Error("Quiz product IDs must be unique.");
    if (allowedProductIds && quiz.products.some((p) => !allowedProductIds.includes(p.id)))
        throw new Error("Quiz recommends a product outside the active brand catalog.");
    const edges = new Map<string, string[]>();
    for (const [i, question] of quiz.questions.entries()) {
        if (new Set(question.options.map((o) => o.id)).size !== question.options.length)
            throw new Error(`Duplicate option in ${question.id}.`);
        const nextIds: string[] = [];
        for (const option of question.options) {
            if (new Set(option.productWeights.map((w) => w.productId)).size !== option.productWeights.length)
                throw new Error(`Duplicate product weight in ${question.id}/${option.id}.`);
            if (option.productWeights.some((w) => !products.has(w.productId)) || option.excludeProductIds.some((id) => !products.has(id)))
                throw new Error(`Unknown product in ${question.id}/${option.id}.`);
            const next = option.nextQuestionId ?? quiz.questions[i + 1]?.id ?? "end";
            if (next !== "end" && !ids.has(next))
                throw new Error(`Unknown next question ${next}.`);
            nextIds.push(next);
        }
        edges.set(question.id, nextIds);
    }
    const visited = new Set<string>(), active = new Set<string>();
    function walk(id: string) {
        if (id === "end")
            return;
        if (active.has(id))
            throw new Error("Quiz contains a question cycle.");
        if (visited.has(id))
            return;
        active.add(id);
        visited.add(id);
        for (const next of edges.get(id) ?? [])
            walk(next);
        active.delete(id);
    }
    walk(quiz.questions[0].id);
    if (visited.size !== quiz.questions.length)
        throw new Error("Quiz contains unreachable questions.");
    return quiz;
}
function outcome(quiz: CroQuiz, answers: Record<string, string>): QuizRecommendation {
    const scores: Record<string, number> = Object.fromEntries(quiz.products.map((p) => [p.id, 0]));
    const visitedQuestionIds: string[] = [];
    const excluded = new Set<string>();
    let current: string = quiz.questions[0].id;
    while (current !== "end") {
        const i = quiz.questions.findIndex((q) => q.id === current);
        if (i < 0 || visitedQuestionIds.includes(current))
            throw new Error("Invalid quiz path.");
        const question = quiz.questions[i];
        visitedQuestionIds.push(current);
        const answer = Object.prototype.hasOwnProperty.call(answers, current) ? answers[current] : undefined;
        if (answer === undefined)
            return { complete: false, productId: null, scores, visitedQuestionIds, tiedProductIds: [], excludedProductIds: [...excluded].sort() };
        const option = question.options.find((o) => o.id === answer);
        if (!option)
            throw new Error(`Unknown answer for ${current}.`);
        for (const weight of option.productWeights)
            scores[weight.productId] += weight.weight;
        for (const id of option.excludeProductIds)
            excluded.add(id);
        current = option.nextQuestionId ?? quiz.questions[i + 1]?.id ?? "end";
    }
    const ranked = quiz.products.filter((p) => !excluded.has(p.id) && scores[p.id] >= quiz.minScore)
        .sort((a, b) => scores[b.id] - scores[a.id] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const productId = ranked[0]?.id ?? null;
    return {
        complete: true, productId, scores, visitedQuestionIds,
        tiedProductIds: productId ? ranked.filter((p) => scores[p.id] === scores[productId]).map((p) => p.id) : [],
        excludedProductIds: [...excluded].sort(),
    };
}
export function recommendQuiz(input: unknown, answers: Record<string, string>): QuizRecommendation {
    return outcome(validateQuiz(input), answers);
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");
const dataJson = (value: unknown): string => JSON.stringify(value, (_key, v) => v).replace(/"(?:\\.|[^"\\])*"/g, (s) => s.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/{/g, "\\u007b").replace(/}/g, "\\u007d").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"));
export interface RenderedQuiz {
    html: string;
    css: string;
    script: string;
}
export function renderQuiz(input: unknown, options: {
    shopify?: boolean;
} = {}): RenderedQuiz {
    const quiz = validateQuiz(input);
    if (options.shopify) {
        for (const product of quiz.products) {
            const url = new URL(product.url, "https://quiz.invalid");
            if (!/^\/products\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname))
                throw new Error("Shopify quiz products must use a /products/handle destination.");
            product.url = `${url.pathname}${url.search}${url.hash}`;
        }
    }
    const html = `<section class="cro-quiz" data-cro-quiz aria-label="${esc(quiz.title)}"><h2>${esc(quiz.title)}</h2><p>${esc(quiz.introduction)}</p><p class="cro-quiz-privacy">Your answers stay in this page. No email is required.</p><div data-quiz-live aria-live="polite" aria-atomic="true"></div><div data-quiz-panel></div><noscript><p>Turn on JavaScript to use the product finder. You can also browse the products below.</p><ul>${quiz.products.map((p) => `<li><a href="${esc(p.url)}">${esc(p.name)}</a></li>`).join("")}</ul></noscript><script type="application/json" data-quiz-data>${dataJson(quiz)}</script></section>`;
    const css = `.cro-quiz{max-width:840px;margin:40px auto;padding:clamp(20px,5vw,48px);background:var(--surface,#f7f7f5);color:var(--ink,#18221d);border-radius:var(--radius,16px)}.cro-quiz h2{font-family:var(--font-heading,inherit)}.cro-quiz-privacy{font-size:.85rem;opacity:.75}.cro-quiz fieldset{border:0;margin:0;padding:0}.cro-quiz legend{font-weight:700;font-size:clamp(1.25rem,3vw,1.8rem);margin:16px 0}.cro-quiz label{display:flex;align-items:center;gap:12px;border:1px solid currentColor;padding:16px;margin:10px 0;border-radius:8px;cursor:pointer;min-height:48px}.cro-quiz label:has(input:checked){outline:3px solid var(--accent,#3e684e);outline-offset:1px}.cro-quiz input{width:20px;height:20px;flex:none;accent-color:var(--cta,#285438)}.cro-quiz button,.cro-quiz-result-link{display:inline-block;padding:14px 24px;min-height:48px;border:1px solid currentColor;border-radius:8px;cursor:pointer;background:var(--cta,#285438);color:var(--cta-ink,#fff);font:inherit;font-weight:600;text-decoration:none}.cro-quiz button:disabled{opacity:.45;cursor:not-allowed}.cro-quiz [data-quiz-back],.cro-quiz [data-quiz-restart]{background:transparent;color:inherit}.cro-quiz-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}.cro-quiz :focus-visible{outline:3px solid var(--accent,#2b6945);outline-offset:4px}.cro-quiz [tabindex="-1"]:focus{outline:none}.cro-quiz-summary{padding:16px 24px;line-height:1.7}.cro-quiz-progress{font-size:.9rem;opacity:.8}`;
    const script = `(()=>{const evaluate=${outcome.toString()};
function setup(root){if(root.dataset.quizReady)return;root.dataset.quizReady="true";const quiz=JSON.parse(root.querySelector('[data-quiz-data]').textContent);const panel=root.querySelector('[data-quiz-panel]'),live=root.querySelector('[data-quiz-live]');let answers=Object.create(null),history=[];const instance='quiz-'+Math.random().toString(36).slice(2);const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
function button(text,attr,fn){const b=make('button',text);b.type='button';b.setAttribute(attr,'');b.addEventListener('click',fn);return b;}
function focusHeading(el){el.tabIndex=-1;el.focus({preventScroll:true});}
function back(){const previous=history.pop();if(!previous)return;const index=history.indexOf(previous);if(index>=0)history=history.slice(0,index);delete answers[previous];show(previous);}
function restart(){answers=Object.create(null);history=[];show(quiz.questions[0].id);}
function results(){panel.replaceChildren();const result=evaluate(quiz,answers);if(!result.complete)return;const h=make('h3',quiz.resultTitle);panel.append(h);const selected=quiz.products.find(p=>p.id===result.productId);if(selected){panel.append(make('h4',selected.name),make('p',selected.reason));if(result.tiedProductIds.length>1)panel.append(make('p','Several options match equally. We show the first by product identifier; you can compare the alternatives below.'));const a=make('a','View '+selected.name);a.href=selected.url;a.className='cro-quiz-result-link';panel.append(a);for(const id of result.tiedProductIds.filter(id=>id!==selected.id)){const p=quiz.products.find(p=>p.id===id);const line=make('p'),link=make('a','Compare '+p.name);link.href=p.url;line.append(link);panel.append(line);}}else panel.append(make('p',quiz.fallbackMessage));const summary=make('ul');summary.className='cro-quiz-summary';for(const id of result.visitedQuestionIds){const q=quiz.questions.find(q=>q.id===id),o=q.options.find(o=>o.id===answers[id]);summary.append(make('li',q.prompt+': '+o.label));}panel.append(summary);const actions=make('div');actions.className='cro-quiz-actions';actions.append(button('Back','data-quiz-back',back),button('Start again','data-quiz-restart',restart));panel.append(actions);live.textContent='Your result is ready.';focusHeading(h);}
function show(id){panel.replaceChildren();const q=quiz.questions.find(q=>q.id===id);const progress=make('p','Question '+(history.length+1)+' · up to '+quiz.questions.length+' questions');progress.className='cro-quiz-progress';panel.append(progress);const field=make('fieldset'),legend=make('legend',q.prompt);field.append(legend);if(q.help){const help=make('p',q.help);help.id=instance+'-help';field.setAttribute('aria-describedby',help.id);field.append(help);}const actions=make('div');actions.className='cro-quiz-actions';const next=button('Continue','data-quiz-next',()=>{const chosen=q.options.find(o=>o.id===answers[id]);if(!chosen)return;history.push(id);const i=quiz.questions.findIndex(q=>q.id===id);const target=chosen.nextQuestionId??(quiz.questions[i+1]?.id??'end');target==='end'?results():show(target);});next.disabled=!answers[id];for(const option of q.options){const label=make('label'),input=make('input');input.type='radio';input.name=instance+'-'+id;input.value=option.id;input.checked=answers[id]===option.id;input.addEventListener('change',()=>{answers[id]=option.id;next.disabled=false;});label.append(input,make('span',option.label));field.append(label);}panel.append(field);if(history.length)actions.append(button('Back','data-quiz-back',back));actions.append(next);panel.append(actions);live.textContent='Question '+(history.length+1);focusHeading(legend);}
show(quiz.questions[0].id);}
const init=()=>document.querySelectorAll('[data-cro-quiz]').forEach(setup);init();document.addEventListener('shopify:section:load',init);})();`;
    return { html, css, script };
}
