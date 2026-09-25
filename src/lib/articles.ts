import fs from "fs";
import path from "path";
import { head } from "@vercel/blob";
import type { Article } from "@/types/article";

const DATA_PATH = path.join(process.cwd(), "data", "news-data.json");
const BLOB_PATHNAME = "news-data.json";

function readLocalFile(): Article[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as Article[];
  } catch {
    return [];
  }
}

async function readFromBlob(): Promise<Article[] | null> {
  try {
    const meta = await head(BLOB_PATHNAME);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Article[];
  } catch {
    return null;
  }
}

export async function getArticles(): Promise<Article[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blobArticles = await readFromBlob();
    if (blobArticles) return blobArticles;
  }
  return readLocalFile();
}
