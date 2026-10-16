import { inspirationBrands } from "@/lib/landing/inspiration";
export async function GET() { return Response.json({ brands: inspirationBrands() }, { headers: { "cache-control": "no-store" } }); }
