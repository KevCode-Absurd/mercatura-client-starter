import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { env } from "../env";
import { OpenerSchema, type Opener } from "./bank-info";
export * from "./bank-info";
const BankFile = z.object({ openers: z.array(OpenerSchema) });
let cached: {
    at: number;
    openers: Opener[];
} | null = null;
export function loadBank(root: string = env.SKILLS_DIR): Opener[] {
    const file = path.join(root, "hook-bank", "bank.json");
    if (!fs.existsSync(file))
        return [];
    const at = fs.statSync(file).mtimeMs;
    if (cached?.at === at && root === env.SKILLS_DIR)
        return cached.openers;
    const openers = BankFile.parse(JSON.parse(fs.readFileSync(file, "utf-8"))).openers;
    if (root === env.SKILLS_DIR)
        cached = { at, openers };
    return openers;
}
