import crypto from "crypto";
import Parser from "rss-parser";
import type { Article } from "@/types/article";
import sourcesConfig from "../../sources.config.json";

const MAX_AGE_DAYS = 31;
const keywordRegex = new RegExp(sourcesConfig.keywordFilters.join("|"), "i");
const rssParser = new Parser();

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const firmRegexes = sourcesConfig.firms.map((firm) => ({
  name: firm,
  regex: new RegExp(`\\b${escapeRegex(firm)}\\b`, "i"),
}));
const sectorEntries = Object.entries(sourcesConfig.sectors).map(([sector, keywords]) => ({
  sector,
  regex: new RegExp((keywords as string[]).join("|"), "i"),
}));

export type FetchFailure = { source: string; message: string; timestamp: string };

function hashId(url: string): string {
  return crypto.createHash("sha256").update(url.trim().toLowerCase()).digest("hex").slice(0, 16);
}

function normalizeForDedup(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ").replace(/[?#].*$/, "");
}

function tagArticle(text: string): string[] | undefined {
  const found = sourcesConfig.tagKeywords.filter((tag) => new RegExp(`\\b${tag}\\b`, "i").test(text));
  return found.length ? found : undefined;
}

function matchFirms(text: string): string[] | undefined {
  const found = firmRegexes.filter(({ regex }) => regex.test(text)).map(({ name }) => name);
  return found.length ? found : undefined;
}

function inferSector(text: string): string | undefined {
  return sectorEntries.find(({ regex }) => regex.test(text))?.sector;
}

function toArticle(input: {
  title: string;
  url: string;
  summary?: string | null;
  sourceName?: string | null;
  publishedAt?: string | null;
}): Article {
  const safeSummary = input.summary?.trim() ? input.summary.trim().slice(0, 400) : "No summary available.";
  const haystack = `${input.title} ${safeSummary}`;
  return {
    id: hashId(input.url),
    title: input.title.trim(),
    url: input.url.trim(),
    summary: safeSummary,
    sourceName: input.sourceName || "Unknown source",
    publishedAt: input.publishedAt ? new Date(input.publishedAt).toISOString() : new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    tags: tagArticle(haystack),
    firms: matchFirms(haystack),
    sector: inferSector(haystack),
  };
}

async function fetchFromGNews(apiKey: string | undefined, failures: FetchFailure[]): Promise<Article[]> {
  if (!apiKey) {
    failures.push({ source: "gnews", message: "GNEWS_API_KEY not set — skipped", timestamp: new Date().toISOString() });
    return [];
  }

  const url = new URL("https://gnews.io/api/v4/search");
  url.searchParams.set("q", sourcesConfig.gnews.query);
  url.searchParams.set("lang", sourcesConfig.gnews.lang || "en");
  url.searchParams.set("max", String(sourcesConfig.gnews.max || 25));
  url.searchParams.set("apikey", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`GNews API responded ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    type GNewsArticle = {
      title: string;
      url: string;
      description?: string;
      publishedAt?: string;
      source?: { name?: string };
    };
    return ((data.articles as GNewsArticle[]) || []).map((a) =>
      toArticle({
        title: a.title,
        url: a.url,
        summary: a.description,
        sourceName: a.source?.name,
        publishedAt: a.publishedAt,
      })
    );
  } catch (err) {
    failures.push({ source: "gnews", message: (err as Error).message, timestamp: new Date().toISOString() });
    return [];
  }
}

async function fetchFromRss(failures: FetchFailure[]): Promise<Article[]> {
  const results: Article[] = [];
  for (const feed of sourcesConfig.rssFeeds) {
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
      failures.push({ source: `rss:${feed.name}`, message: (err as Error).message, timestamp: new Date().toISOString() });
    }
  }
  return results;
}

function dedupe(existing: Article[], incoming: Article[]): Article[] {
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

function pruneOld(articles: Article[]): Article[] {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return articles.filter((a) => new Date(a.publishedAt).getTime() >= cutoff);
}

export async function runFetch(existing: Article[], gnewsApiKey: string | undefined) {
  const failures: FetchFailure[] = [];
  const [gnewsArticles, rssArticles] = await Promise.all([
    fetchFromGNews(gnewsApiKey, failures),
    fetchFromRss(failures),
  ]);
  const incoming = [...gnewsArticles, ...rssArticles];

  const merged = dedupe(existing, incoming);
  const newCount = merged.length - existing.length;
  const pruned = pruneOld(merged);
  const prunedCount = merged.length - pruned.length;
  pruned.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return {
    articles: pruned,
    stats: {
      gnewsCount: gnewsArticles.length,
      rssCount: rssArticles.length,
      newCount,
      prunedCount,
      total: pruned.length,
    },
    failures,
  };
}
