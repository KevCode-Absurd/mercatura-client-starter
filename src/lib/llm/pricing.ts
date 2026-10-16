export interface ModelPrice {
    input: number;
    output: number;
    cacheRead: number;
}
interface LongPrompt {
    over: number;
    price: ModelPrice;
}
const PRICES: {
    match: RegExp;
    price: ModelPrice;
    long?: LongPrompt;
}[] = [
    { match: /^claude-opus-5-5/, price: { input: 4, output: 20, cacheRead: 0.2 } },
    { match: /^claude-sonnet-5-5/, price: { input: 2, output: 10, cacheRead: 0.1 } },
    { match: /^claude-haiku-5-5/, price: { input: 0.1, output: 0.5, cacheRead: 0.01 }, long: { over: 100000, price: { input: 0.5, output: 2.5, cacheRead: 0.05 } } },
    { match: /^claude-haiku-4-5/, price: { input: 1, output: 5, cacheRead: 0.1 } },
    { match: /^claude-fable-5-1/, price: { input: 10, output: 50, cacheRead: 0.25 } },
    { match: /^claude-fable-5/, price: { input: 10, output: 50, cacheRead: 1 } },
    { match: /^gemini-3\.1-pro/, price: { input: 2, output: 12, cacheRead: 0.2 } },
    { match: /^gemini-3\.8-flash/, price: { input: 0.75, output: 3.75, cacheRead: 0.075 } },
    { match: /^gemini-3\.5-flash-lite/, price: { input: 0.3, output: 2.5, cacheRead: 0.03 } },
    { match: /^gemini-3\.1-flash-lite/, price: { input: 0.25, output: 1.5, cacheRead: 0.025 } },
    { match: /^gpt-6\.1-sol/, price: { input: 2, output: 10, cacheRead: 0.1 } },
    { match: /^gpt-6-sol/, price: { input: 2, output: 10, cacheRead: 0.2 } },
    { match: /^gpt-6-luna/, price: { input: 0.1, output: 0.5, cacheRead: 0.01 } },
    { match: /^gpt-6-astra/, price: { input: 10, output: 50, cacheRead: 1 } },
    { match: /^deepseek-flash/, price: { input: 0.3, output: 1.2, cacheRead: 0.006 } },
    { match: /^deepseek-v4-pro/, price: { input: 1.32, output: 3.96, cacheRead: 0.044 } },
];
export const hasPrice = (model: string) => PRICES.some((p) => p.match.test(model));
export function priceFor(model: string, promptTokens = 0): ModelPrice {
    const hit = PRICES.find((p) => p.match.test(model));
    if (hit?.long && promptTokens > hit.long.over)
        return hit.long.price;
    return hit?.price ?? { input: 5, output: 25, cacheRead: 0.5 };
}
export function costUsd(model: string, u: {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
}): number {
    const p = priceFor(model, u.input_tokens + u.cache_read_tokens + u.cache_write_tokens);
    return ((u.input_tokens * p.input +
        u.cache_write_tokens * p.input * 1.25 +
        u.cache_read_tokens * p.cacheRead +
        u.output_tokens * p.output) /
        1000000);
}
