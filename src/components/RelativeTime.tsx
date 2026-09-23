"use client";

import { useEffect, useState } from "react";

function formatUtcDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days}d ago`;
  return formatUtcDate(iso);
}

export function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => formatUtcDate(iso));

  useEffect(() => {
    // Recompute using the client's clock post-mount to avoid a server/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabel(formatRelative(iso));
  }, [iso]);

  return <span suppressHydrationWarning>{label}</span>;
}
