import fs from "fs";
import path from "path";
import type { Article } from "@/types/article";

const DATA_PATH = path.join(process.cwd(), "data", "news-data.json");

function readLocalFile(): Article[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as Article[];
  } catch {
    return [];
  }
}

async function readFromBlob(baseUrl: string): Promise<Article[]> {
  try {
    const res = await fetch(`${baseUrl}/news-data.json`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as Article[];
  } catch {
    return [];
  }
}

export async function getArticles(): Promise<Article[]> {
  const blobBaseUrl = process.env.BLOB_PUBLIC_BASE_URL;
  if (blobBaseUrl) {
    return readFromBlob(blobBaseUrl);
  }
  return readLocalFile();
}
