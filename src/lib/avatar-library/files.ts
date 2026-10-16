import { readFile, rename, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { parseCatalog, serializeCatalog, type AvatarCatalog } from "./index";
export async function readCatalogFile(filePath: string): Promise<AvatarCatalog> {
    return parseCatalog(await readFile(filePath, "utf8"));
}
export async function writeCatalogFile(filePath: string, catalog: AvatarCatalog): Promise<void> {
    const json = serializeCatalog(catalog);
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporaryPath, json, { encoding: "utf8", flag: "wx" });
        await rename(temporaryPath, filePath);
    }
    finally {
        await unlink(temporaryPath).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== "ENOENT")
                throw error;
        });
    }
}
