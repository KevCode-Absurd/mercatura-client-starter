import fs from "node:fs";
import path from "node:path";
import { renderDecisionsDoc } from "./doc";
const file = path.resolve("docs", "TASTE-DECISIONS.md");
fs.writeFileSync(file, renderDecisionsDoc(), "utf-8");
console.log(`Wrote ${file}`);
