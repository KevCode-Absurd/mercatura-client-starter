"use client";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { BrandOffer } from "@/lib/offers/book";
import { MECHANIC_CHOICE } from "@/lib/offers/path";
import { offerBookAction, removeInUseOfferAction, saveInUseOfferAction } from "./book-actions";
import { PartChips } from "./offer-path";
interface Draft {
    id?: string;
    name: string;
    price: string;
    terms: string;
    say: string;
    running: boolean;
    locked: boolean;
}
const FROM: Record<BrandOffer["source"], string> = { price: "A price you set", design: "From a design below", builder: "Written for the Script builder" };
export function InUse({ initial, sym, refreshKey }: {
    initial: BrandOffer[];
    sym: string;
    refreshKey: unknown;
}) {
    const [book, setBook] = useState(initial);
    useEffect(() => setBook(initial), [initial]);
    const [editing, setEditing] = useState<Draft | null>(null);
    const [pending, start] = useTransition();
    useEffect(() => {
        void offerBookAction().then((r) => r.ok && setBook(r.book));
    }, [refreshKey]);
    const save = () => editing &&
        start(async () => {
            const res = await saveInUseOfferAction({ id: editing.id, name: editing.name, price: Number(editing.price), terms: editing.terms, say: editing.say, running: editing.running });
            if (!res.ok)
                return void toast.error(res.error);
            setBook(res.book);
            setEditing(null);
            toast.success("Saved.");
        });
    const remove = (o: BrandOffer) => confirm(`Take "${o.name}" out of use? Writers will no longer state it.`) &&
        start(async () => {
            const res = await removeInUseOfferAction(o.id);
            if (!res.ok)
                return void toast.error(res.error);
            setBook(res.book);
            toast.success("Taken out of use.");
        });
    return (<section data-testid="offers-in-use">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h2 className="display text-3xl">Offers in use</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">The offers you can pick when you make a script or an ad. Each deal is listed once. An ad can also be made with no offer.</p>
        </div>
        <Button size="sm" variant="outline" className="ml-auto" disabled={pending} onClick={() => setEditing({ name: "", price: "", terms: "", say: "", running: true, locked: false })} data-testid="add-in-use">
          <Plus className="size-3.5"/>
          Add an offer
        </Button>
      </div>
      {book.length === 0 ? (<p className="mt-6 rounded-lg border border-dashed p-6 text-sm text-muted-foreground" data-testid="in-use-empty">
          No offer is in use. Scripts and ads can still be planned and written: they make no offer until you add one.
        </p>) : (<div className="mt-6 divide-y overflow-hidden rounded-xl border bg-card">
          {book.map((o) => (<div key={o.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-4 max-md:px-4" data-testid={`in-use-${o.id}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold">{o.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {sym}
                    {o.price}
                  </span>
                  <Badge variant="outline" className={o.running ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "text-muted-foreground"}>{o.running ? "Running today" : "Not running yet"}</Badge>
                  {o.mechanic && <Badge variant="outline">{MECHANIC_CHOICE[o.mechanic].label}</Badge>}
                  <span className="text-xs text-muted-foreground">{o.mechanic ? "Built on this screen" : FROM[o.source]}</span>
                </div>
                {o.objection && <p className="mt-1 text-xs text-muted-foreground">Answers: &ldquo;{o.objection}&rdquo;</p>}
                {o.say ? <p className="mt-2 text-[15px]">&ldquo;{o.say}&rdquo;</p> : <p className="mt-1 text-sm text-amber-800">No line to say yet. Add one so writers know how a person would put it.</p>}
                {o.terms && <p className="mt-1 max-w-4xl text-[13px] leading-relaxed text-muted-foreground">{o.terms}</p>}
                <PartChips o={o}/>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => setEditing({ id: o.id, name: o.name, price: String(o.price), terms: o.terms, say: o.say, running: o.running, locked: o.source === "design" })} data-testid={`edit-in-use-${o.id}`}>
                  <Pencil className="size-3.5"/>
                  Edit
                </Button>
                {o.source !== "design" && (<Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(o)} aria-label={`Take ${o.name} out of use`} data-testid={`remove-in-use-${o.id}`}>
                    <Trash2 className="size-3.5"/>
                  </Button>)}
              </div>
            </div>))}
        </div>)}

      {editing && (<Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="sm:max-w-xl" data-testid="in-use-editor">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Change this offer" : "Add an offer"}</DialogTitle>
              <DialogDescription>{editing.locked ? "This offer comes from a design. Change its name, price and terms in the design. How it is said is saved here." : "What the buyer gets and pays, and how a person would say it."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Name</Label>
                  <Input value={editing.name} disabled={editing.locked} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="First order" data-testid="in-use-name"/>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Price ({sym})</Label>
                  <Input type="number" step="0.01" min={0} value={editing.price} disabled={editing.locked} onChange={(e) => setEditing({ ...editing, price: e.target.value })} data-testid="in-use-price"/>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">What the buyer gets and pays</Label>
                <Textarea rows={3} value={editing.terms} disabled={editing.locked} onChange={(e) => setEditing({ ...editing, terms: e.target.value })} data-testid="in-use-terms"/>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">How a person would say it</Label>
                <Textarea rows={2} value={editing.say} onChange={(e) => setEditing({ ...editing, say: e.target.value })} placeholder="1 sentence, the way you would tell a friend." data-testid="in-use-say"/>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={editing.running} onCheckedChange={(v) => setEditing({ ...editing, running: v })} data-testid="in-use-running"/>
                The brand runs this offer today
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button disabled={pending} onClick={save} data-testid="in-use-save">
                {pending && <Loader2 className="size-4 animate-spin"/>}
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>)}
    </section>);
}
