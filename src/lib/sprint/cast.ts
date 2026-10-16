import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createHash } from "node:crypto";
import type { SprintSlot } from "@/db/schema";
import { readCatalog } from "../avatar-studio/catalog";
import { requestGeneration, runAvatarGeneration } from "../avatar-studio/engine";
import { avatarFile, listAvatars } from "../avatars/store";
import { adoptLibraryAvatar } from "../avatar-studio/adopt";
import { mediaLive } from "../media/providers";
export const castPeople = (castable: number): number => (castable > 0 ? Math.min(castable, 6, Math.max(3, Math.round(castable / 4))) : 0);
export const castPictures = (size: number): number => castPeople(Math.round(size / 2));
export interface CastBrief {
    ages?: [
        number,
        number
    ];
    women?: number;
    from?: "anywhere" | "market";
    people?: string[];
}
export type CastOrder = CastBrief & {
    market?: string;
    personas?: Record<string, {
        gender?: string;
        age?: number | [
            number,
            number
        ];
    }>;
};
export const DEFAULT_CAST_BRIEF: CastBrief = { ages: [18, 30], women: 0.75, from: "market" };
export interface CastWidened {
    origin: number;
    ages: number;
    adults: number;
    gender: number;
}
type LibraryAvatar = ReturnType<typeof readCatalog>["avatars"][number];
type Gender = "Female" | "Male";
type Want = {
    gender?: Gender;
    ages?: [
        number,
        number
    ];
};
type Seat = Want & {
    person?: LibraryAvatar;
};
const inUnitedStates = (market?: string) => /^(usa?|u[.]s[.]a?[.]?|united states)(?![a-z])/i.test((market ?? "").trim());
function castSteps(avatars: readonly LibraryAvatar[], brief: CastBrief, market?: string): {
    step: "fit" | "origin" | "ages" | "adults";
    people: LibraryAvatar[];
}[] {
    const adults = avatars.filter(a => a.tags && a.tags.age >= 18);
    const [lo, hi] = brief.ages ?? [18, Infinity];
    const aged = (by: number) => adults.filter(a => a.tags!.age >= Math.max(18, lo - by) && a.tags!.age <= hi + by);
    const local = brief.from === "market" && inUnitedStates(market);
    return [
        ...(local ? [{ step: "fit" as const, people: aged(0).filter(a => a.tags!.heritage.endsWith("American")) }] : []),
        { step: local ? ("origin" as const) : ("fit" as const), people: aged(0) },
        ...(brief.ages ? [{ step: "ages" as const, people: aged(5) }, { step: "adults" as const, people: adults }] : []),
    ];
}
export function castPool(avatars: readonly LibraryAvatar[], brief: CastBrief, market?: string, needed = 0): {
    pool: LibraryAvatar[];
    widened: ("origin" | "ages" | "adults")[];
} {
    const steps = castSteps(avatars, brief, market);
    const found = steps.findIndex(s => s.people.length >= needed);
    const at = found < 0 ? steps.length - 1 : found;
    return { pool: steps[at].people, widened: steps.slice(1, at + 1).map(s => s.step as "origin" | "ages" | "adults") };
}
export function castWomen(people: number, women: number): number {
    const exact = people * Math.min(1, Math.max(0, women));
    const down = Math.floor(exact);
    const up = Math.ceil(exact);
    const n = exact - down < up - exact ? down : up - exact < exact - down ? up : Math.abs(down - people / 2) < Math.abs(up - people / 2) ? down : up;
    return women > 0 && women < 1 && people >= 2 ? Math.min(people - 1, Math.max(1, n)) : n;
}
export function castGender(said?: string): Gender | undefined {
    const text = said ?? "";
    const woman = /wom[ae]n|female|mothers?|mums?|moms?/i.test(text);
    const man = /(^|[^a-z])(m[ae]n|males?|fathers?|dads?)([^a-z]|$)/i.test(text);
    return woman === man ? undefined : woman ? "Female" : "Male";
}
export function castAges(said?: string): number | [
    number,
    number
] | undefined {
    const text = said ?? "";
    const n = (text.match(/[0-9]+/g) ?? []).map(Number).filter(x => x > 0 && x <= 120);
    if (!n.length)
        return undefined;
    if (n.length >= 2)
        return Math.max(n[0], n[1]) < 18 ? undefined : [Math.max(18, Math.min(n[0], n[1])), Math.max(n[0], n[1])];
    if (/over|above|older|[+]|and up|plus/i.test(text))
        return [Math.max(18, n[0]), 90];
    if (/under|below|younger|up to/i.test(text))
        return n[0] > 18 ? [18, n[0]] : undefined;
    if (/[0-9]0s/i.test(text))
        return n[0] + 9 < 18 ? undefined : [Math.max(18, n[0]), n[0] + 9];
    return n[0] >= 18 ? n[0] : undefined;
}
export function castPersonas(personas: {
    id: string;
    who?: {
        age?: string;
        gender?: string;
    };
}[]): NonNullable<CastOrder["personas"]> {
    return Object.fromEntries(personas.map(p => [p.id, { gender: castGender(p.who?.gender), age: castAges(p.who?.age) }]));
}
export function sprintCastBrief(stored: CastBrief | undefined, market: string | undefined, personas: {
    id: string;
    who?: {
        age?: string;
        gender?: string;
    };
}[] = []): CastOrder {
    return stored ? { ...stored, market } : { ...DEFAULT_CAST_BRIEF, market, personas: castPersonas(personas) };
}
function handPicked(avatars: readonly LibraryAvatar[], brief: CastBrief): LibraryAvatar[] {
    return [...new Set(brief.people ?? [])].slice(0, 6).flatMap(id => avatars.find(a => a.id === id && a.tags) ?? []);
}
function genderOrder(women: number, men: number): Gender[] {
    const out: Gender[] = [];
    let w = women;
    let m = men;
    while (w + m > 0) {
        const next: Gender = !m ? "Female" : !w ? "Male" : w * men > m * women ? "Female" : w * men < m * women ? "Male" : women >= men ? "Female" : "Male";
        out.push(next);
        if (next === "Female")
            w--;
        else
            m--;
    }
    return out;
}
function briefSeats(byHand: LibraryAvatar[], wanted: number, brief: CastBrief): Seat[] {
    const picked = byHand.slice(0, wanted);
    const open = wanted - picked.length;
    if (brief.women === undefined)
        return [...picked.map(person => ({ person })), ...Array.from({ length: open }, () => ({ ages: brief.ages }))];
    const women = castWomen(wanted, brief.women);
    let w = Math.max(0, women - picked.filter(a => a.tags!.gender === "Female").length);
    let m = Math.max(0, wanted - women - picked.filter(a => a.tags!.gender === "Male").length);
    while (w + m > open) {
        if (w >= m)
            w--;
        else
            m--;
    }
    return [...picked.map(person => ({ person })), ...genderOrder(w, m).map(gender => ({ gender, ages: brief.ages }))];
}
function wantOf(persona: string | undefined, brief: CastOrder): Want {
    const p = persona ? brief.personas?.[persona] : undefined;
    const age = p?.age;
    return { gender: castGender(p?.gender), ages: age === undefined ? undefined : typeof age === "number" ? [Math.max(18, age - 3), Math.max(18, age + 3)] : [Math.max(18, age[0]), Math.max(18, age[1])] };
}
function buyerSeats(wants: Want[], wanted: number, brief: CastBrief): Seat[] {
    const kinds = new Map<string, {
        want: Want;
        slots: number;
        seats: number;
    }>();
    for (const want of wants) {
        const key = `${want.gender ?? ""}:${want.ages?.join("-") ?? ""}`;
        const kind = kinds.get(key) ?? { want, slots: 0, seats: 0 };
        kind.slots++;
        kinds.set(key, kind);
    }
    const seats: Want[] = [];
    for (let k = 0; k < wanted && kinds.size; k++) {
        const next = [...kinds.values()].sort((a, b) => b.slots / (b.seats + 1) - a.slots / (a.seats + 1))[0];
        next.seats++;
        seats.push(next.want);
    }
    const open = seats.filter(s => !s.gender).length;
    const dealt = brief.women === undefined ? [] : genderOrder(castWomen(open, brief.women), open - castWomen(open, brief.women));
    return seats.map(s => ({ gender: s.gender ?? dealt.shift(), ages: s.ages ?? brief.ages }));
}
function seated(avatars: readonly LibraryAvatar[], seats: Seat[], brief: CastOrder, ready: string[]): {
    people: LibraryAvatar[];
    widened: CastWidened;
} {
    const isReady = new Set(ready);
    const people: LibraryAvatar[] = [];
    const used = new Set(seats.flatMap(s => (s.person ? [s.person.id] : [])));
    const counts = new Map<string, number>();
    const widened: CastWidened = { origin: 0, ages: 0, adults: 0, gender: 0 };
    const tags = (a: LibraryAvatar) => [a.tags!.gender, a.tags!.ageGroup, a.tags!.skinTone, a.tags!.ethnicity];
    const score = (a: LibraryAvatar) => tags(a).reduce((sum, tag) => sum + (counts.get(tag) ?? 0), 0);
    const take = (a: LibraryAvatar) => { people.push(a); used.add(a.id); for (const tag of tags(a))
        counts.set(tag, (counts.get(tag) ?? 0) + 1); };
    for (const seat of seats) {
        if (seat.person) {
            take(seat.person);
            continue;
        }
        const steps = castSteps(avatars, { ages: seat.ages, from: brief.from }, brief.market);
        const find = (genders: string[] | null) => {
            for (const s of steps) {
                const free = s.people.filter(a => !used.has(a.id) && (!genders || genders.includes(a.tags!.gender))).sort((a, b) => Number(isReady.has(b.id)) - Number(isReady.has(a.id)) || score(a) - score(b) || a.id.localeCompare(b.id));
                if (free.length)
                    return { avatar: free[0], step: s.step };
            }
            return null;
        };
        const own = find(seat.gender ? [seat.gender] : null);
        const found = own ?? find(["Nonbinary"]) ?? find(null);
        if (!found)
            continue;
        if (!own)
            widened.gender++;
        if (found.step !== "fit")
            widened[found.step]++;
        take(found.avatar);
    }
    return { people, widened };
}
function bestFor(want: Want, cast: LibraryAvatar[], given: number[], brief: CastBrief): number {
    const ages = want.ages ?? brief.ages;
    const off = (a: LibraryAvatar) => (want.gender && a.tags!.gender !== want.gender ? 1000 : 0) + (!ages ? 0 : a.tags!.age < ages[0] ? ages[0] - a.tags!.age : a.tags!.age > ages[1] ? a.tags!.age - ages[1] : 0);
    return cast.map((_, i) => i).sort((x, y) => off(cast[x]) - off(cast[y]) || given[x] - given[y] || x - y)[0];
}
export function castNote(brief: CastOrder, widened: CastWidened): string {
    const said = (n: number, how: string) => `${n} ${n === 1 ? "was" : "were"} cast ${how}`;
    const parts = [widened.origin ? said(widened.origin, "from anywhere") : "", widened.ages ? said(widened.ages, "from a wider age range") : "", widened.adults ? said(widened.adults, "from any adult age") : "", widened.gender ? said(widened.gender, "outside the women and men asked for") : ""].filter(Boolean);
    if (!parts.length)
        return "";
    const who = brief.personas && !brief.people?.length ? "people who fit each ad's buyer" : `people${brief.ages ? ` of ${brief.ages[0]} to ${brief.ages[1]}` : ""}`;
    return `Fewer ${who}${brief.from === "market" && inUnitedStates(brief.market) ? " from the United States" : ""} than the sprint needs: ${parts.join(", ")}`;
}
const SAID = new WeakMap<object, string>();
export const castSaid = (cast: object): string => SAID.get(cast) ?? "";
export function castSlots<T extends {
    format: string;
    person?: string;
    world?: string;
    persona?: string;
}>(slots: T[], _earlierIdentities: string[] = [], ready: string[] = [], brief?: CastOrder): (T & Pick<SprintSlot, "casting">)[] {
    const catalog = readCatalog();
    const pool = catalog.avatars.filter(a => a.tags && a.tags.age >= 18);
    const scenes = catalog.aesthetics;
    if (!pool.length || !scenes.length)
        return slots;
    const fits = (slot: T) => !slot.person && ["demo", "pov", "montage", "editorial", "problem"].includes(slot.format) && (!slot.world || ["lifestyle-flags", "bw-accent"].includes(slot.world));
    const castable = slots.filter(fits).length;
    const byHand = brief ? handPicked(pool, brief) : [];
    const wanted = Math.min(Math.max(castPeople(castable), Math.min(byHand.length, castable)), pool.length);
    const followed = brief?.personas && !byHand.length ? slots.filter(fits).map(slot => wantOf(slot.persona, brief)) : null;
    const order = brief ? seated(pool, followed ? buyerSeats(followed, wanted, brief) : briefSeats(byHand, wanted, brief), brief, ready) : null;
    const cast: typeof pool = [];
    const isReady = new Set(ready);
    const used = new Set<string>();
    const counts = new Map<string, number>();
    const score = (a: typeof pool[number]) => [a.tags!.gender, a.tags!.ageGroup, a.tags!.skinTone, a.tags!.ethnicity].reduce((sum, tag) => sum + (counts.get(tag) ?? 0), 0);
    const people: {
        source: string;
        scene: typeof scenes[number];
        description: string;
    }[] = [];
    for (let k = 0; k < wanted; k++) {
        const avatar = order ? order.people[k] : pool.filter(a => !used.has(a.id)).sort((a, b) => Number(isReady.has(b.id)) - Number(isReady.has(a.id)) || score(a) - score(b) || a.id.localeCompare(b.id))[0];
        if (!avatar)
            break;
        cast.push(avatar);
        used.add(avatar.id);
        for (const tag of [avatar.tags!.gender, avatar.tags!.ageGroup, avatar.tags!.skinTone, avatar.tags!.ethnicity])
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
        people.push({ source: avatar.id, scene: scenes[k % scenes.length], description: `${avatar.tags!.gender}, age ${avatar.tags!.age}, ${avatar.tags!.skinTone} skin. Fictional character.` });
    }
    let n = 0;
    const given = people.map(() => 0);
    const out = slots.map(slot => {
        if (!fits(slot) || !people.length)
            return slot;
        const at = followed && brief ? bestFor(wantOf(slot.persona, brief), cast, given, brief) : n++ % people.length;
        given[at]++;
        const { source, scene, description } = people[at];
        return { ...slot, casting: { source, scene: scene.id, description, setting: `${scene.scene}; ${scene.lighting}` } };
    });
    if (brief && order)
        SAID.set(out, castNote(brief, order.widened));
    return out;
}
function libraryIdentities(brandId: string): Map<string, string> {
    const byAvatar = new Map<string, string>();
    for (const row of db.select({ slots: schema.sprints.slots }).from(schema.sprints).where(eq(schema.sprints.brand_id, brandId)).all())
        for (const slot of row.slots)
            if (slot.avatar && slot.casting)
                byAvatar.set(slot.avatar, slot.casting.source);
    for (const a of listAvatars(brandId))
        if (a.library_id)
            byAvatar.set(a.id, a.library_id);
    return byAvatar;
}
export function readyIdentities(brandId: string): string[] {
    const identities = libraryIdentities(brandId);
    return [...new Set(listAvatars(brandId).filter(a => identities.has(a.id) && avatarFile(a.portrait)).map(a => identities.get(a.id)!))];
}
export async function prepareCast(brandId: string, sprintId: string, slots: SprintSlot[], saved: () => void) {
    if (!mediaLive())
        return;
    const people = new Map<string, SprintSlot[]>();
    for (const slot of slots)
        if (slot.casting) {
            const key = `${slot.casting.source}\n${slot.casting.scene}`;
            people.set(key, [...(people.get(key) ?? []), slot]);
        }
    const persons = [...people.values()];
    const workers = await Promise.allSettled(Array.from({ length: 3 }, async (_, worker) => {
        for (const [k, group] of persons.entries()) {
            if (k % 3 !== worker)
                continue;
            const cast = group[0].casting!;
            const onDisk = (id: string | null | undefined) => (id ? avatarFile(listAvatars(brandId).find(a => a.id === id)?.portrait) : null);
            const give = (id: string) => { for (const slot of group)
                if (!onDisk(slot.avatar))
                    slot.avatar = id; saved(); };
            const made = group.find(slot => onDisk(slot.avatar));
            if (made) {
                give(made.avatar!);
                continue;
            }
            const name = `${sprintId} person ${k + 1}`;
            const previous = listAvatars(brandId).find(a => a.name === name);
            if (previous && avatarFile(previous.portrait)) {
                give(previous.id);
                continue;
            }
            const identities = libraryIdentities(brandId);
            const kept = listAvatars(brandId).find(a => identities.get(a.id) === cast.source && avatarFile(a.portrait));
            if (kept) {
                give(kept.id);
                continue;
            }
            const hex = createHash("sha256").update(`${brandId}:${sprintId}:person:${cast.source}:${cast.scene}`).digest("hex");
            const requestId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
            const job = requestGeneration(brandId, { requestId, avatarId: cast.source, aestheticId: cast.scene, note: "Keep this fictional identity, real skin texture and natural asymmetry. Match the scene's light and grain. No product, no added words, no beauty filter." });
            for (const slot of group)
                slot.casting!.job = job.id;
            saved();
            if (job.status !== "completed") {
                const claimed = db.update(schema.jobs).set({ status: "running" }).where(and(eq(schema.jobs.id, job.id), eq(schema.jobs.status, "queued"))).run();
                if (!claimed.changes)
                    throw new Error(`Person ${k + 1} is already running or needs its existing request reviewed: ${job.id}`);
                await runAvatarGeneration(job.id, { strictModel: true });
            }
            const avatar = await adoptLibraryAvatar(brandId, { avatarId: cast.source, generationId: job.id, name, personaId: group[0].persona });
            give(avatar.id);
        }
    }));
    const failure = workers.find(result => result.status === "rejected");
    if (failure?.status === "rejected")
        throw failure.reason;
}
