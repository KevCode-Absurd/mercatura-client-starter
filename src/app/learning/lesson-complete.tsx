"use client";
import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeLearningLesson } from "./actions";
export function LessonComplete({ brandId, category, lessonId, initialCompleted }: {
    brandId: string;
    category: string;
    lessonId: string;
    initialCompleted: boolean;
}) {
    const [completed, setCompleted] = useState(initialCompleted);
    const [error, setError] = useState("");
    const [pending, start] = useTransition();
    return <div><Button variant={completed ? "outline" : "default"} aria-pressed={completed} disabled={pending} onClick={() => start(async () => {
            setError("");
            try {
                const result = await completeLearningLesson(category, lessonId, !completed, brandId);
                if (result.error)
                    setError(result.error);
                else
                    setCompleted(!completed);
            }
            catch {
                setError("Progress could not be saved. Please try again.");
            }
        })}>{pending ? <Loader2 className="size-4 animate-spin"/> : <Check className="size-4"/>}{completed ? "Completed · mark unread" : "Mark lesson complete"}</Button>{error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</div>;
}
