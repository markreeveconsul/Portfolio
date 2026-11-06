/**
 * Server-only module (import it from server components only; GITHUB_TOKEN is
 * not a NEXT_PUBLIC_ variable, so it never reaches the browser bundle).
 *
 * Public GitHub data for the portfolio, fetched on the server and cached for an
 * hour (ISR), so visitors never hit GitHub directly and the 60 requests/hour
 * anonymous limit is never a problem. Set GITHUB_TOKEN (no scopes needed) to
 * raise the limit. Every function returns null on failure so the page still builds.
 */

const API = "https://api.github.com";
const REVALIDATE_SECONDS = 3600;
const ACTIVITY_DAYS = 91; // 13 full weeks
const MAX_EVENT_PAGES = 3; // GitHub serves at most 300 public events

export type GithubRepo = {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  pushedAt: string;
};

export type ActivityDay = { date: string; count: number; known: boolean; level?: number };

export type GithubOverview = {
  publicRepos: number;
  profileUrl: string;
  recentRepos: GithubRepo[];
  topLanguages: { name: string; repos: number }[];
  activity: ActivityDay[];
  activeDays: number;
  total: number;
  /** "contributions": GitHub's own calendar (last year). "events": public events API fallback (~90 days, capped at 300). */
  source: "contributions" | "events";
  /** True when GitHub's 300-event cap cut off older days in the window (events source only). */
  truncated: boolean;
};

export type RepoStats = {
  url: string;
  stars: number;
  pushedAt: string;
  createdAt: string;
  languages: { name: string; percent: number }[];
};

type ApiRepo = { name: string; description: string | null; html_url: string; language: string | null; stargazers_count: number; pushed_at: string; created_at: string; fork: boolean; archived: boolean };
type ApiEvent = { created_at: string };

async function github<T>(path: string): Promise<T | null> {
  const token = process.env.GITHUB_TOKEN;
  try {
    const response = await fetch(`${API}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "consul-dev-portfolio",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/**
 * GitHub's public contribution calendar (the green graph on a profile). There is
 * no unauthenticated JSON API for it, so this reads the calendar fragment GitHub
 * serves for profiles. That markup is undocumented and could change, so any
 * parsing problem returns null and the caller falls back to the events API.
 */
async function getContributionCalendar(user: string): Promise<{ days: ActivityDay[]; total: number } | null> {
  try {
    const response = await fetch(`https://github.com/users/${encodeURIComponent(user)}/contributions`, {
      headers: { "User-Agent": "consul-dev-portfolio", Accept: "text/html" },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const counts = new Map<string, number>();
    for (const [, id, text] of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
      const match = text.match(/^(\d[\d,]*) contributions?/);
      counts.set(id, match ? Number(match[1].replace(/,/g, "")) : 0);
    }
    const days: ActivityDay[] = [];
    for (const [tag] of html.matchAll(/<td[^>]*data-date="\d{4}-\d{2}-\d{2}"[^>]*>/g)) {
      const date = tag.match(/data-date="([^"]+)"/)?.[1];
      const id = tag.match(/\sid="([^"]+)"/)?.[1];
      const level = Number(tag.match(/data-level="(\d)"/)?.[1] ?? 0);
      if (!date) continue;
      days.push({ date, count: (id && counts.get(id)) || 0, known: true, level });
    }
    if (days.length < 300) return null; // not the shape we expect
    days.sort((a, b) => a.date.localeCompare(b.date));
    const totalMatch = html.match(/([\d,]+)\s+contributions?\s+in the last year/);
    const total = totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : days.reduce((sum, day) => sum + day.count, 0);
    return { days, total };
  } catch {
    return null;
  }
}

async function getEventActivity(user: string) {
  const events: ApiEvent[] = [];
  let truncated = false;
  for (let page = 1; page <= MAX_EVENT_PAGES; page += 1) {
    const batch = await github<ApiEvent[]>(`/users/${user}/events/public?per_page=100&page=${page}`);
    if (!batch) break;
    events.push(...batch);
    if (batch.length < 100) break;
    if (page === MAX_EVENT_PAGES) truncated = true;
  }

  // Daily counts over the last 13 weeks, ending today (UTC), aligned to whole weeks.
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.created_at.slice(0, 10), (counts.get(event.created_at.slice(0, 10)) ?? 0) + 1);
  const oldestKnown = truncated && events.length ? events[events.length - 1].created_at.slice(0, 10) : "";
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (ACTIVITY_DAYS - 1)));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // back to Sunday so columns are weeks
  const days: ActivityDay[] = [];
  for (const day = new Date(start); day <= today; day.setUTCDate(day.getUTCDate() + 1)) {
    const key = dayKey(day);
    days.push({ date: key, count: counts.get(key) ?? 0, known: !oldestKnown || key >= oldestKnown });
  }
  return { days, truncated, total: days.reduce((sum, day) => sum + day.count, 0) };
}

export async function getGithubOverview(user: string): Promise<GithubOverview | null> {
  const [profile, repos, calendar] = await Promise.all([
    github<{ public_repos: number; html_url: string }>(`/users/${user}`),
    github<ApiRepo[]>(`/users/${user}/repos?sort=pushed&per_page=100&type=owner`),
    getContributionCalendar(user),
  ]);
  if (!profile || !repos) return null;
  const events = calendar ? null : await getEventActivity(user);

  const own = repos.filter((repo) => !repo.fork && !repo.archived);
  const recentRepos = own.slice(0, 4).map((repo) => ({
    name: repo.name,
    description: repo.description,
    url: repo.html_url,
    language: repo.language,
    stars: repo.stargazers_count,
    pushedAt: repo.pushed_at,
  }));

  const languageCounts = new Map<string, number>();
  for (const repo of own) if (repo.language) languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
  const topLanguages = [...languageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, repos: count }));

  const activity = calendar?.days ?? events?.days ?? [];
  return {
    publicRepos: profile.public_repos,
    profileUrl: profile.html_url,
    recentRepos,
    topLanguages,
    activity,
    activeDays: activity.filter((day) => day.count > 0).length,
    total: calendar?.total ?? events?.total ?? 0,
    source: calendar ? "contributions" : "events",
    truncated: events?.truncated ?? false,
  };
}

export async function getRepoStats(fullName: string): Promise<RepoStats | null> {
  const [repo, languages] = await Promise.all([
    github<ApiRepo>(`/repos/${fullName}`),
    github<Record<string, number>>(`/repos/${fullName}/languages`),
  ]);
  if (!repo) return null;
  const total = Object.values(languages ?? {}).reduce((sum, bytes) => sum + bytes, 0);
  return {
    url: repo.html_url,
    stars: repo.stargazers_count,
    pushedAt: repo.pushed_at,
    createdAt: repo.created_at,
    languages: total ? Object.entries(languages ?? {}).sort((a, b) => b[1] - a[1]).map(([name, bytes]) => ({ name, percent: (bytes / total) * 100 })) : [],
  };
}

// GitHub linguist colors for the languages this portfolio is likely to show.
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Java: "#b07219", Python: "#3572A5", "C#": "#178600",
  HTML: "#e34c26", CSS: "#663399", SCSS: "#c6538c", Shell: "#89e051", PLpgSQL: "#336790", TSQL: "#e38c00",
};
export const languageColor = (name: string | null) => (name && LANGUAGE_COLORS[name]) || "#8b93a1";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
