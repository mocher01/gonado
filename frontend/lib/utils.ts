import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function calculateLevel(xp: number): number {
  const thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i]) return i + 1;
  }
  return 1;
}

export function getXpForNextLevel(level: number): number {
  const thresholds = [100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000, 15000];
  return thresholds[level - 1] || thresholds[thresholds.length - 1];
}

export function getWorldThemeColors(theme: string): { primary: string; secondary: string; bg: string } {
  const themes: Record<string, { primary: string; secondary: string; bg: string }> = {
    mountain: { primary: "#60a5fa", secondary: "#c4b5fd", bg: "#1e3a5f" },
    ocean: { primary: "#22d3ee", secondary: "#06b6d4", bg: "#164e63" },
    forest: { primary: "#4ade80", secondary: "#86efac", bg: "#14532d" },
    desert: { primary: "#fbbf24", secondary: "#f59e0b", bg: "#78350f" },
    space: { primary: "#a78bfa", secondary: "#c4b5fd", bg: "#1e1b4b" },
    city: { primary: "#f472b6", secondary: "#fb7185", bg: "#4c0519" },
  };
  return themes[theme] || themes.mountain;
}
