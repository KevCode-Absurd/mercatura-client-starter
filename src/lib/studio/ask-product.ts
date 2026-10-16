const plain = (s: string) => s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const PRODUCT_WORDS = ["product", "products", "pack", "packs", "packet", "packets", "pouch", "pouches", "packaging", "package"];
const TAKES_OUT = /\b(remove|without|take (it|them|that|the \w+) (out|away|off)|get rid of|no (product|pack|packet|pouch|packaging)|hide|delete)\b/;
export interface ProductNames {
    brand: string;
    product?: string;
}
export function asksForProduct(note: string, names: ProductNames): boolean {
    const said = ` ${plain(note)} `;
    if (said.trim().length < 3 || TAKES_OUT.test(said))
        return false;
    const brand = plain(names.brand);
    const own = plain(names.product ?? "")
        .split(" ")
        .filter((w) => w.length >= 5 && !brand.split(" ").includes(w));
    if (brand.length >= 3 && said.includes(` ${brand}`))
        return true;
    if (own.length && own.every((w) => said.includes(` ${w} `)))
        return true;
    return PRODUCT_WORDS.some((w) => said.includes(` ${w} `));
}
