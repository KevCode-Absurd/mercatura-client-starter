import { Anton, Inter, Playfair_Display } from "next/font/google";
const sans = Inter({ subsets: ["latin"], display: "swap", preload: false });
const serif = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false });
const tall = Anton({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
export const STOCK_FAMILY: Record<string, string> = {
    "stock:sans": sans.style.fontFamily,
    "stock:serif": serif.style.fontFamily,
    "stock:tall": tall.style.fontFamily,
};
