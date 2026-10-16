const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s: string) => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
export function briefHtml(markdown: string, title: string): string {
    const lines = markdown.split(/\r?\n/);
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const h = line.match(/^(#{1,3})\s+(.*)$/);
        if (h) {
            out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
            i++;
        }
        else if (line.startsWith("|")) {
            const rows: string[][] = [];
            while (i < lines.length && lines[i].startsWith("|")) {
                rows.push(lines[i].slice(1, lines[i].lastIndexOf("|")).split("|").map((c) => c.trim()));
                i++;
            }
            const [head, , ...body] = rows;
            out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
        }
        else if (line.startsWith("- ")) {
            const items: string[] = [];
            while (i < lines.length && lines[i].startsWith("- "))
                items.push(`<li>${inline(lines[i++].slice(2))}</li>`);
            out.push(`<ul>${items.join("")}</ul>`);
        }
        else if (line.trim()) {
            out.push(`<p>${inline(line)}</p>`);
            i++;
        }
        else
            i++;
    }
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.45;color:#1a1a1a;margin:0;padding:24px}
  h1{font-size:20pt;margin:0 0 8px}h2{font-size:13pt;margin:20px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}
  p{margin:4px 0}ul{margin:4px 0 4px 18px;padding:0}li{margin:2px 0}
  table{border-collapse:collapse;width:100%;margin:6px 0;font-size:9.5pt;page-break-inside:auto}
  th,td{border:1px solid #bbb;padding:5px 6px;vertical-align:top;text-align:left}th{background:#f1f1f1}
  tr{page-break-inside:avoid}code{font-family:Consolas,monospace;font-size:9.5pt;background:#f4f4f4;padding:1px 3px}
  </style></head><body>${out.join("\n")}</body></html>`;
}
export async function briefPdf(markdown: string, title: string): Promise<Buffer> {
    const { chromium } = await import("@playwright/test");
    let browser;
    try {
        browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });
    }
    catch {
        browser = await chromium.launch().catch(() => {
            throw new Error("No browser found to print the PDF. Use the markdown export, or run `npx playwright install chromium`.");
        });
    }
    try {
        const page = await browser.newPage();
        await page.setContent(briefHtml(markdown, title), { waitUntil: "load" });
        return await page.pdf({ format: "A4", landscape: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" }, printBackground: true });
    }
    finally {
        await browser.close();
    }
}
