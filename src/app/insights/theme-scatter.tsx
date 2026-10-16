"use client";
import { CartesianGrid, Label, ReferenceArea, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, } from "recharts";
import type { ThemeRow } from "@/db/schema";
import { INSIGHT_INFO, INSIGHT_TYPES } from "@/lib/taxonomy";
export function ThemeScatter({ themes, onSelect }: {
    themes: ThemeRow[];
    onSelect: (id: string) => void;
}) {
    const maxF = Math.max(1, ...themes.map((t) => t.frequency));
    const xMid = (maxF + 1) / 2;
    const yMid = 3;
    const byType = INSIGHT_TYPES.map((type) => ({
        type,
        data: themes
            .filter((t) => t.type === type)
            .map((t) => ({ id: t.id, label: t.label, x: t.frequency, y: Number(t.intensity_avg.toFixed(2)), z: t.source_types.length, score: t.score })),
    })).filter((g) => g.data.length);
    return (<div className="rounded-lg border p-4" data-testid="theme-scatter">
      <div className="h-[460px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3"/>
            <ReferenceArea x1={xMid} x2={maxF + 0.5} y1={yMid} y2={5.2} fill="#0d9488" fillOpacity={0.06}>
              <Label value="Lead with these" position="insideTopRight" fill="#0f766e" fontSize={12}/>
            </ReferenceArea>
            <XAxis type="number" dataKey="x" name="Frequency" domain={[0.5, maxF + 0.5]} allowDecimals={false}>
              <Label value="Frequency (distinct items)" position="bottom" offset={4} fontSize={12}/>
            </XAxis>
            <YAxis type="number" dataKey="y" name="Intensity avg" domain={[1, 5.2]} ticks={[1, 2, 3, 4, 5]}>
              <Label value="Intensity avg" angle={-90} position="insideLeft" fontSize={12}/>
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[60, 420]} name="Source types"/>
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => {
            const p = payload?.[0]?.payload as {
                label: string;
                x: number;
                y: number;
                z: number;
                score: number;
            } | undefined;
            if (!p)
                return null;
            return (<div className="rounded-md border bg-popover px-2 py-1.5 text-xs shadow">
                    <div className="font-medium">{p.label}</div>
                    <div>
                      freq {p.x} · intensity {p.y} · {p.z} source types · score {p.score.toFixed(1)}
                    </div>
                  </div>);
        }}/>
            {byType.map((g) => (<Scatter key={g.type} name={g.type} data={g.data} fill={INSIGHT_INFO[g.type].color} fillOpacity={0.75} onClick={(d: {
            id?: string;
            payload?: {
                id: string;
            };
        }) => onSelect(d.payload?.id ?? d.id ?? "")} className="cursor-pointer"/>))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {byType.map((g) => (<span key={g.type} className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full" style={{ background: INSIGHT_INFO[g.type].color }}/>
            {g.type}
          </span>))}
        <span className="text-muted-foreground">· dot size = number of source types</span>
      </div>
    </div>);
}
