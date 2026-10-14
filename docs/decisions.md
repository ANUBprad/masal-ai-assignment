# Technical decisions

1. **Next.js App Router:** UI and API handlers share one deployable application.
2. **Gemini REST API:** a small server-side fetch wrapper avoids SDK client reuse and keeps the API boundary explicit.
3. **Server-side key:** one `GEMINI_API_KEY` in the host environment lets reviewers test with no setup; the browser never sees the key.
4. **Per-IP rate limiting:** a lightweight in-memory limiter protects the shared free-tier key from casual abuse without adding a dependency.
5. **LocalStorage for lead records:** no database provisioning; clearly documented as a single-browser limitation.
6. **Rule-based score plus AI explanation:** scoring is transparent and testable; the model handles nuanced language analysis.
7. **Strict response shape checks:** generated JSON is parsed and validated before it is shown.
8. **Safe provider errors:** API responses avoid passing through raw provider error text that might expose sensitive details.
