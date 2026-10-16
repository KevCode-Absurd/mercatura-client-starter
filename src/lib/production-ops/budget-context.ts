import { AsyncLocalStorage } from "node:async_hooks";
type Budget = {
    id: string;
    capUsd: number;
};
const context = new AsyncLocalStorage<Budget>();
export const currentOperationBudget = () => context.getStore();
export function withOperationBudget<T>(budget: Budget, fn: () => Promise<T>): Promise<T> { if (!budget.id || !Number.isFinite(budget.capUsd) || budget.capUsd < 0)
    throw new Error("Invalid operation budget."); const prior = context.getStore(); if (prior && (prior.id !== budget.id || prior.capUsd !== budget.capUsd))
    throw new Error("A nested task cannot replace its authorized operation budget."); return context.run(budget, fn); }
