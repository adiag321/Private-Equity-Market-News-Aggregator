import fs from "fs";
import path from "path";
import type { Article } from "@/types/article";

const DATA_PATH = path.join(process.cwd(), "data", "news-data.json");

export function getArticles(): Article[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(raw) as Article[];
  } catch {
    return [];
  }
}
