# Compare creative quality fairly

Create matched pairs before changing the system. Hold product, approved facts/offer, buyer/stage, format, ratios, references, requested complexity and model settings constant. Preserve actual baseline prompt, skill version, input packet and outputs. The intentional changes are the recorded method/context changes. Any unavoidable difference is a confound, labelled per pair. Include all attempts, failures and repairs; never replace a baseline with a later regeneration.

Judges see randomly ordered anonymous A/B assets and final copy, plus the same compact approved facts. Hide chronology, model, costs and token counts. Score each on 0-4: 0 unusable, 1 major repair, 2 usable with repair, 3 strong, 4 excellent. Criteria: buyer/stage fit, claim/proof accuracy, brand voice/look, copy-image coherence, readable hierarchy, distinct concept and product/render faithfulness. Give visible evidence and the smallest actionable repair. Unsupported claims or proof, wrong product identity/operation and unreadable essential text are hard failures. Ties are valid. Inspect images at actual display size.

Storyboards additionally require stable identity, wardrobe/product continuity, clear shot progression, drawable actions, dialogue/caption agreement and a coherent ending. Review actual sheets/panels, not prompts alone.

Return `{pair_id, scores:{A:{criterion:0},B:{criterion:0}}, failures:{A:[],B:[]}, choice:"A|B|tie", reasons:[]}`. Aggregate only after labels are revealed: paired wins/ties, per-criterion differences, hard failures, actual input/output tokens, latency and cost. Label this a creative-quality evaluation; it does not establish sales lift or the globally smallest safe token budget.
