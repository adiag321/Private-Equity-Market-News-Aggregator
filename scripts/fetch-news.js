// Fetches PE news from GNews API + RSS feeds, dedupes, tags, prunes, and
// writes the result to data/news-data.json. Intended to run via cron
// (GitHub Actions / Vercel Cron) three times a day.

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Parser = require("rss-parser");

const CONFIG_PATH = path.join(__dirname, "..", "sources.config.json");
const DATA_PATH = path.join(__dirname, "..", "data", "news-data.json");
const LOG_PATH = path.join(__dirname, "..", "data", "fetch-log.json");
const MAX_AGE_DAYS = 31;

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
const keywordRegex = new RegExp(config.keywordFilters.join("|"), "i");
const rssParser = new Parser();

function hashId(url) {
  return crypto.createHash("sha256").update(url.trim().toLowerCase()).digest("hex").slice(0, 16);
}

function normalizeForDedup(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").replace(/[?#].*$/, "");
}

function tagArticle(text) {
  const found = config.tagKeywords.filter((tag) => new RegExp(`\\b${tag}\\b`, "i").test(text));
  return found.length ? found : undefined;
}

function toArticle({ title, url, summary, sourceName, publishedAt }) {
  const safeSummary = summary && summary.trim() ? summary.trim().slice(0, 400) : "No summary available.";
  return {
    id: hashId(url),
    title: title.trim(),
    url: url.trim(),
    summary: safeSummary,
    sourceName: sourceName || "Unknown source",
    publishedAt: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    tags: tagArticle(`${title} ${safeSummary}`),
  };
}

async function fetchFromGNews() {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    console.warn("[fetch-news] GNEWS_API_KEY not set — skipping GNews fetch.");
    return [];
  }

  const url = new URL("https://gnews.io/api/v4/search");
  url.searchParams.set("q", config.gnews.query);
  url.searchParams.set("lang", config.gnews.lang || "en");
  url.searchParams.set("max", String(config.gnews.max || 25));
  url.searchParams.set("apikey", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`GNews API responded ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    return (data.articles || []).map((a) =>
      toArticle({
        title: a.title,
        url: a.url,
        summary: a.description,
        sourceName: a.source?.name,
        publishedAt: a.publishedAt,
      })
    );
  } catch (err) {
    logFailure("gnews", err);
    return [];
  }
}

async function fetchFromRss() {
  const results = [];
  for (const feed of config.rssFeeds) {
    try {
      const parsed = await rssParser.parseURL(feed.url);
      for (const item of parsed.items || []) {
        const haystack = `${item.title || ""} ${item.contentSnippet || item.content || ""}`;
        if (!keywordRegex.test(haystack)) continue;
        if (!item.link || !item.title) continue;
        results.push(
          toArticle({
            title: item.title,
            url: item.link,
            summary: item.contentSnippet || item.content,
            sourceName: feed.name,
            publishedAt: item.isoDate || item.pubDate,
          })
        );
      }
    } catch (err) {
      logFailure(`rss:${feed.name}`, err);
    }
  }
  return results;
}

function logFailure(source, err) {
  console.error(`[fetch-news] ${source} failed:`, err.message);
  let log = [];
  if (fs.existsSync(LOG_PATH)) {
    try {
      log = JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
    } catch {
      log = [];
    }
  }
  log.push({ source, message: err.message, timestamp: new Date().toISOString() });
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log.slice(-100), null, 2));
}

function loadExisting() {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function dedupe(existing, incoming) {
  const seenUrls = new Set(existing.map((a) => normalizeForDedup(a.url)));
  const seenTitles = new Set(existing.map((a) => normalizeForDedup(a.title)));
  const merged = [...existing];

  for (const article of incoming) {
    const urlKey = normalizeForDedup(article.url);
    const titleKey = normalizeForDedup(article.title);
    if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) continue;
    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    merged.push(article);
  }

  return merged;
}

function pruneOld(articles) {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return articles.filter((a) => new Date(a.publishedAt).getTime() >= cutoff);
}

async function main() {
  console.log("[fetch-news] Starting fetch run:", new Date().toISOString());

  const [gnewsArticles, rssArticles] = await Promise.all([fetchFromGNews(), fetchFromRss()]);
  const incoming = [...gnewsArticles, ...rssArticles];
  console.log(`[fetch-news] Fetched ${gnewsArticles.length} from GNews, ${rssArticles.length} from RSS.`);

  const existing = loadExisting();
  const merged = dedupe(existing, incoming);
  const newCount = merged.length - existing.length;
  const pruned = pruneOld(merged);
  const prunedCount = merged.length - pruned.length;
  pruned.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(pruned, null, 2));

  console.log(
    `[fetch-news] Wrote ${pruned.length} articles (${newCount} new, ${prunedCount} pruned as older than ${MAX_AGE_DAYS} days).`
  );
}

main().catch((err) => {
  console.error("[fetch-news] Fatal error:", err);
  logFailure("fatal", err);
  process.exit(1);
});
