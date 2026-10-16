"use client";
import { Button } from "@/components/ui/button";
export default function LearningError({ retry }: {
    error: Error;
    retry: () => void;
}) {
    return <div className="mx-auto max-w-2xl px-6 py-16"><h1 className="font-serif text-3xl">Learning could not be loaded</h1><p className="my-4 text-muted-foreground">Please try again. Your saved progress and plans are unchanged.</p><Button onClick={retry}>Try again</Button></div>;
}
