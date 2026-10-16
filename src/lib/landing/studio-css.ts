export function scopeSectionCss(css: string, scope: string, ids: Record<string, string> = {}): string {
    if (!/^#[a-zA-Z][\w-]*$/.test(scope))
        throw new Error("Invalid CSS scope.");
    if (/\{[%{]/.test(css))
        throw new Error("Liquid is not allowed in generated CSS.");
    const animationNames = new Map<string, string>();
    const blocks = (source: string): {
        head: string;
        body: string;
    }[] => {
        const output: {
            head: string;
            body: string;
        }[] = [];
        let start = 0, open = -1, depth = 0, quote = "", comment = false;
        for (let i = 0; i < source.length; i++) {
            const c = source[i], next = source[i + 1];
            if (comment) {
                if (c === "*" && next === "/") {
                    comment = false;
                    i++;
                }
                continue;
            }
            if (quote) {
                if (c === "\\")
                    i++;
                else if (c === quote)
                    quote = "";
                continue;
            }
            if (c === "/" && next === "*") {
                comment = true;
                i++;
                continue;
            }
            if (c === '"' || c === "'") {
                quote = c;
                continue;
            }
            if (c === "{") {
                if (!depth)
                    open = i;
                depth++;
            }
            else if (c === "}") {
                if (--depth < 0)
                    throw new Error("Malformed section CSS.");
                if (!depth) {
                    output.push({ head: source.slice(start, open).replace(/\/\*[\s\S]*?\*\//g, "").trim(), body: source.slice(open + 1, i) });
                    start = i + 1;
                }
            }
        }
        if (depth || quote || comment || source.slice(start).replace(/\/\*[\s\S]*?\*\//g, "").trim())
            throw new Error("Malformed section CSS.");
        return output;
    };
    const selectors = (head: string): string[] => {
        const result: string[] = [];
        let start = 0, depth = 0, quote = "";
        for (let i = 0; i < head.length; i++) {
            const c = head[i];
            if (quote) {
                if (c === "\\")
                    i++;
                else if (c === quote)
                    quote = "";
                continue;
            }
            if (c === '"' || c === "'")
                quote = c;
            else if (c === "(" || c === "[")
                depth++;
            else if (c === ")" || c === "]")
                depth--;
            else if (c === "," && !depth) {
                result.push(head.slice(start, i).trim());
                start = i + 1;
            }
        }
        result.push(head.slice(start).trim());
        if (depth || quote || result.some(x => !x || x.includes("&")))
            throw new Error("Use flat selectors in section CSS.");
        return result;
    };
    const gather = (source: string) => {
        for (const b of blocks(source)) {
            const key = b.head.match(/^@(?:-webkit-)?keyframes\s+([a-zA-Z_][\w-]*)$/i);
            if (key)
                animationNames.set(key[1], `${scope.slice(1)}-${key[1]}`);
            else if (/^@(media|supports|container)\b/i.test(b.head))
                gather(b.body);
        }
    };
    gather(css);
    const declarations = (body: string) => {
        if (/[{}]/.test(body.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "")))
            throw new Error("Nested section CSS is not supported.");
        return body.replace(/((?:^|;)\s*(?:-webkit-)?animation(?:-name)?\s*:)([^;]*)/gi, (_, property: string, value: string) => `${property}${value.replace(/[a-zA-Z_][\w-]*/g, name => animationNames.get(name) ?? name)}`);
    };
    const compile = (source: string): string => blocks(source).map(b => {
        const key = b.head.match(/^(@(?:-webkit-)?keyframes)\s+([a-zA-Z_][\w-]*)$/i);
        if (key)
            return `${key[1]} ${animationNames.get(key[2])}{${blocks(b.body).map(frame => { if (!/^(?:from|to|\d+(?:\.\d+)?%)(?:\s*,\s*(?:from|to|\d+(?:\.\d+)?%))*$/i.test(frame.head))
                throw new Error("Invalid keyframe selector."); return `${frame.head}{${declarations(frame.body)}}`; }).join("")}}`;
        if (/^@(media|supports|container)\b/i.test(b.head))
            return `${b.head}{${compile(b.body)}}`;
        if (b.head.startsWith("@"))
            throw new Error("Unsupported exported CSS rule.");
        const scoped = selectors(b.head).flatMap(selector => {
            const normalized = selector.replace(/#([\w-]+)/g, (full, id: string) => ids[id] ? `#${ids[id]}` : full).replace(/(^|[\s>+~,(])(?:html|body|:root)(?=$|[\s>+~.#:[),])/g, `$1${scope}`).replace(new RegExp(`${scope}\\s+${scope}(?=$|[\\s>+~.#:[),])`, "g"), scope);
            const pseudo = normalized.match(/(::[a-z-]+(?:\([^)]*\))?)$/i)?.[0] ?? "";
            const base = (pseudo ? normalized.slice(0, -pseudo.length) : normalized).trim() || "*";
            return [`${scope}:is(${base})${pseudo}`, `${scope} :is(${base})${pseudo}`];
        });
        return `${scoped.join(",")}{${declarations(b.body)}}`;
    }).join("\n");
    return compile(css);
}
