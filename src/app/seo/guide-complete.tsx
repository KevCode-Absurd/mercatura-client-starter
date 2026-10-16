"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeSeoLessonAction } from "./actions";
export function SeoGuideComplete({ brandId, guideId, initiallyRead }: {
    brandId: string;
    guideId: string;
    initiallyRead: boolean;
}) {
    const [read, setRead] = useState(initiallyRead);
    const [pending, start] = useTransition();
    const router = useRouter();
    return <Button disabled={pending} onClick={() => start(async () => {
            try {
                const result = await completeSeoLessonAction(brandId, guideId);
                if (!result.ok) {
                    toast.error(result.error);
                    return;
                }
                setRead(!read);
                router.refresh();
            }
            catch {
                toast.error("Could not save reading progress. Please try again.");
            }
        })}>{read && <Check className="size-4"/>}{pending ? "Saving…" : read ? "Mark as unread" : "Mark as read"}</Button>;
}
