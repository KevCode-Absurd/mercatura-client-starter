import Link from "next/link";
export default function LearningNotFound() {
    return <div className="mx-auto max-w-2xl px-6 py-16"><h1 className="font-serif text-4xl">Learning page not found</h1><p className="my-4 text-muted-foreground">This category or lesson is not in the current playbook.</p><Link href="/learning" className="text-primary underline">Browse all learning</Link></div>;
}
