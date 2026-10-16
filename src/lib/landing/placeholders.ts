import fs from "node:fs";
import path from "node:path";
const PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#e9e6df"/><text x="50%" y="50%" font-family="sans-serif" font-size="28" fill="#8a8578" text-anchor="middle" dominant-baseline="middle">picture not in the library</text></svg>');
export function withPlaceholders(html: string, dir: string): string {
    return html.replace(/(<(?:img|source|video)\b[^>]*?\s(?:src|poster)=")([^"]+)(")/gi, (all, before: string, src: string, after: string) => {
        if (/^(data:|https?:|\/\/)/i.test(src) || !/\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i.test(src))
            return all;
        const file = path.resolve(dir, decodeURIComponent(src.split(/[?#]/)[0]));
        return fs.existsSync(file) ? all : `${before}${PLACEHOLDER}${after}`;
    });
}
