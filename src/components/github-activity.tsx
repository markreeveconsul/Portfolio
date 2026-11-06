import { formatDate, getGithubOverview, languageColor, type ActivityDay } from "@/lib/github";

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

function level(count: number, max: number) {
  if (count <= 0) return 0;
  if (max <= 4) return Math.min(4, count);
  return Math.min(4, Math.ceil((count / max) * 4));
}

function weeksOf(days: ActivityDay[]) {
  const weeks: ActivityDay[][] = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  return weeks;
}

/**
 * Live GitHub section (server component, cached for an hour). The heatmap shows
 * GitHub's contribution calendar for the last year; if that can't be read, it
 * falls back to public events (~90 days) and the labels change to say so.
 */
export async function GithubActivity({ user, profileUrl }: { user: string; profileUrl: string }) {
  const data = await getGithubOverview(user);

  if (!data) {
    return <div className="gh-fallback glass-card" data-reveal="fade">
      <p>Live activity is unavailable right now.</p>
      <a className="button button-outline" href={profileUrl} target="_blank" rel="noreferrer" data-magnetic="">View GitHub profile <span aria-hidden="true">↗</span></a>
    </div>;
  }

  const max = Math.max(1, ...data.activity.map((day) => day.count));
  const weeks = weeksOf(data.activity);
  const monthLabels = weeks.map((week, index) => {
    const first = week[0];
    const previous = weeks[index - 1]?.[0];
    return !previous || first.date.slice(5, 7) !== previous.date.slice(5, 7) ? MONTH.format(new Date(`${first.date}T00:00:00Z`)) : "";
  });
  const languageTotal = data.topLanguages.reduce((sum, language) => sum + language.repos, 0);
  const isCalendar = data.source === "contributions";
  const unit = isCalendar ? "contribution" : "public event";
  const period = isCalendar ? "the last year" : `the last ${weeks.length} weeks`;
  const summary = `${data.total} GitHub ${unit}s on ${data.activeDays} days in ${period}.`;
  const cellLevel = (day: ActivityDay) => (!day.known ? "unknown" : day.level ?? level(day.count, max));

  return <div className="gh-layout">
    <div className="gh-panel glass-card" data-spotlight="">
      <div className="gh-stats" data-reveal="stagger">
        <div><span className="gh-stat-number" data-count={data.publicRepos}>{String(data.publicRepos).padStart(2, "0")}</span><span className="gh-stat-label">Public repos</span></div>
        <div><span className="gh-stat-number" data-count={data.total}>{String(data.total).padStart(2, "0")}</span><span className="gh-stat-label">{isCalendar ? "Contributions · last year" : `Public events · ${weeks.length} wks`}</span></div>
        <div><span className="gh-stat-number" data-count={data.activeDays}>{String(data.activeDays).padStart(2, "0")}</span><span className="gh-stat-label">Active days</span></div>
      </div>

      <figure className="gh-heatmap">
        <div className="gh-months" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>{monthLabels.map((label, index) => <span key={index}>{label}</span>)}</div>
        <div className="gh-grid" role="img" aria-label={summary} data-reveal="grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
          {data.activity.map((day, index) => <span
            key={day.date}
            className={`gh-cell level-${cellLevel(day)}`}
            // Diagonal wave order for the CSS reveal: week column + weekday row.
            style={{ "--i": Math.floor(index / 7) + (index % 7) } as React.CSSProperties}
            title={day.known ? `${formatDate(`${day.date}T00:00:00Z`)}: ${day.count} ${unit}${day.count === 1 ? "" : "s"}` : "Outside the data GitHub provides"}
          />)}
        </div>
        <figcaption className="gh-caption">
          <span>{isCalendar ? "Contribution calendar · last 12 months · refreshed hourly" : "Public pushes, pull requests & new repos · refreshed hourly"}</span>
          <span className="gh-legend" aria-hidden="true">less<i className="gh-cell level-0" /><i className="gh-cell level-1" /><i className="gh-cell level-2" /><i className="gh-cell level-3" /><i className="gh-cell level-4" />more</span>
        </figcaption>
      </figure>

      {data.topLanguages.length > 0 && <div className="gh-languages">
        <span className="gh-subhead">Languages · by repository</span>
        <div className="gh-language-bar" aria-hidden="true">{data.topLanguages.map((language) => <i key={language.name} style={{ flexGrow: language.repos, background: languageColor(language.name) }} />)}</div>
        <ul>{data.topLanguages.map((language) => <li key={language.name}><i style={{ background: languageColor(language.name) }} aria-hidden="true" />{language.name}<span>{Math.round((language.repos / languageTotal) * 100)}%</span></li>)}</ul>
      </div>}
    </div>

    <div className="gh-repos">
      <div className="gh-repos-head"><span className="gh-subhead">Recently pushed</span><a className="details-link" href={data.profileUrl} target="_blank" rel="noreferrer">All repositories <span aria-hidden="true">↗</span></a></div>
      <ul className="gh-repo-list" data-reveal="stagger">
        {data.recentRepos.map((repo) => <li key={repo.name}>
          <a className="gh-repo glass-card" href={repo.url} target="_blank" rel="noreferrer" data-spotlight="" data-cursor="open">
            <span className="gh-repo-name">{repo.name}<span aria-hidden="true">↗</span></span>
            {repo.description && <span className="gh-repo-desc">{repo.description}</span>}
            <span className="gh-repo-meta">
              {repo.language && <span><i style={{ background: languageColor(repo.language) }} aria-hidden="true" />{repo.language}</span>}
              {repo.stars > 0 && <span>★ {repo.stars}</span>}
              <span>Updated {formatDate(repo.pushedAt)}</span>
            </span>
          </a>
        </li>)}
      </ul>
    </div>
  </div>;
}
