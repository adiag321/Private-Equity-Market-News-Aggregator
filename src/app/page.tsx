import { getArticles } from "@/lib/articles";
import { NewsFeed } from "@/components/NewsFeed";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  const articles = await getArticles();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-2xl items-start justify-between px-4 py-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              PE News
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Automated Private Equity market news aggregator
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="bg-white dark:bg-black">
        <NewsFeed articles={articles} />
      </main>
    </div>
  );
}
