export type HtmlTag = {
    name: string;
    attrs: Record<string, string>;
    text: string;
    start: number;
    end: number;
};
export function decodeHtml(value: string): string {
    const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
    return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (full, code: string) => {
        if (code[0] !== "#")
            return named[code.toLowerCase()] ?? full;
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : "�";
    });
}
export function textContent(value: string): string {
    return decodeHtml(value.replace(/<!--[^]*?-->/g, " ").replace(/<(script|style|template)\b[^>]*>[^]*?<\/\1\s*>/gi, " ").replace(/<[^>]*>/g, " "))
        .replace(/\s+/g, " ").trim();
}
export function tokenizeHtml(html: string): HtmlTag[] {
    const tags: HtmlTag[] = [];
    const token = /<!--[^]*?-->|<![^>]*>|<([a-z][\w:-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
    let match: RegExpExecArray | null;
    while ((match = token.exec(html))) {
        if (!match[1])
            continue;
        const name = match[1].toLowerCase(), attrs: Record<string, string> = {};
        for (const attr of match[2].matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
            const key = attr[1].toLowerCase();
            if (!(key in attrs))
                attrs[key] = decodeHtml(attr[2] ?? attr[3] ?? attr[4] ?? "");
        }
        let text = "", end = token.lastIndex;
        if (/^(script|style|template|title|h[1-6]|a|summary|p|li|dd)$/.test(name)) {
            const close = new RegExp(`<\\/${name}\\s*>`, "ig");
            close.lastIndex = token.lastIndex;
            const closing = close.exec(html);
            if (closing) {
                text = html.slice(token.lastIndex, closing.index);
                end = close.lastIndex;
            }
            if (/^(script|style|template|title)$/.test(name))
                token.lastIndex = end;
        }
        tags.push({ name, attrs, text, start: match.index, end });
    }
    return tags;
}
