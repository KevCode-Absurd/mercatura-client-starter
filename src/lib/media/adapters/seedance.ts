import fs from "node:fs";
import { env } from "../../env";
import { checkpoint } from "../../llm/run-control";
import { ClipFailedError, providerError } from "../errors";
import { publicUrl } from "../storage";
import type { VideoAdapter } from "./types";
const base = () => env.SEEDANCE_BASE_URL.replace(/\/+$/, "");
export const seedance: VideoAdapter = {
    id: "seedance",
    key: "SEEDANCE_API_KEY",
    connected: () => !!env.SEEDANCE_API_KEY,
    problem: () => "",
    async submit(model, req, sending) {
        const payload: Record<string, unknown> = { model: model.id, prompt: req.prompt, duration: req.seconds, resolution: req.resolution, aspect_ratio: req.aspect, public: false };
        payload.images = await Promise.all(req.images.map(publicUrl));
        if (req.referenceVideo)
            payload.reference_video_urls = [await publicUrl(req.referenceVideo)];
        sending();
        const res = await fetch(`${base()}/generate`, { method: "POST", headers: { Authorization: `Bearer ${env.SEEDANCE_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(140000) });
        if (!res.ok)
            throw providerError("Video generation", res.status);
        const taskId = ((await res.json()) as {
            data?: {
                task_id?: string;
            };
        }).data?.task_id;
        if (!taskId)
            throw new Error("Video provider did not return a task id.");
        return { taskId };
    },
    async wait(taskId, out, maxPolls) {
        for (let i = 0; i < maxPolls; i++) {
            checkpoint();
            const res = await fetch(`${base()}/status?task_id=${encodeURIComponent(taskId)}`, { headers: { Authorization: `Bearer ${env.SEEDANCE_API_KEY}` }, signal: AbortSignal.timeout(60000) }).catch(() => null);
            const data = res?.ok ? ((await res.json()) as {
                data?: {
                    status?: string;
                    response?: string[];
                };
            }).data : null;
            if (data?.status === "FAILED")
                throw new ClipFailedError("The video provider reported a failure for this clip.");
            if (data?.status === "SUCCESS" && data.response?.[0]) {
                const video = await fetch(data.response[0], { signal: AbortSignal.timeout(180000) });
                if (!video.ok)
                    throw new Error(`Could not download the generated clip (HTTP ${video.status}).`);
                fs.writeFileSync(out, Buffer.from(await video.arrayBuffer()));
                return;
            }
            await new Promise((r) => setTimeout(r, 12000));
        }
        throw new Error("The clip is still rendering. Resume the job to keep waiting; it won't be billed twice.");
    },
};
