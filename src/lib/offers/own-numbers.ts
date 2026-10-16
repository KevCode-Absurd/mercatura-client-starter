import type { Economics } from "./economics";
type Flags = Pick<Economics, "simulated" | "costs_entered" | "history_entered">;
export function simulatedLead(e: Flags): string {
    if (e.costs_entered && e.history_entered)
        return "The costs and the record of past sales are the brand's own. The order values and the repeat rate on this screen are still simulated";
    if (e.costs_entered)
        return "The costs are the brand's own. The order values, the repeat rate and the record of past sales on this screen are still simulated";
    if (e.history_entered)
        return "The record of past sales is the brand's own. The costs, the order values and the repeat rate on this screen are still simulated";
    return "The costs, order values and sales history on this screen are simulated";
}
export function sourceNote(e: Flags, today: string): string {
    if (!e.simulated)
        return `Entered on the Offers screen, ${today}.`;
    if (e.costs_entered && e.history_entered)
        return `Costs and past sales entered on the Offers screen, ${today}. Order values and repeat rate are still simulated.`;
    if (e.history_entered)
        return `Past sales entered on the Offers screen, ${today}. Costs, order values and repeat rate are still simulated.`;
    return `Costs entered on the Offers screen, ${today}. Order values, repeat rate and past sales are still simulated.`;
}
