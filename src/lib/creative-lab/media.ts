export function mediaChoices<T extends {
    url: string;
    kind: "image" | "video";
}>(items: T[], limit = 200): T[] {
    const unique = [...new Map(items.map(item => [item.url, item])).values()];
    const videos = unique.filter(item => item.kind === "video"), images = unique.filter(item => item.kind === "image");
    const videoCount = Math.min(videos.length, Math.max(1, Math.floor(limit / 4)));
    const chosen = [...videos.slice(0, videoCount), ...images.slice(0, Math.max(0, limit - videoCount))];
    return [...chosen, ...videos.slice(videoCount, videoCount + Math.max(0, limit - chosen.length))].slice(0, limit);
}
