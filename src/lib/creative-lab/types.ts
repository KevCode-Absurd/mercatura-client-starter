export type Finding = {
    id: string;
    severity: "fix" | "review" | "pending";
    region: string;
    observation: string;
    correction: string;
};
export type Hook = {
    id: string;
    spoken: string;
    visual: string;
    overlay: string;
    promise: string;
    deliveredIn: string;
    bodyStart: number;
};
export type Card = {
    id: string;
    question: string;
    newInformation: string;
    proof: string;
    transition: string;
    qualification: string;
};
export type Scene = {
    id: string;
    visual: string;
    speech: string;
    overlay: string;
    seconds: number;
    pause: number;
    proof: string;
    objects: {
        name: string;
        entering: string;
        leaving: string;
    }[];
};
export type ArtDirection = {
    mood: string;
    palette: string;
    typography: string;
    lighting: string;
    prominence: string;
    composition: string;
    setting: string;
    style: string;
    camera: string;
};
export type ComparisonArm = {
    headline: string;
    opening: string;
    proof: string;
    layout: string;
    argument: string;
    product: string;
    offer: string;
    qualification: string;
};
export type LabDraft = {
    name: string;
    productId: string;
    sourceScriptId: string;
    buyer: string;
    argument: string;
    facts: string;
    qualification: string;
    mode: "static" | "video" | "silent_video";
    body: string;
    lockedBody: string;
    bodyLocked: boolean;
    hooks: Hook[];
    selectedHook: string;
    imageJob: string;
    headline: string;
    caption: string;
    proofPlacement: string;
    textMode: "image_first" | "copy_first" | "text_free";
    approvedHandoff: string;
    cards: Card[];
    targetSeconds: number;
    wordsPerMinute: number;
    measuredSeconds: number | null;
    measuredReadName: string;
    readTimings: {
        sceneId: string;
        speechSeconds: number;
        pauseSeconds: number;
    }[];
    grammar: "talking" | "demonstration" | "b_roll" | "conversation";
    speaker: "illustrative" | "real";
    scenes: Scene[];
    mediaUrl: string;
    mediaKind: "image" | "video" | "audio";
    cutdowns: {
        targetSeconds: number;
        hook: string;
        visual: string;
        body: string;
        qualification: string;
        findings: string[];
        sourceBodyHash: string;
        callId?: string;
        providerOutputHash?: string;
        edited?: boolean;
    }[];
    displayReviews: {
        assetUrl: string;
        width: number;
        expectedText: string;
        observedText: string;
        addedText?: string;
        packagingText?: string;
        classification?: "clear" | "uncertain";
        callId?: string;
        clipped: boolean;
        collision: boolean;
        contrast: "readable" | "uncertain" | "unreadable";
        qualificationVisible: boolean;
        region: string;
        source: "model" | "human";
    }[];
    playback: {
        mode: "silent" | "listening";
        at: number;
        observation: string;
        issue: string;
        media: string;
        actualPlayback: boolean;
    }[];
    art: ArtDirection;
    artBaseline: ArtDirection;
    locks: (keyof ArtDirection)[];
    aspects: string[];
    world: {
        location: string;
        surfaces: string;
        props: string;
        casting: string;
        productReferences: string;
        illustrationReferences: string;
        parentVersion: string;
    };
    photoReferences: string;
    selectedPhotoJobs: string[];
    reference: {
        source: string;
        fidelity: "exact" | "structure" | "loose";
        device: string;
        reason: string;
        preserve: string;
        change: string;
        cannotTransfer: string;
        outputObservation: string;
    };
    repair: {
        region: "trigger" | "emotion" | "evidence" | "payoff" | "bridge" | "action";
        before: string;
        after: string;
        observed: string;
        support: string;
        preserved: string;
        applied: boolean;
        callId?: string;
    };
    comparison: {
        hypothesis: string;
        variable: "headline" | "opening" | "proof" | "layout";
        baseline: ComparisonArm;
        variant: ComparisonArm;
        assets: {
            baseline: string;
            variant: string;
        };
        preference: string;
        reason: string;
    };
};
export type LabRevision = {
    id: string;
    version: number;
    createdAt: string;
    draft: LabDraft;
    findings: Finding[];
};
export type LabSource = {
    id: string;
    title: string;
    body: string;
    hooks: Hook[];
    scenes: Scene[];
    productId: string;
};
