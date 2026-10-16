const SYMBOL: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$", NZD: "NZ$", SGD: "S$", HKD: "HK$", INR: "₹", JPY: "¥", CNY: "¥", CHF: "CHF ", SEK: "kr ", NOK: "kr ", DKK: "kr ", ZAR: "R", AED: "AED ", BRL: "R$", MXN: "MX$" };
const LOCAL: Record<string, string> = { AUD: "$", CAD: "$", NZD: "$", SGD: "$", HKD: "$", MXN: "$" };
export function currencySymbol(code: string | undefined | null, opts: {
    local?: boolean;
} = {}): string {
    const c = (code ?? "").trim().toUpperCase();
    if (!c)
        return "";
    return (opts.local ? LOCAL[c] : undefined) ?? SYMBOL[c] ?? `${c} `;
}
export function formatMoney(n: number, code: string | undefined | null, opts: {
    local?: boolean;
    digits?: number;
} = {}): string {
    if (!Number.isFinite(n))
        return "never";
    return `${n < 0 ? "-" : ""}${currencySymbol(code, opts)}${Math.abs(n).toFixed(opts.digits ?? 2)}`;
}
export const MONEY_WORD = /\b(dollars?|bucks|cents|pounds?|quid|pence|euros?|rupees?|yen|francs?|kronor|krona)\b|[$£€₹¥]/i;
