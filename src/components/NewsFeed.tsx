"use client";

import { useMemo, useState } from "react";
import type { Article } from "@/types/article";
import { RelativeTime } from "./RelativeTime";
import { useReadArticles } from "@/lib/useReadArticles";

const TIME_TABS = [
  { id: "24h", label: "Past 24 Hours", ms: 24 * 60 * 60 * 1000 },
  { id: "week", label: "Past Week", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "month", label: "Past Month", ms: 31 * 24 * 60 * 60 * 1000 },
] as const;

const MARKETS = ["Private Equity", "Venture Capital"] as const;
const MARKET_LABELS: Record<(typeof MARKETS)[number], string> = {
  "Private Equity": "Private Equity Market",
  "Venture Capital": "Venture Capital",
};

type TimeTabId = (typeof TIME_TABS)[number]["id"];
type Market = (typeof MARKETS)[number];
const ALL_SECTORS = "All";

function articleMarket(article: Article): Market {
  return article.category ?? "Private Equity";
}

export function NewsFeed({ articles }: { articles: Article[] }) {
  const [activeMarket, setActiveMarket] = useState<Market>("Private Equity");
  const [activeTab, setActiveTab] = useState<TimeTabId>("24h");
  const [activeSector, setActiveSector] = useState<string>(ALL_SECTORS);
  const [activeFirm, setActiveFirm] = useState<string>("");
  const [query, setQuery] = useState("");
  const { readIds, markAsRead } = useReadArticles();

  const marketArticles = useMemo(
    () => articles.filter((a) => articleMarket(a) === activeMarket),
    [articles, activeMarket]
  );

  const sectors = useMemo(() => {
    const found = new Set(marketArticles.map((a) => a.sector).filter((s): s is string => Boolean(s)));
    return [ALL_SECTORS, ...Array.from(found).sort()];
  }, [marketArticles]);

  const firms = useMemo(() => {
    const found = new Set(marketArticles.flatMap((a) => a.firms ?? []));
    return Array.from(found).sort();
  }, [marketArticles]);

  const filtered = useMemo(() => {
    const tab = TIME_TABS.find((t) => t.id === activeTab)!;
    // eslint-disable-next-line react-hooks/purity -- window cutoff is meant to reflect wall-clock time on each recompute
    const cutoff = Date.now() - tab.ms;
    const q = query.trim().toLowerCase();

    return marketArticles
      .filter((a) => new Date(a.publishedAt).getTime() >= cutoff)
      .filter((a) => activeSector === ALL_SECTORS || a.sector === activeSector)
      .filter((a) => !activeFirm || a.firms?.includes(activeFirm))
      .filter((a) => !q || a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [marketArticles, activeTab, activeSector, activeFirm, query]);

  return (
    <div className="flex w-full flex-col">
      <div className="flex border-b border-zinc-200 px-6 pt-4 sm:px-10 lg:px-16 dark:border-zinc-800">
        {MARKETS.map((market) => (
          <button
            key={market}
            onClick={() => {
              setActiveMarket(market);
              setActiveSector(ALL_SECTORS);
              setActiveFirm("");
            }}
            className={`mr-6 pb-3 text-lg font-bold transition-colors ${
              activeMarket === market
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
            }`}
          >
            {MARKET_LABELS[market]}
          </button>
        ))}
      </div>

      <nav className="sticky top-0 z-10 flex border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/90">
        {TIME_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-6 sm:px-10 lg:px-16 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-3 border-b border-zinc-200 px-6 sm:px-10 lg:px-16 py-3 dark:border-zinc-800">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search headlines and summaries…"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />

        {sectors.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {sectors.map((sector) => (
              <button
                key={sector}
                onClick={() => setActiveSector(sector)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  activeSector === sector
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {sector}
              </button>
            ))}
          </div>
        )}

        {firms.length > 0 && (
          <select
            value={activeFirm}
            onChange={(e) => setActiveFirm(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">All firms</option>
            {firms.map((firm) => (
              <option key={firm} value={firm}>
                {firm}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="px-6 sm:px-10 lg:px-16 py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No news published in this timeframe.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {filtered.map((article) => {
            const isRead = readIds.has(article.id);
            return (
              <li key={article.id} className={`px-6 sm:px-10 lg:px-16 py-4 ${isRead ? "opacity-50" : ""}`}>
                <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{article.sourceName}</span>
                  <span>•</span>
                  <RelativeTime iso={article.publishedAt} />
                  {article.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {article.firms?.map((firm) => (
                    <span
                      key={firm}
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    >
                      {firm}
                    </span>
                  ))}
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markAsRead(article.id)}
                  className="block text-base font-semibold leading-snug text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {article.title}
                </a>
                <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {article.summary}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
