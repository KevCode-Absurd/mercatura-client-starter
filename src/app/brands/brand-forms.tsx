"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { addBrandAction, rescanBrandsAction, setActiveBrandAction, archiveBrandAction, restoreBrandAction } from "@/app/brand-actions";
import { Button } from "@/components/ui/button";
import { useAdvanced } from "@/components/mode";
import { Input } from "@/components/ui/input";
export function AddBrandForm() {
    const [name, setName] = useState("");
    const [pending, start] = useTransition();
    const router = useRouter();
    const advanced = useAdvanced();
    return (<form className="flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
                const res = await addBrandAction(name);
                if (res.ok) {
                    toast.success(advanced ? `Added ${name}. Now put its brand-brain files in brands/${res.id}/brand-brain/.` : `Added ${name}. Now tell the app about it.`);
                    setName("");
                    router.push("/brand");
                }
                else
                    toast.error(res.error);
            });
        }}>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand name" aria-label="Brand name"/>
      <Button type="submit" disabled={pending || name.trim().length < 2}>
        Add
      </Button>
    </form>);
}
export function BrandRowActions({ id, name, isActive, canRemove }: {
    id: string;
    name: string;
    isActive: boolean;
    canRemove: boolean;
}) {
    const [pending, start] = useTransition();
    const router = useRouter();
    return (<div className="flex flex-wrap items-center gap-2">
      {!isActive && (<Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => {
                await setActiveBrandAction(id);
                router.push("/");
            })}>
          Switch to this brand
        </Button>)}
      {canRemove && (<Button size="sm" variant="ghost" className="text-red-700 hover:text-red-800" disabled={pending} onClick={() => {
                if (!confirm(`Remove ${name} from the list? Nothing is deleted: its folder, research and work are kept, and it can be restored from this screen.`))
                    return;
                start(async () => {
                    const res = await archiveBrandAction(id);
                    if (!res.ok)
                        return void toast.error(res.error);
                    toast.success(`${name} removed from the list.`);
                    router.refresh();
                });
            }} data-testid={`remove-brand-${id}`}>
          Remove
        </Button>)}
    </div>);
}
export function RestoreBrandButton({ id, name }: {
    id: string;
    name: string;
}) {
    const [pending, start] = useTransition();
    const router = useRouter();
    return (<Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => {
            const res = await restoreBrandAction(id);
            if (!res.ok)
                return void toast.error(res.error);
            toast.success(`${name} is back on the list.`);
            router.refresh();
        })} data-testid={`restore-brand-${id}`}>
      Restore
    </Button>);
}
export function RescanButton() {
    const [pending, start] = useTransition();
    const router = useRouter();
    return (<Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => {
            await rescanBrandsAction();
            router.refresh();
            toast.success("Rescanned brands/ for new brand folders.");
        })}>
      <RefreshCw className="size-4"/>
      Rescan brands folder
    </Button>);
}
