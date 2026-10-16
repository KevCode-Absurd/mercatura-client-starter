import { env } from "../../env";
import { MediaDisabledError } from "../errors";
import type { VideoAdapter } from "./types";
export const higgsfieldProblem = (name: string, hasKey: boolean): string => hasKey
    ? `${name} is not connected yet: a Higgsfield key is set, but the app's own calls to Higgsfield are not built. Make the clips from the prompt pack on this job (every reference tagged), or choose another video model in Settings to make them here.`
    : `${name} is not connected yet: it runs through Higgsfield, and no key for it is connected. Make the clips from the prompt pack on this job (every reference tagged), or choose another video model in Settings to make them here.`;
export const higgsfield: VideoAdapter = {
    id: "higgsfield",
    key: "HIGGSFIELD_API_KEY",
    connected: () => !!env.HIGGSFIELD_API_KEY,
    problem: (model) => higgsfieldProblem(model.name, !!env.HIGGSFIELD_API_KEY),
    async submit(model) {
        throw new MediaDisabledError(higgsfieldProblem(model.name, !!env.HIGGSFIELD_API_KEY));
    },
    async wait() {
        throw new MediaDisabledError("This clip was not sent to Higgsfield by the app, so there is nothing to wait for.");
    },
};
