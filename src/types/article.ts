export type Article = {
  id: string; // Unique identifier (hash of the URL)
  title: string;
  url: string;
  summary: string; // 2-3 lines of content
  sourceName: string;
  publishedAt: string; // ISO 8601 date string
  fetchedAt: string; // Timestamp of when the fetch script grabbed it
  tags?: string[]; // Basic PE keyword tags (e.g. "Buyout", "M&A")
};
