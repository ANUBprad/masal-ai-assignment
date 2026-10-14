# Technical decisions

1. **Next.js App Router:** UI and API handlers share one deployable application.
2. **Gemini REST API:** a small server-side fetch wrapper avoids SDK client reuse and keeps the API boundary explicit.
3. **Server-side key:** one `GEMINI_API_KEY` in the host environment lets reviewers test with no setup; the browser never sees the key.
4. **Per-IP rate limiting:** a lightweight in-memory limiter protects the shared free-tier key from casual abuse without adding a dependency.
5. **LocalStorage for lead records:** no database provisioning; clearly documented as a single-browser limitation.
6. **Deterministic 100-point score plus AI explanation:** scoring is transparent and testable — a fixed five-dimension rubric (timeline 25, intent 25, clarity 20, budget readiness 20, engagement 10) with a visible per-dimension breakdown and explicit missing-information reporting; the model handles nuanced language analysis and separates known facts, inferences, unknowns, and deal risks, but never calculates or overrides the score.
7. **Sales-priority labels (`Act Now`/`Follow Up`/`Nurture`, thresholds 80/50):** provisional prioritisation labels chosen to avoid over-claiming qualification, replacing the earlier Hot/Warm/Cold wording; missing data is surfaced separately rather than implying a qualified lead.
7. **Strict response shape checks:** generated JSON is parsed and validated before it is shown.
8. **Safe provider errors:** API responses avoid passing through raw provider error text that might expose sensitive details.
