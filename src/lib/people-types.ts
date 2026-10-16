export const PERSON_ROLES = ["founder", "customer", "expert", "team"] as const;
export type PersonRole = (typeof PERSON_ROLES)[number];
export const ROLE_LABEL: Record<PersonRole, string> = { founder: "Founder", customer: "Customer", expert: "Expert", team: "Team member" };
export interface BrandPerson {
    id: string;
    name: string;
    role: PersonRole;
    kind: "image" | "video";
    file: string;
    still: string;
    note: string;
    consent: boolean;
    added_at: string;
}
