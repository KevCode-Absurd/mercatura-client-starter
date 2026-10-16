import { activity } from "@/lib/jobs/activity";
export const dynamic = "force-dynamic";
export async function GET() {
    return Response.json(activity());
}
