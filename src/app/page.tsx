import { getArticles } from "@/lib/articles";
import { NewsFeed } from "@/components/NewsFeed";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  const articles = await getArticles();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-background/90 backdrop-blur dark:border-zinc-800">
        <div className="flex items-center justify-between px-6 py-5 sm:px-10 lg:px-16">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="font-heading text-lg font-bold uppercase leading-none tracking-tight text-foreground">
              ArrowFund <span className="text-zinc-400 dark:text-zinc-600">Pulse</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-zinc-500 sm:inline-flex dark:border-zinc-700 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Live · Updated 3x Daily
            </span>
            <ThemeToggle />
          </div>
        </div>
        <div className="px-6 pb-5 sm:px-10 lg:px-16">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Real-time intelligence on private equity and venture capital deals.
          </p>
        </div>
      </header>
      <main className="bg-background">
        <NewsFeed articles={articles} />
      </main>
    </div>
  );
}
