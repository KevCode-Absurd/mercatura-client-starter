"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import type { Economics } from "@/lib/offers/economics";
import { saveSalesRecord } from "@/lib/offers/sales-record";
import { errorText } from "@/lib/plain-message";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
export async function saveSalesRecordAction(rows: {
    discount: number;
    units: number;
    roas_lift: number;
}[]): Promise<Result<{
    economics: Economics;
}>> {
    try {
        const economics = saveSalesRecord(await activeBrandId(), rows);
        revalidatePath("/offers");
        return { ok: true, economics };
    }
    catch (e) {
        return { ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check the rows.") : errorText(e) };
    }
}
