# Contributing an app

Every app on the death list is one JSON file in `data/apps/<slug>.json`, added by PR.
No web form, no account — the repo is the admin panel.

## Schema

```jsonc
{
  "slug": "granola",             // filename must match; lowercase, hyphens
  "name": "Granola",             // display name ("Senja / Testimonial.to" for a pair)
  "domain": "granola.ai",        // primary domain, used to fetch the favicon
  "category": "meeting-notes",   // one of the keys in src/lib/apps.js CATEGORIES
  "subcategory": "meeting transcription + AI notes",  // optional, freeform
  "tagline": "AI meeting notepad ...",                // one line, what the app is
  "priceMonthly": 14,            // typical paid tier, USD/month; null if it varies
  "pricing": {                   // provenance — prices drift, receipts matter
    "plan": "Business", "basis": "monthly per user",
    "source": "https://www.granola.ai/pricing", "checkedOn": "2026-07-30",
    "confidence": "high", "notes": null, "native": "14 USD"
  },
  "verdict": "yes",              // "yes" | "kinda" | "no"
  "verdictConfidence": "medium", // how sure we are
  "verdictSummary": "One paragraph of honest reasoning shown on the page.",
  "coreLoopDIY": "What the one-shot build actually does, in one sentence.",
  "diyTimeEstimate": "one sitting",   // "one sitting" | "multi-day" | ...
  "requirements": ["OpenAI/Anthropic API key"],  // what the DIY build needs
  "whatYouLose": ["sync across devices"],        // 3–5 honest bullets
  "moatType": "polish/sync/collaboration",       // why the original survives
  "whyPeopleStillPay": "One honest paragraph.",
  "priorArt": [                  // existing open-source alternatives, [] if none
    { "name": "quill", "url": "https://github.com/...", "desc": "open-source alternative" }
  ],
  "relatedSlugs": ["otter-ai"],  // curated related apps (optional)
  "pagePriority": 5,             // 1–5 editorial weight for default ordering
  "verifiedOneShot": false,      // true only with a linked proof repo
  "notes": "One-line editorial for the entry.",
  "prompt": "Build me a ...",    // the one-shot prompt — see prompt rules below
  "promptCurated": true          // false = generated from coreLoopDIY, PRs welcome
}
```

Minimal PRs are welcome: `slug, name, domain, category, priceMonthly, verdict,
whatYouLose, prompt` is enough — the rest enriches the page but nothing breaks
without it. Improving a `promptCurated: false` prompt into a real hand-written one
(and flipping the flag) is one of the most valuable PRs you can send.

Also add the app's favicon as `public/icons/<slug>.png` (64px; a favicon service export
is fine).

## Verdict criteria

- 🟢 **yes** — a competent AI coding agent produces a usable personal version in one
  session, self-hosted or local, no hard third-party dependency (or only trivial API
  keys). The core value survives without the SaaS's network/data moat.
- 🟡 **kinda** — buildable in a weekend but with real gaps (mobile app, sync,
  integrations, OAuth pain). Say what the gaps are.
- 🔴 **not really** — the value IS the network, the data, the infra, or compliance.
  These entries make the site credible: explain *why* it survives, and give the prompt
  for the closest honest consolation build (or say "don't").

## Prompt rules

The prompt is the product. It must be:

- **Genuinely runnable** — someone pastes it into Claude Code / Codex / Cursor in an
  empty folder and gets a working thing. No hand-waving.
- **Opinionated about stack** — pick one; don't offer menus.
- **Explicit about scope** — say what's included AND what's deliberately out.
- **15–30 lines.** If it needs more, the verdict probably isn't "yes".
- **Honest** — no accounts/cloud/telemetry unless the app genuinely needs it; secrets
  go in `.env`; include README/permissions notes where relevant.

## House rules

- Verdicts are editorial and honest — sponsorships never buy verdicts, and vote counts
  are never faked.
- Prices drift: check the app's pricing page when you touch an entry.
- No em dashes in UI copy; use `·`.
- One app per PR keeps review fast.
