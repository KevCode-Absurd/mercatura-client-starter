"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteScanRow } from "@/db/schema";
import { scanStatusAction } from "./actions";
export function useScan(id: string | null, initial: SiteScanRow | null) {
    const [scan, setScan] = useState<SiteScanRow | null>(initial);
    const busy = !!scan && (scan.status === "queued" || scan.status === "running");
    const idRef = useRef(id);
    const router = useRouter();
    const wasBusy = useRef(busy);
    useEffect(() => {
        if (wasBusy.current && !busy)
            router.refresh();
        wasBusy.current = busy;
    }, [busy, router]);
    useEffect(() => {
        idRef.current = id;
        setScan(initial);
    }, [id, initial]);
    useEffect(() => {
        if (!id || !busy)
            return;
        const t = setInterval(async () => {
            const res = await scanStatusAction(id);
            if (res.ok && idRef.current === id)
                setScan(res.scan);
        }, 2500);
        return () => clearInterval(t);
    }, [id, busy]);
    return { scan, busy, setScan };
}
