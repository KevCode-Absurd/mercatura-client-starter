import { PageHeader } from "@/components/bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activeBrandId } from "@/lib/brand-context";
import { brandFolderStatus, listArchivedBrands, listBrands } from "@/lib/brands";
import { listSampleFiles } from "@/lib/import/samples";
import { getCounts } from "@/lib/queries";
import { isAdvanced } from "@/lib/ui-mode-server";
import { AddBrandForm, BrandRowActions, RescanButton, RestoreBrandButton } from "./brand-forms";
export default async function BrandsPage() {
    const active = await activeBrandId();
    const advanced = await isAdvanced("brand");
    const brands = listBrands().map((b) => ({
        ...b,
        folder: brandFolderStatus(b),
        counts: getCounts(b.id),
        samples: listSampleFiles(b.id).reduce((n, s) => n + s.files.length, 0),
    }));
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Brands" subtitle="Every brand has its own brand brain, research, offers and work. Switch between them here or from the menu at the top left.">
        {advanced && <RescanButton />}
      </PageHeader>
      <div className="grid gap-4 p-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-3">
          {brands.map((b) => (<Card key={b.id} className={b.id === active ? "border-primary/50" : ""} data-testid="brand-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>
                    {b.name} {b.is_demo && <span className="font-normal text-muted-foreground">· demo</span>}
                    {b.id === active && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">active</span>}
                  </span>
                  {advanced && <code className="text-xs font-normal text-muted-foreground">brands/{b.dir}/</code>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {advanced ? (<div className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
                  <span>
                    brand.json: <span className={b.folder.brandJson === "ok" ? "text-emerald-700" : "text-red-700"}>{b.folder.brandJson}</span>
                  </span>
                  <span>{b.folder.markdownFiles.length} brand-brain files</span>
                  <span>{b.counts.items} source items</span>
                  <span>{b.counts.insights} insights</span>
                  <span>{b.counts.themes} themes</span>
                  <span>{b.samples} sample-data files</span>
                </div>) : (<div className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
                    <span className={b.folder.brandJson === "ok" ? "" : "text-amber-700"}>{b.folder.brandJson === "ok" ? "Brand brain built" : "No brand brain yet"}</span>
                    <span>{b.counts.items} source items</span>
                    <span>{b.counts.insights} insights</span>
                    <span>{b.counts.themes} themes</span>
                  </div>)}
                <BrandRowActions id={b.id} name={b.name} isActive={b.id === active} canRemove={brands.length > 1}/>
              </CardContent>
            </Card>))}
          {listArchivedBrands().length > 0 && (<div className="rounded-lg border border-dashed p-3 text-sm" data-testid="archived-brands">
              <div className="mb-2 font-medium">Removed from the list</div>
              <ul className="space-y-1.5">
                {listArchivedBrands().map((b) => (<li key={b.id} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{b.name}</span>
                    <RestoreBrandButton id={b.id} name={b.name}/>
                  </li>))}
              </ul>
            </div>)}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Add a brand</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <AddBrandForm />
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Add the brand here. You are taken to its Brand brain screen.</li>
              <li>Give the app the brand: its website address, anything you have written down, or the founder&apos;s answers. Then press Build.</li>
              <li>Read the brand brain through and correct it: products, prices and every claim.</li>
              <li>The dashboard then shows the next step, one at a time, until the first ads are made.</li>
            </ol>
            {advanced && <p className="text-xs text-muted-foreground">Already have a brand folder? Copy it into brands/ and press Rescan.</p>}
          </CardContent>
        </Card>
      </div>
    </div>);
}
