export const MAX_ROOM = 32000;
export const cutForLength = (error: string | null | undefined): boolean => !!error && /hit max_tokens|stopped early \((MAX_TOKENS|incomplete|length)\)/.test(error);
export const moreRoom = (room: number): number => Math.max(room, Math.min(Math.max(room, 1) * 2, MAX_ROOM));
