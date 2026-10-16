export function pollWhileVisible(poll: () => unknown | Promise<unknown>, delay: number, options: {
    immediate?: boolean;
} = {}) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let running = false;
    const visible = () => document.visibilityState !== "hidden";
    const clear = () => { clearTimeout(timer); timer = undefined; };
    const schedule = () => { if (!stopped && visible())
        timer = setTimeout(() => void tick(), delay); };
    async function tick() {
        clear();
        if (stopped || running || !visible())
            return;
        running = true;
        try {
            await poll();
        }
        catch { }
        finally {
            running = false;
            schedule();
        }
    }
    const onVisibility = () => { clear(); if (visible())
        void tick(); };
    document.addEventListener("visibilitychange", onVisibility);
    if (options.immediate)
        void tick();
    else
        schedule();
    return () => { stopped = true; clear(); document.removeEventListener("visibilitychange", onVisibility); };
}
