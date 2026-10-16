import fs from "node:fs";
import path from "node:path";
import { zip, type ZipEntry } from "../zip";
import { fontsDir } from "../brand-fonts";
import type { CroRun, CroSection } from "./studio-types";
import { pageDesignCss, brandCss, escapeHtml, renderCroPage, validateSection, resolveProductDestination } from "./studio-render";
import { containedFile, fontCssFor, inlineCroImages, localAssetFile, usedCroAssets } from "./studio-assets";
import { scopeSectionCss } from "./studio-css";
import { renderQuiz } from "./quiz";
import { sectionVisualCss } from "./studio-workbench";
const textEntry = (name: string, value: string): ZipEntry => ({ name, data: Buffer.from(value) });
const liquidString = (s: string) => s.replace(/['\\\r\n{}%<>;]/g, "");
const liquidHtml = (s: string) => escapeHtml(s).replace(/{/g, "&#123;").replace(/}/g, "&#125;");
const liquidSchema = (v: unknown) => JSON.stringify(v, null, 2).replace(/"(?:\\.|[^"\\])*"/g, s => s.replace(/{/g, "\\u007b").replace(/}/g, "\\u007d"));
const themeChrome = (section: CroSection) => /^(?:(?:site|page|global|main)[-_])?(?:header|footer)$/i.test(section.id);
export function exportCroHtml(run: CroRun): string { return renderCroPage(run, { fontCss: fontCssFor(run), images: inlineCroImages(run) }); }
function purchaseLiquid(key: string): string {
    return `{% assign cro_product = section.settings.product | default: product %}
{% if cro_product != blank %}
{% assign cro_variant = cro_product.selected_or_first_available_variant %}
{% capture cro_form_id %}cro-form-{{ section.id }}-${key}{% endcapture %}
{% form 'product', cro_product, id: cro_form_id, class: 'cro-purchase' %}
  <p class="cro-purchase-price" data-cro-price>{{ cro_variant.price | money }}</p>
  <label for="cro-variant-{{ section.id }}-${key}">{{ 'cro.variant' | t }}</label>
  <select id="cro-variant-{{ section.id }}-${key}" name="id" data-cro-variant>
    {% for variant in cro_product.variants %}<option value="{{ variant.id }}" data-price="{{ variant.price | money | escape }}" data-available="{{ variant.available }}" {% if variant.id == cro_variant.id %}selected{% endif %} {% unless variant.available %}disabled{% endunless %}>{{ variant.title | escape }} — {{ variant.price | money }}{% unless variant.available %} ({{ 'cro.sold_out' | t }}){% endunless %}</option>{% endfor %}
  </select>
  <label for="cro-quantity-{{ section.id }}-${key}">{{ 'cro.quantity' | t }}</label><input id="cro-quantity-{{ section.id }}-${key}" name="quantity" type="number" min="1" value="1" inputmode="numeric">
  {% if cro_product.selling_plan_groups.size > 0 %}
  <label for="cro-plan-{{ section.id }}-${key}">{{ 'cro.purchase' | t }}</label>
  <select id="cro-plan-{{ section.id }}-${key}" name="selling_plan" data-cro-plan {% if cro_product.requires_selling_plan %}required{% endif %}>
    {% unless cro_product.requires_selling_plan %}<option value="">{{ 'cro.one_time' | t }}</option>{% endunless %}
    {% for allocation in cro_variant.selling_plan_allocations %}<option value="{{ allocation.selling_plan.id }}" data-price="{{ allocation.price | money | escape }}">{{ allocation.selling_plan.name | escape }} — {{ allocation.price | money }}</option>{% endfor %}
  </select>
  {% endif %}
  <button class="cro-buy" type="submit" {% unless cro_variant.available %}disabled{% endunless %}>{{ 'cro.add_to_cart' | t }}</button>
  {{ form.errors | default_errors }}
{% endform %}
<script type="application/json" data-cro-variants="{{ cro_form_id }}">[{% for v in cro_product.variants %}{"id":"{{ v.id }}","price":{{ v.price | money | json }},"required":{{ cro_product.requires_selling_plan | json }},"plans":[{% for a in v.selling_plan_allocations %}{"id":"{{ a.selling_plan.id }}","name":{{ a.selling_plan.name | json }},"price":{{ a.price | money | json }}}{% unless forloop.last %},{% endunless %}{% endfor %}]}{% unless forloop.last %},{% endunless %}{% endfor %}]</script>
{% elsif request.design_mode %}<p>Select this section's product in the theme editor.</p>{% endif %}`;
}
const commerceJs = `(()=>{function wire(root){root.querySelectorAll('form.cro-purchase').forEach(form=>{if(form.dataset.croReady)return;form.dataset.croReady='1';const variants=root.querySelector('[data-cro-variants="'+form.id+'"]');const data=variants?JSON.parse(variants.textContent):[];const select=form.querySelector('[data-cro-variant]'),plan=form.querySelector('[data-cro-plan]'),price=form.querySelector('[data-cro-price]');const draw=()=>{const selected=select.options[select.selectedIndex];const v=data.find(x=>x.id===select.value);if(plan&&v){const previous=plan.value;plan.replaceChildren();if(!v.required)plan.add(new Option('One-time purchase',''));v.plans.forEach(p=>{const option=new Option(p.name+' — '+p.price,p.id);option.dataset.price=p.price;plan.add(option)});if([...plan.options].some(o=>o.value===previous))plan.value=previous;}if(price)price.textContent=plan?.selectedOptions[0]?.dataset.price||selected?.dataset.price||'';form.querySelector('button[type=submit]').disabled=selected?.dataset.available!=='true'||(v?.required&&!plan?.value);};select?.addEventListener('change',draw);plan?.addEventListener('change',()=>{if(price)price.textContent=plan.selectedOptions[0]?.dataset.price||select.selectedOptions[0]?.dataset.price||''});draw();})}wire(document);document.addEventListener('shopify:section:load',e=>wire(e.target));})();`;
export function exportCroShopify(run: CroRun): Buffer {
    const entries: ZipEntry[] = [], prefix = `cro-${run.id.slice(0, 8)}`, assets: Record<string, string> = {};
    for (const asset of usedCroAssets(run)) {
        const file = localAssetFile(run, asset.id);
        if (!file)
            continue;
        const name = `${prefix}-${Object.keys(assets).length}${path.extname(file)}`;
        assets[asset.id] = name;
        entries.push({ name: `assets/${name}`, data: fs.readFileSync(file) });
    }
    let fontCss = "";
    for (const f of run.brand.fonts) {
        const file = containedFile(fontsDir(run.brandId), f.file);
        if (!file)
            continue;
        const name = `${prefix}-font-${entries.length}${path.extname(file)}`;
        entries.push({ name: `assets/${name}`, data: fs.readFileSync(file) });
        fontCss += `@font-face{font-family:'${liquidString(f.family)}';font-weight:${/^\d{2,4}( \d{2,4})?$/.test(f.weight) ? f.weight : "400"};font-style:${f.style === "italic" ? "italic" : "normal"};font-display:swap;src:url('{{ '${name}' | asset_url }}')}\n`;
    }
    const templates: Record<string, unknown> = {}, order: string[] = [];
    const scopeId = "cro-instance", scope = `#${scopeId}`, dynamicId = "cro-{{ section.id }}";
    const instanceCss = (css: string, ids: Record<string, string> = {}) => scopeSectionCss(css, scope, ids).replaceAll(scopeId, dynamicId);
    let quizAdded = false;
    const addQuiz = () => {
        if (!run.quiz || quizAdded)
            return;
        quizAdded = true;
        const quiz = renderQuiz(run.quiz, { shopify: true }), type = `${prefix}-quiz`;
        entries.push(textEntry(`assets/${prefix}-quiz.js`, quiz.script));
        entries.push(textEntry(`sections/${type}.liquid`, `{% style %}${fontCss}{% endstyle %}\n<section id="${dynamicId}" class="cro-export">${quiz.html}</section>\n{% style %}\n${instanceCss(brandCss(run.brand) + "\n" + pageDesignCss(run) + "\n" + quiz.css)}\n{% endstyle %}\n<script src="{{ '${prefix}-quiz.js' | asset_url }}" defer></script>\n{% schema %}\n${liquidSchema({ name: "Product finder quiz", settings: [], presets: [{ name: "Product finder quiz" }] })}\n{% endschema %}`));
        templates.quiz = { type, settings: {} };
        order.push("quiz");
    };
    for (const section of run.sections.filter(s => s.enabled)) {
        validateSection(section);
        const type = `${prefix}-${section.id}`;
        const settings: Record<string, unknown> = {};
        const schemaSettings: Record<string, unknown>[] = [{ type: "product", id: "product", label: "Product" }, { type: "url", id: "destination", label: "Product page link" }];
        if (run.brand.productHandle)
            settings.product = run.brand.productHandle;
        if (!run.brand.productHandle && run.brand.productUrl)
            settings.destination = run.brand.productUrl;
        for (const field of section.copy) {
            schemaSettings.push({ type: "textarea", id: `text_${field.key}`, label: field.key.replace(/[_-]/g, " ") });
            settings[`text_${field.key}`] = field.text;
        }
        for (const image of section.images)
            schemaSettings.push({ type: "image_picker", id: `image_${image.key}`, label: image.key.replace(/[_-]/g, " ") });
        let buys = 0;
        const ids: Record<string, string> = { [`cro-${section.id}`]: scopeId };
        for (const match of section.html.matchAll(/\bid\s*=\s*"([a-zA-Z][\w-]*)"/gi))
            ids[match[1]] = `${scopeId}-${match[1]}`;
        const sourceHtml = section.html.replace(/\bid\s*=\s*"([a-zA-Z][\w-]*)"/gi, (_, id: string) => `id="${ids[id].replace(scopeId, dynamicId)}"`).replace(/\bhref\s*=\s*"#([\w-]+)"/gi, (full, id: string) => ids[id] ? `href="#${ids[id].replace(scopeId, dynamicId)}"` : full).replace(/\baria-label\s*=\s*"\{\{text:([a-z][a-z0-9_-]*)\}\}"/gi, (_, key: string) => `aria-label="{{ section.settings.text_${key} | escape }}"`);
        const markup = sourceHtml.replace(/\{\{(buy|link|product:[a-zA-Z0-9_-]+|(?:text|image):[a-z][a-z0-9_-]*)\}\}/g, (_, token: string) => {
            if (token === "buy")
                return purchaseLiquid(String(buys++));
            if (token === "link")
                return "{{ section.settings.destination | default: section.settings.product.url | default: product.url | escape }}";
            if (token.startsWith("product:")) {
                const url = new URL(resolveProductDestination(run.brand, token.slice(8)));
                if (!/^\/products\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname))
                    throw new Error("Shopify product links must use a /products/handle destination.");
                return liquidHtml(`${url.pathname}${url.search}${url.hash}`);
            }
            const [kind, key] = token.split(":");
            if (kind === "text")
                return `{{ section.settings.text_${key} | escape | newline_to_br }}`;
            const image = section.images.find(i => i.key === key), asset = run.brand.assets.find(a => a.id === image?.assetId), file = assets[image?.assetId || ""];
            const fallback = file ? `<img src="{{ '${file}' | asset_url }}" alt="${liquidHtml(image?.alt || "")}" loading="lazy" width="1200" height="1200">` : asset && /^https:\/\//.test(asset.src) ? `<img src="${liquidHtml(asset.src)}" alt="${liquidHtml(image?.alt || "")}" loading="lazy">` : '{% if request.design_mode %}<div class="cro-missing">Select a product image</div>{% endif %}';
            return `{% if section.settings.image_${key} != blank %}{{ section.settings.image_${key} | image_url: width: 2000 | image_tag: loading: 'lazy', widths: '390, 780, 1200, 1600, 2000' }}{% else %}${fallback}{% endif %}`;
        });
        const css = instanceCss(brandCss(run.brand) + "\n" + pageDesignCss(run) + "\n" + section.css + "\n" + sectionVisualCss(section, `#cro-${section.id}`), ids);
        entries.push(textEntry(`sections/${type}.liquid`, `{% style %}${fontCss}{% endstyle %}\n<script src="{{ '${prefix}-commerce.js' | asset_url }}" defer></script>\n<section id="${dynamicId}" class="cro-export">${markup}</section>\n{% style %}\n${css}\n{% endstyle %}\n{% schema %}\n${liquidSchema({ name: section.label.slice(0, 25), settings: schemaSettings, presets: [{ name: section.label.slice(0, 25) }] })}\n{% endschema %}`));
        const chrome = themeChrome(section);
        const id = `section${order.length + 1}`;
        templates[id] = { type, settings, ...(chrome ? { disabled: true } : {}) };
        order.push(id);
        if (!chrome && !quizAdded)
            addQuiz();
    }
    addQuiz();
    const template = run.request.pageType === "pdp" ? "product" : run.request.pageType === "home" ? "index" : run.request.pageType === "collection" ? "collection" : "page";
    entries.push(textEntry(`templates/${template}.${prefix}.json`, JSON.stringify({ sections: templates, order }, null, 2)));
    entries.push(textEntry(`assets/${prefix}-commerce.js`, commerceJs));
    entries.push(textEntry("locales/cro.en.json", JSON.stringify({ cro: { variant: "Choose an option", quantity: "Quantity", purchase: "Purchase option", one_time: "One-time purchase", add_to_cart: "Add to cart", sold_out: "Sold out" } }, null, 2)));
    entries.push(textEntry("INSTALL.md", `# ${run.blueprint?.title || run.brand.name}\n\nShopify section pack for an existing Online Store 2.0 theme. Work in a duplicate/unpublished theme first.\n\n1. Copy sections/ and assets/ files into the matching theme directories.\n2. Copy the alternate template from templates/. For the homepage, merge its section/order data into the chosen theme's index.json; Shopify does not offer homepage template assignment per page. Preserve the existing file as backup.\n3. Merge the cro object from locales/cro.en.json into the theme's locales/en.default.json; do not replace existing translations.\n4. Assign the template to the product, collection or page in Shopify, then select the correct product in each buying section.\n5. Copy and imagery are editable in the theme editor. Uploaded brand images are packaged in assets; image pickers override them.\n6. Real variant prices, availability and selling plans are read from Shopify. Test every variant, quantity, selling plan and cart submission. Test subscription app compatibility and add its app block if it requires one.\n7. Run shopify theme check against the full destination theme and preview at mobile and desktop widths before publishing.\n\nThis download does not publish or modify a live theme. Checkout is managed by Shopify separately. Existing header/footer remain theme-controlled. Rebuilt sections with IDs header/footer (including site-, page-, global- and main- prefixes) are included but disabled by default in the JSON template. To use the rebuilt chrome, first hide the corresponding existing header/footer section groups in the duplicate theme, then enable the rebuilt sections in the theme editor. Review this across every template that shares those groups before publishing. Sections with other names are left unchanged: inspect them for duplicate navigation or footer content. A semantic header element inside a hero is not disabled. Reviews are brand-provided text, not a connected reviews widget.\n\nBrand snapshot: ${run.brand.hash}\nCapture: ${run.evidence?.url || "Created from Brand Brain"}\n`));
    entries.push(textEntry("audit.json", JSON.stringify({ audit: run.audit, coverage: run.coverage, review: run.review, approval: run.approval, storyboard: run.storyboard, quality: run.quality, visualReview: run.visualReview, knowledge: run.knowledge }, null, 2)));
    return zip(entries);
}
