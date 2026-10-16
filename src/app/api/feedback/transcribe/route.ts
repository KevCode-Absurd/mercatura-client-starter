import { activeBrandId } from "@/lib/brand-context";
import { MAX_AUDIO_BYTES, transcribeAnswer } from "@/lib/founder-transcribe";
export async function POST(req: Request) {
    const live = new URL(req.url).searchParams.has("live");
    const audio = Buffer.from(await req.arrayBuffer());
    if (audio.length > MAX_AUDIO_BYTES)
        return Response.json({ ok: false, error: "That recording is too long. Keep a voice note under about 10 minutes." }, { status: 413 });
    try {
        const text = await transcribeAnswer({
            brandId: await activeBrandId(),
            questionId: "feedback",
            question: "",
            audio,
            mime: req.headers.get("content-type") ?? "",
            task: live ? "feedback_transcribe_live" : "feedback_transcribe",
            live,
        });
        return Response.json({ ok: true, text });
    }
    catch (e) {
        return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
    }
}
