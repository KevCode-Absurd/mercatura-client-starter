# Review measured event quality

Use supplied aggregate event delivery/diagnostic counts, reported platform scores and redacted configuration. Separate browser/server delivery, observed matched event IDs, purchase value/currency and source timing. Check event-name/event-ID agreement, duplicate handling, missing fields and field-specific normalization against current provider documentation. Never send raw user data, cookies, IP addresses or access tokens to a model.

Report the platform's actual match score as reported. Parameter presence is a completeness checklist, not a locally reconstructed official EMQ score. A score difference cannot be converted into missing purchases, lost revenue or a promised ROAS improvement. Aggregate totals may disagree for many reasons, including attribution, timing, refunds and coverage.

Return event-specific observed faults, redacted evidence IDs, missing checks and a test/read-back sequence. Technical changes need the real integration and its own deployment verification. Keep simulated diagnostics labelled. Do not request extra personal data merely to increase a completeness score.
