const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function wrap(text: string, max = 22): string[] {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
        if ((line + " " + word).trim().length > max) {
            if (line)
                lines.push(line);
            line = word;
        }
        else
            line = (line + " " + word).trim();
    }
    if (line)
        lines.push(line);
    return lines.slice(0, 7);
}
export function placeholderSvg(opts: {
    text: string;
    label: string;
    color: string;
    width?: number;
    height?: number;
}) {
    const w = opts.width ?? 1080;
    const h = opts.height ?? 1350;
    const lines = wrap(opts.text);
    const lineH = 84;
    const top = h / 2 - (lines.length * lineH) / 2;
    const tspans = lines
        .map((l, i) => `<tspan x="${w / 2}" y="${top + i * lineH}">${escape(l)}</tspan>`)
        .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${opts.color}"/>
<text font-family="Arial, Helvetica, sans-serif" font-size="68" font-weight="700" fill="#ffffff" text-anchor="middle">${tspans}</text>
<text x="${w / 2}" y="${h - 60}" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#ffffffcc" text-anchor="middle">${escape(opts.label)}</text>
</svg>`;
}
