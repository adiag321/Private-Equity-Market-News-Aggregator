Product Requirements Document (PRD)
Project: Private Equity News Aggregator
Tech Stack: Next.js (App Router), Tailwind CSS, GitHub Actions (or Vercel Cron), Vercel (Hosting)

1. Overview
The goal is to build a lightweight, fast, and automated news aggregator for the Private Equity market. The application will feature a single-page frontend with a tabbed interface (24 Hours, 1 Week, 1 Month) displaying article titles, links, and short summaries.

The backend architecture is entirely static and database-free. A scheduled script will fetch data from a free News API three times a day, deduplicate it against existing data, and save it to a local JSON file which the Next.js frontend will render.

Roadmap / Phasing:
* Phase 1 (v1): Sections 1-4 plus the core of Section 5 (Bonus Functionalities) — the working aggregator with time-based tabs, dark mode, read status, and basic tagging.
* Phase 2: Section 6 (Extended Functionality) and Section 7 (Ops & Reliability) — firm/sector filtering, search, bookmarks, email digest, and reliability hardening. Build Phase 1 end-to-end first, then layer in Phase 2.

2. Architecture & Data Flow
To avoid databases like Supabase, the app will use a Static JSON Architecture:

* Data Sources (Multi-Source Array):
* APIs: GNews API (primary) and/or Bing News Search API (free tier).
* RSS Feeds: Use rss-parser to scrape free public feeds like Yahoo Finance, PE Hub, or standard financial blogs.
* Targeted Keyword Filtering: The script must ensure only relevant news is saved.
* For APIs, pass search queries like "private equity" OR "buyout".
* For RSS feeds, pull the recent feed and filter the array locally using Regex to ensure the title or summary contains terms like "private equity", "buyout", "acquisition", or "LBO".
* Fetch Mechanism: A scheduled script (fetch-news.js) triggered via GitHub Actions cron or Vercel Cron at 10:00 AM, 3:00 PM, and 9:00 PM.
* Deduplication Logic: The script will read the existing news-data.json file. Before adding new articles, it will normalize and check the URL and Title against existing entries to ensure no duplicates from different APIs are added.
* Storage & Pruning: The deduplicated array is saved to news-data.json. The script will automatically delete any articles older than 31 days.
* Frontend: Next.js will read news-data.json statically or via a simple internal route to render the UI.

3. Data Schema
The news-data.json file should contain an array of objects with the following structure:

TypeScript
type Article = {
  id: string; // Unique identifier (can be a hash of the URL)
  title: string;
  url: string;
  summary: string; // 2-3 lines of content
  sourceName: string;
  publishedAt: string; // ISO 8601 Date string
  fetchedAt: string; // Timestamp of when the script grabbed it
}

4. User Interface (UI) & Layout
* Vibe: Minimalist, clean, and highly readable (similar to Hacker News or a modern Substack layout).
* Layout: A single-page application.
* Navigation: A horizontal tabbed interface at the top with three tabs:
- Past 24 Hours
- Past Week
- Past Month
* Feed Design: A vertical list of articles stacked on top of each other. Each article card should display:
- Source & Time: (e.g., Bloomberg • 2 hours ago)
- Heading: Clickable title linking out to the source URL (open in new tab).
- Summary: 2-3 lines of description text, truncated with an ellipsis if it exceeds the limit.
* Responsiveness: Must be fully mobile-optimized.

5. Bonus Functionalities (Implement if possible)
* Dark Mode: Implement a dark/light mode toggle using next-themes.
* Read Status: Use browser localStorage to track clicked article IDs and fade/gray them out so users know they've already read them.
* Basic Tagging: In the fetch script, do a simple regex check on the summary for major PE keywords (e.g., "Buyout", "Venture", "M&A") and attach them as small visual tags on the frontend.

6. Extended Functionality (Phase 2)
* Firm/Company Tagging & Filter: The fetch script runs a regex/keyword pass against a maintained list of major PE firm names (e.g., KKR, Blackstone, Apollo, Carlyle, TPG) and attaches matched firms as a `firms: string[]` field on each article. The frontend adds a filter control (dropdown or chip list) to narrow the feed to a specific firm.
* Sector Tabs: Add a secondary tab/filter row (Tech, Healthcare, Real Estate, Infrastructure, Other) alongside the existing time-based tabs. Sector is inferred via keyword matching against the title/summary during the fetch script's tagging pass and stored as a `sector` field.
* Search: A client-side keyword search input that filters the currently loaded JSON array by title/summary substring match. No backend search index is needed given the small dataset size.
* Bookmarks: A distinct localStorage-backed bookmark list (separate from the existing "read" tracking), with a star/save icon per article and a "Saved" view/tab.
* Email Digest: An optional daily/weekly digest email (via Resend or SendGrid free tier) summarizing the top N articles from the period, triggered by a separate scheduled job that reuses `news-data.json`. Requires a simple subscriber list (flat file or provider-managed audience) to keep the project database-free.

7. Ops & Reliability (Phase 2)
* Fetch-Failure Monitoring: The fetch script logs failures (API error, empty result set, quota exceeded) to a `fetch-log.json` or pings a healthcheck URL (e.g., healthchecks.io free tier), so silent cron failures become visible.
* Configurable Sources: The list of RSS feed URLs and API query keywords lives in a single `sources.config.json`, so new feeds/keywords can be added without touching script logic or redeploying code.
* Basic Tests: Unit tests (e.g., Vitest) cover the deduplication logic (URL/title normalization) and the keyword-filtering logic, since these are the core correctness risks in an unattended script.

8. Edge Cases to Handle
* Empty States: If an API fetch fails or no news is available for a specific time period (e.g., no news in the last 24 hours on a Sunday), show a clean "No news published in this timeframe" message.
* Malformed Data: The fetch script must handle missing summaries or broken image links gracefully by providing fallback text.
* Timezone Handling: All dates should be stored in UTC and parsed into relative time (e.g., "4 hours ago") on the client side to match the user's local timezone.

9. Implementation Steps for Claude

Phase 1:
* Initialize a Next.js App Router project with Tailwind CSS.
* Create the Article TypeScript interface.
* Write the Node.js fetch script (fetch-news.js) that handles the API request, deduplication, JSON writing, and 30-day pruning.
* Create a sample news-data.json file with mock PE news to build the UI against.
* Build the UI component with the 3 tabs and the mapping logic to filter the JSON based on publishedAt dates relative to Date.now().
* Provide instructions on how to set up the Cron job (either GitHub Actions .yml file or Vercel vercel.json crons) to automate the script.
* Ensure the fetch-news.js script handles multiple asynchronous fetching functions (one for the REST API, one using rss-parser for Yahoo Finance/others) and merges the results into a single array before running the deduplication and keyword filtering logic.

Phase 2:
* Add firm/sector tagging logic to the fetch script's processing pipeline (writes `firms` and `sector` fields onto each article).
* Build the search input and the bookmark localStorage logic into the UI, including a "Saved" view.
* Scaffold `sources.config.json` and refactor the fetch script to read RSS feeds/keywords from it instead of hardcoded values.
* Add fetch-failure logging (`fetch-log.json` or healthcheck ping) to the fetch script.
* Stub out the email digest script and subscriber storage (optional — build once Phase 1 is stable).
* Add unit tests (Vitest) for the deduplication and keyword-filtering logic.


