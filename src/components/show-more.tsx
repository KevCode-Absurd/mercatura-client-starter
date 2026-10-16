"use client";
import { useState } from "react";
export const LIST_PAGE = 30;
export function showMoreLabel(hidden: number, page = LIST_PAGE): string {
    return hidden <= page ? `Show the last ${hidden}` : `Show ${page} more (${hidden} left)`;
}
export function useShowMore<T>(rows: T[], page = LIST_PAGE) {
    const [count, setCount] = useState(page);
    const shown = rows.length > count ? rows.slice(0, count) : rows;
    return { shown, hidden: rows.length - shown.length, more: () => setCount((c) => c + page), page };
}
export function ShowMore({ hidden, page, onMore, className = "mt-3", testId = "show-more" }: {
    hidden: number;
    page?: number;
    onMore: () => void;
    className?: string;
    testId?: string;
}) {
    if (hidden <= 0)
        return null;
    return (<button type="button" onClick={onMore} className={`${className} inline-flex min-h-10 items-center rounded-md border border-primary px-4 text-sm font-semibold text-primary hover:bg-secondary`} data-testid={testId} data-hidden={hidden}>
      {showMoreLabel(hidden, page)}
    </button>);
}
