import type { Metadata } from "next";
import { LegalShell, Section } from "../legal-shell";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Masal AI handles the information you enter, where it is stored, and what is sent to the AI provider."
};

const UPDATED = "15 October 2026";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy" updated={UPDATED}>
      <p>
        Masal AI is a demo real-estate lead-triage workspace. This page describes what it actually does with your
        information today, based on the code in this repository. It is a plain description, not a legal certification.
      </p>

      <Section heading="Information you enter">
        <p>
          You enter lead details into the intake form: a customer name, location, property requirement, budget, buying
          timeline, and a free-text message. In the copilot you also type follow-up questions. There are no accounts,
          sign-in, or profiles, and the app does not ask for anything else.
        </p>
      </Section>

      <Section heading="Where your data is stored">
        <p>
          All of this data is stored only in your own browser&rsquo;s <strong>localStorage</strong> (the key{" "}
          <code className="rounded bg-[var(--surface-inset)] px-1 py-0.5 text-[0.85em]">masal-ai-leads-v1</code>, plus a
          schema version). It stays on your device and browser: it is not synced,
          not shared with other users, and not saved to a server database. There is no server-side data store for lead
          content.
        </p>
        <p>
          Because it lives in your browser, clearing site data, using a different browser or device, or opening a
          private window means the leads are not there.
        </p>
      </Section>

      <Section heading="Sending data to the AI provider">
        <p>
          When you run an analysis, ask the copilot a question, or generate a call brief, the app sends the relevant
          lead fields (and, for the copilot, your question and the recent conversation) from the server to the
          configured AI provider over HTTPS. By default that provider is <strong>Groq</strong>; Google{" "}
          <strong>Gemini</strong> can be configured as an alternative. The request is made server-side so the provider
          API key is never exposed to your browser.
        </p>
        <p>
          The server does not keep your lead content after the request completes. The AI provider processes the request
          under its own terms and retention practices, which are outside this application&rsquo;s control — check the
          provider&rsquo;s privacy documentation for details.
        </p>
      </Section>

      <Section heading="Cookies and analytics">
        <p>
          The app sets no cookies and includes no analytics, advertising, or tracking scripts. It uses only essential
          browser storage (the lead data above). Because nothing here is non-essential tracking, no
          consent banner is shown.
        </p>
      </Section>

      <Section heading="Retention and deletion">
        <p>
          Data remains in your browser until you remove it. You can delete an individual lead in the app, or clear all
          of it at any time by clearing your browser&rsquo;s site data for this app. There is no separate server-side
          copy to delete.
        </p>
      </Section>

      <Section heading="Children and sensitive data">
        <p>
          This is a business demo, not a service for children. Please do not enter sensitive personal or financial
          information beyond what a lead conversation requires; the field is free text and the app does not filter its
          contents.
        </p>
      </Section>

      <Section heading="Changes and contact">
        <p>
          This description may change as the app changes. Questions about this demo can be raised on the project&rsquo;s
          public repository at{" "}
          <a className="font-medium text-[var(--brand-text)] underline underline-offset-2" href="https://github.com/ANUBprad/masal-ai-assignment">
            github.com/ANUBprad/masal-ai-assignment
          </a>.
        </p>
        <p className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text-muted)]">
          Owner confirmation needed: if this is published under a legal entity, add the entity name, a contact address,
          and any jurisdiction-specific notices. None are asserted here because none are configured in the repository.
        </p>
      </Section>
    </LegalShell>
  );
}
