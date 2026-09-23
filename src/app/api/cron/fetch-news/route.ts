import { NextRequest, NextResponse } from "next/server";
import { head, put } from "@vercel/blob";
import { runFetch } from "@/lib/newsFetcher";
import type { Article } from "@/types/article";

const BLOB_PATHNAME = "news-data.json";

async function loadExisting(): Promise<Article[]> {
  try {
    const meta = await head(BLOB_PATHNAME);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as Article[];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await loadExisting();
  const { articles, stats, failures } = await runFetch(existing, process.env.GNEWS_API_KEY);

  await put(BLOB_PATHNAME, JSON.stringify(articles, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });

  if (failures.length) {
    console.warn("[cron/fetch-news] failures:", failures);
  }

  return NextResponse.json({ ok: true, stats, failures });
}
