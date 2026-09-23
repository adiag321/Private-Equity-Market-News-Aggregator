// Local/manual runner for the fetch pipeline — writes to data/news-data.json on disk.
// In production, the Vercel Cron route (src/app/api/cron/fetch-news/route.ts) runs the
// same shared logic (src/lib/newsFetcher.ts) but persists to Vercel Blob instead.

import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { runFetch } from "../src/lib/newsFetcher";
import type { Article } from "../src/types/article";

config({ path: ".env.local" });

const DATA_PATH = path.join(__dirname, "..", "data", "news-data.json");
const LOG_PATH = path.join(__dirname, "..", "data", "fetch-log.json");

function loadExisting(): Article[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function appendLog(failures: { source: string; message: string; timestamp: string }[]) {
  if (!failures.length) return;
  let log: unknown[] = [];
  if (fs.existsSync(LOG_PATH)) {
    try {
      log = JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
    } catch {
      log = [];
    }
  }
  log.push(...failures);
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log.slice(-100), null, 2));
}

async function main() {
  console.log("[fetch-news] Starting fetch run:", new Date().toISOString());

  const existing = loadExisting();
  const { articles, stats, failures } = await runFetch(existing, process.env.GNEWS_API_KEY);

  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(articles, null, 2));
  appendLog(failures);

  console.log(
    `[fetch-news] Fetched ${stats.gnewsCount} from GNews, ${stats.rssCount} from RSS. Wrote ${stats.total} articles (${stats.newCount} new, ${stats.prunedCount} pruned).`
  );
  if (failures.length) {
    console.warn(`[fetch-news] ${failures.length} failure(s) logged to data/fetch-log.json`);
  }
}

main().catch((err) => {
  console.error("[fetch-news] Fatal error:", err);
  process.exit(1);
});
