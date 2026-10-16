import { syncBrandsFromDisk } from "@/lib/brands";

// Existing operator-created folders may be registered; no demo or brand is created.
const brands = syncBrandsFromDisk();
console.log(`Registered ${brands.length} existing client folders. No demonstration data was inserted.`);
