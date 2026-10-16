import type { Lesson } from "./types";
export const guideMinutes = (lesson: Lesson) => Math.max(3, Math.ceil([lesson.body, lesson.summary, ...lesson.steps].join(" ").split(/\s+/).length / 190));
export const headingId = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
export const guideHeadings = (body: string) => Array.from(body.matchAll(/^## (.+)$/gm), (match) => ({ title: match[1].replace(/[*_`]/g, ""), id: headingId(match[1]) }));
export const guideSummary = (lesson: Lesson) => ({ id: lesson.id, title: lesson.title, summary: lesson.summary, topic: lesson.topic, tags: lesson.tags, minutes: guideMinutes(lesson), effort: lesson.effort });
export type GuideSummary = ReturnType<typeof guideSummary>;
