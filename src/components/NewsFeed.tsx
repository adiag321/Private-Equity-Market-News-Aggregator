"use client";

import { useMemo, useState } from "react";
import type { Article } from "@/types/article";
import { RelativeTime } from "./RelativeTime";

const TABS = [
  { id: "24h", label: "Past 24 Hours", ms: 24 * 60 * 60 * 1000 },
  { id: "week", label: "Past Week", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "month", label: "Past Month", ms: 31 * 24 * 60 * 60 * 1000 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function NewsFeed({ articles }: { articles: Article[] }) {
  const [activeTab, setActiveTab] = useState<TabId>("24h");

  const filtered = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab)!;
    // eslint-disable-next-line react-hooks/purity -- window cutoff is meant to reflect wall-clock time on each recompute
    const cutoff = Date.now() - tab.ms;
    return articles
      .filter((a) => new Date(a.publishedAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [articles, activeTab]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <nav className="sticky top-0 z-10 flex border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/90">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No news published in this timeframe.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {filtered.map((article) => (
            <li key={article.id} className="px-4 py-4">
              <div className="mb-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{article.sourceName}</span>
                <span>•</span>
                <RelativeTime iso={article.publishedAt} />
                {article.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-base font-semibold leading-snug text-zinc-900 hover:underline dark:text-zinc-50"
              >
                {article.title}
              </a>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {article.summary}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
