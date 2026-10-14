# Technical decisions

1. **Next.js App Router:** UI and API handlers share one deployable application.
2. **Gemini REST API:** a small server-side fetch wrapper avoids SDK client reuse and keeps the API boundary explicit.
3. **Key in memory only:** convenient for reviewer-owned credentials while avoiding browser persistence.
4. **LocalStorage for lead records:** no database provisioning; clearly documented as a single-browser limitation.
5. **Rule-based score plus AI explanation:** scoring is transparent and testable; the model handles nuanced language analysis.
6. **Strict response shape checks:** generated JSON is parsed and validated before it is shown.
7. **Safe provider errors:** API responses avoid passing through raw provider error text that might expose sensitive details.
