import fs from "node:fs";
import path from "node:path";
import { craftFor } from "./skills/craft";
import { sellingFor } from "./skills/selling";
const PROMPTS_DIR = path.join(process.cwd(), "prompts");
export function renderPrompt(name: string, vars: Record<string, string>): {
    system: string;
    user: string;
} {
    const raw = fs.readFileSync(path.join(PROMPTS_DIR, `${name}.md`), "utf-8").replace(/^<!--[\s\S]*?-->\s*/, "");
    const [sys, user = ""] = raw.split(/^=== USER ===\s*$/m);
    const fill = (s: string) => s.replace(/\{([a-z_]+)\}/g, (m, key: string) => {
        if (key === "copy_craft" && !(key in vars))
            return craftFor(name);
        if (key === "selling_principles" && !(key in vars))
            return sellingFor(name);
        if (!(key in vars))
            throw new Error(`Prompt ${name} needs {${key}}`);
        return vars[key];
    });
    const tidy = (s: string) => fill(s).replace(/\r\n?/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
    return { system: tidy(sys), user: tidy(user) };
}
