"use client";

import { useMemo, useState, type ReactNode } from "react";
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-foreground dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500"
      }`}
    >
      {children}
    </button>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-widest text-accent">
      <span aria-hidden>→</span>
      {children}
    </p>
  );
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
      <div className="border-b border-zinc-200 px-6 pt-6 pb-6 sm:px-10 lg:px-16 dark:border-zinc-800">
        <Eyebrow>Market</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((market) => (
            <Chip
              key={market}
              active={activeMarket === market}
              onClick={() => {
                setActiveMarket(market);
                setActiveSector(ALL_SECTORS);
                setActiveFirm("");
              }}
            >
              {MARKET_LABELS[market]}
            </Chip>
          ))}
        </div>
      </div>

      <nav className="sticky top-[72px] z-10 border-b border-zinc-200 bg-background/90 px-6 py-4 backdrop-blur sm:px-10 lg:px-16 dark:border-zinc-800">
        <Eyebrow>Timeframe</Eyebrow>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[200px] flex-1">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <circle cx="9" cy="9" r="6" />
              <path d="M14 14L18 18" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-full border border-zinc-300 bg-background py-1.5 pl-10 pr-4 text-sm text-foreground placeholder:text-zinc-400 focus:border-accent focus:outline-none dark:border-zinc-700"
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto">
            {TIME_TABS.map((tab) => (
              <Chip key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </Chip>
            ))}
          </div>
        </div>
      </nav>

      <div className="flex flex-col gap-4 border-b border-zinc-200 px-6 py-5 sm:px-10 lg:px-16 dark:border-zinc-800">
        {sectors.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {sectors.map((sector) => (
              <Chip key={sector} active={activeSector === sector} onClick={() => setActiveSector(sector)}>
                {sector}
              </Chip>
            ))}
          </div>
        )}

        {firms.length > 0 && (
          <select
            value={activeFirm}
            onChange={(e) => setActiveFirm(e.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-background px-4 py-2 text-sm text-foreground focus:border-accent focus:outline-none dark:border-zinc-700"
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
        <p className="px-6 py-16 text-center text-sm text-zinc-500 sm:px-10 lg:px-16 dark:text-zinc-400">
          No news published in this timeframe.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {filtered.map((article) => {
            const isRead = readIds.has(article.id);
            return (
              <li key={article.id} className={`px-6 py-5 sm:px-10 lg:px-16 ${isRead ? "opacity-50" : ""}`}>
                <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <span>{article.sourceName}</span>
                  <span className="text-accent">·</span>
                  <RelativeTime iso={article.publishedAt} />
                  {article.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-zinc-300 px-2 py-0.5 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {article.firms?.map((firm) => (
                    <span
                      key={firm}
                      className="rounded-full border border-accent/40 px-2 py-0.5 text-accent"
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
                  className="block font-heading text-lg font-semibold leading-snug text-foreground hover:text-accent"
                >
                  {article.title}
                </a>
                <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
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
