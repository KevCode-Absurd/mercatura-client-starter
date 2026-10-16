"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreativeKit } from "@/lib/production/kit";
import { buildCreativeKitAction } from "../production/actions";
export function CreativeKitCard({ kit, live, productNames }: {
    kit: CreativeKit | null;
    live: boolean;
    productNames: Record<string, string>;
}) {
    const [pending, start] = useTransition();
    const router = useRouter();
    const build = () => {
        if (kit && !confirm("Rebuild the creative kit from the brand-brain files? The current kit is replaced."))
            return;
        start(async () => {
            const res = await buildCreativeKitAction();
            if (res.ok) {
                toast.success("Creative kit built. Check the colours and product shots.");
                router.refresh();
            }
            else
                toast.error(res.error);
        });
    };
    const list = (title: string, items: string[], tone: string) => items.length > 0 && (<div>
        <div className={`mb-1 font-medium ${tone}`}>{title}</div>
        <ul className="list-disc space-y-0.5 pl-5">
          {items.map((d) => (<li key={d}>{d}</li>))}
        </ul>
      </div>);
    return (<Card className="lg:col-span-2" id="creative-kit" data-testid="creative-kit">
      <CardHeader>
        <CardTitle className="text-base">Creative kit</CardTitle>
        <CardDescription>What production steps use from the brand: copy gets voice, claims and offers; images get colours, type and the product shot; video gets the presenter, setting and style line.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={kit ? "outline" : "default"} onClick={build} disabled={!live || pending} data-testid="build-kit">
            <Sparkles className="size-4"/>
            {pending ? "Building..." : kit ? "Rebuild" : "Build creative kit"}
          </Button>
          <span className="text-xs text-muted-foreground" data-testid="kit-status">
            {!live ? "Needs LLM_MODE=live in .env." : kit ? "Built from the brand-brain files. Rebuild after you change them." : "Not built yet. It is built on the first live production job, or build it now (a few cents)."}
          </span>
        </div>

        {kit && (<>
            {kit.visual.colors.length > 0 && (<div>
                <div className="mb-1 text-xs text-muted-foreground">Colours</div>
                <div className="flex flex-wrap gap-2">
                  {kit.visual.colors.map((c) => (<div key={c.name + c.hex} className="flex items-center gap-2 rounded-md border px-2 py-1" data-testid="kit-color" title={c.use}>
                      <span className="size-5 rounded border" style={{ background: c.hex }}/>
                      <span>
                        {c.name} <span className="font-mono text-xs text-muted-foreground">{c.hex}</span>
                        {c.use && <span className="block text-xs text-muted-foreground">{c.use}</span>}
                      </span>
                    </div>))}
                </div>
              </div>)}
            <dl className="grid gap-x-4 gap-y-2 md:grid-cols-[10rem_1fr]">
              {([
                ["Typography", kit.visual.typography],
                ["Imagery style", kit.visual.imagery_style],
                ["Logo", kit.visual.logo_notes],
                ["Voice direction", kit.voice_direction],
                ["Style line for video", kit.style_line],
            ] as const)
                .filter(([, v]) => v)
                .map(([k, v]) => (<div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd>{v}</dd>
                  </div>))}
            </dl>
            <div className="grid gap-4 md:grid-cols-2">
              {list("Do", kit.visual.do, "text-emerald-700")}
              {list("Avoid", kit.visual.avoid, "text-red-700")}
            </div>
            {kit.products.length > 0 && (<div>
                <div className="mb-1 text-xs text-muted-foreground">Products</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {kit.products.map((p) => (<div key={p.product_id} className="space-y-1 rounded-md border p-2" data-testid="kit-product">
                      <div className="font-medium">{productNames[p.product_id] ?? p.product_id}</div>
                      <div className="text-xs">
                        Product shot: <code>{p.hero_image ? `${p.asset_folder}/${p.hero_image}` : "none found"}</code>
                        {p.extra_images.length > 0 && <span className="text-muted-foreground"> and {p.extra_images.join(", ")}</span>}
                      </div>
                      {p.packaging && <p className="text-xs text-muted-foreground">{p.packaging}</p>}
                      <p className="text-xs text-muted-foreground">
                        On camera: {p.handling === "display" ? "on display only" : p.handling === "hold" ? "held" : "used"}
                        {p.handling_notes ? `. ${p.handling_notes}` : ""}
                      </p>
                    </div>))}
                </div>
              </div>)}
            {kit.presenters.length > 0 && (<div>
                <div className="mb-1 text-xs text-muted-foreground">Presenters</div>
                <ul className="space-y-1 text-xs">
                  {kit.presenters.map((p) => (<li key={p.persona_id}>
                      {[p.gender, p.age, p.look, p.wardrobe].filter(Boolean).join(", ")}. Setting: {p.setting}
                    </li>))}
                </ul>
              </div>)}
          </>)}
      </CardContent>
    </Card>);
}
