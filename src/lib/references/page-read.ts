import { referenceCardRows } from "./cards";
import type { BrandFit } from "./for-brand";
import { buildFacts, cleanFilter, listReferences, PAGE, type ReferenceFilter, type ReferencePage } from "./page";
export function referencePage(filter: Partial<ReferenceFilter>, offset: number, fit: BrandFit, limit = PAGE): ReferencePage {
    return listReferences(buildFacts(referenceCardRows(), fit), cleanFilter(filter), offset, limit);
}
