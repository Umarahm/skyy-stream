import axiosFetch from "./fetchBackend";

export type SportKey = "football" | "cricket";

export type SportConfig = {
  label: string;
  espnSport: string;
  espnLeague: string; // empty string -> no usable ESPN slug, skip ESPN calls
  sportsDbLeagueId: string;
  sportsDbSeason: string;
  streamedId: string;
};

// Hardcoded sport -> league map, per docs/sports/integration-plan.md ("fine to
// hardcode the sport->league slug map as a TS const, since league slugs aren't
// exposed via a discovery endpoint"). Extend with more entries later.
export const SPORTS_CONFIG: Record<SportKey, SportConfig> = {
  football: {
    label: "Football",
    espnSport: "soccer",
    espnLeague: "fifa.world", // 2026 FIFA World Cup
    sportsDbLeagueId: "4429",
    sportsDbSeason: "2026",
    streamedId: "football",
  },
  cricket: {
    label: "Cricket",
    espnSport: "cricket",
    // Despite the soccer-style slugs (e.g. "fifa.world"), ESPN's cricket
    // coverage is keyed by numeric league id — "8048" is the IPL. Confirmed
    // working: site.api.espn.com/.../cricket/8048/scoreboard?dates=<year>
    // returns the full season with real score strings ("161/5 (18/20 ov)")
    // and an explicit per-team `winner` flag, unlike TheSportsDB's bare
    // run-total which made "highest number wins" the only signal available.
    espnLeague: "8048",
    sportsDbLeagueId: "5401", // Major League Cricket — kept for streamed.pk-style fallbacks
    sportsDbSeason: "2026",
    streamedId: "cricket",
  },
};

const fetchJson = async <T>(
  requestID: string,
  params: Record<string, any>,
  fallback: T,
): Promise<T> => {
  try {
    const response = await axiosFetch({ requestID, ...params });
    return (response ?? fallback) as T;
  } catch (error) {
    return fallback;
  }
};

export const getEspnScoreboard = async (
  sport: string,
  league: string,
  dates?: string,
): Promise<{ events: any[] }> =>
  fetchJson("sportsScoreboard", { sport, league, dates }, { events: [] });

// Same scoreboard endpoint as above, but typed to also carry the `standings`
// array ESPN embeds in the response — used for cricket, where a `dates`
// value of just a year (e.g. "2026") returns the whole season's fixtures
// plus a season standings snapshot in one call.
export const getEspnScoreboardFull = async (
  sport: string,
  league: string,
  dates?: string,
): Promise<{ events: any[]; standings: any[] }> =>
  fetchJson("sportsScoreboard", { sport, league, dates }, { events: [], standings: [] });

export const getSportsDbEventsSeason = async (
  league: string,
  season?: string,
): Promise<{ events: any[] }> =>
  fetchJson("sportsdbEventsSeason", { league, season }, { events: [] });

export const getSportsDbEventsDay = async (
  date: string,
  sportName: string,
): Promise<{ events: any[] }> =>
  fetchJson("sportsdbEventsDay", { dates: date, sport: sportName }, { events: [] });

// TheSportsDB's free-tier key is rate-limited, and the homepage's eager
// batch already fires several `eventsday.php` calls back-to-back (one per
// sport) — staggering their *dispatch* by a small, fixed gap (without
// waiting for each to finish) avoids slamming the limiter with a true
// simultaneous burst, while still resolving in roughly max(latency) instead
// of sum(latency) like a sequential await chain would.
const staggeredAll = <T, R>(items: T[], fn: (item: T, index: number) => Promise<R>, gapMs = 120): Promise<R[]> =>
  Promise.all(
    items.map(
      (item, index) =>
        new Promise<R>((resolve) => {
          setTimeout(() => fn(item, index).then(resolve), index * gapMs);
        }),
    ),
  );

// TheSportsDB sport names for the homepage's cross-sport rail. Football is
// deliberately excluded — ESPN's scoreboard covers the active World Cup far
// better (live score + goal scorers/time) and is polled separately by
// SportsHubHome on its own short cadence instead of going through TheSportsDB.
export const HOMEPAGE_SPORTS_DB_NAMES = ["Cricket", "Basketball", "Baseball", "Ice Hockey"];

// Shared ordering for every cross-sport match list on the homepage — live
// first, then upcoming, then finished, ties broken by kickoff time. Kept in
// one place so the hero, the cross-sport rail, and any future feed all agree
// on order instead of each re-implementing the same sort.
const STATUS_WEIGHT: Record<NormalizedMatch["status"], number> = { in: 0, pre: 1, post: 2 };
export const sortMatchesByStatus = (items: NormalizedMatch[]): NormalizedMatch[] =>
  [...items].sort((a, b) => {
    const weightDiff = STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status];
    if (weightDiff !== 0) return weightDiff;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

export const getMultiSportEventsToday = async (date: string): Promise<NormalizedMatch[]> => {
  const results = await staggeredAll(HOMEPAGE_SPORTS_DB_NAMES, (sportName) =>
    getSportsDbEventsDay(date, sportName),
  );
  const matches = results
    .flatMap((result) => result.events || [])
    .map(normalizeSportsDbEvent)
    .filter((match): match is NormalizedMatch => Boolean(match));
  return sortMatchesByStatus(matches);
};

// TheSportsDB's Soccer eventsday call returns the World Cup fixture as one
// record carrying score, team badges, AND match artwork (strThumb/strBanner)
// together — confirmed live: eventsday.php?s=Soccer, filtered to
// idLeague === sportsDbLeagueId. Kept as raw events (not normalized here)
// because `findSportsDbBackdrop` also reuses this single fetch to attach
// artwork onto the ESPN-sourced football fixtures shown elsewhere on the
// page (ESPN has no image field at all, but better live score precision).
export const getWorldCupEventsToday = async (date: string): Promise<any[]> => {
  const result = await getSportsDbEventsDay(date, "Soccer");
  return (result.events || []).filter(
    (event: any) => event.idLeague === SPORTS_CONFIG.football.sportsDbLeagueId,
  );
};

// Live football fixtures for the homepage — fetched independently from
// getMultiSportEventsToday so the caller can poll it on its own short
// cadence without re-hitting TheSportsDB/streamed.pk on every tick.
export const getFootballLiveToday = async (label?: string): Promise<NormalizedMatch[]> => {
  const football = SPORTS_CONFIG.football;
  const scoreboard = await getEspnScoreboard(football.espnSport, football.espnLeague);
  return (scoreboard.events || [])
    .map((event: any) =>
      normalizeEspnEvent(event, label || football.label, football.espnSport, football.espnLeague),
    )
    .filter((match): match is NormalizedMatch => Boolean(match));
};

export const getSportsDbTable = async (
  league: string,
  season?: string,
): Promise<{ table: any[] }> => fetchJson("sportsdbTable", { league, season }, { table: [] });

export const getEspnStandings = async (
  sport: string,
  league: string,
): Promise<{ children: any[] }> => fetchJson("sportsStandings", { sport, league }, { children: [] });

// streamed.pk blocks non-browser TLS clients (documented in
// docs/sports/streamed-pk-api.md and confirmed: server-side Node fetches to
// streamed.pk come back empty/fail, but the same URL works from a real
// browser) — so unlike ESPN/TheSportsDB, these go straight to streamed.pk
// from the client instead of through the `/api/backendfetch` proxy.
const STREAMED_BASE_URL = "https://streamed.pk/api";

const fetchStreamedJson = async <T>(path: string, fallback: T): Promise<T> => {
  try {
    const response = await fetch(`${STREAMED_BASE_URL}${path}`);
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch (error) {
    return fallback;
  }
};

export const getStreamedSportsList = async (): Promise<{ id: string; name: string }[]> =>
  fetchStreamedJson("/sports", []);

export const getStreamedMatches = async (sport: string): Promise<any[]> =>
  fetchStreamedJson(`/matches/${encodeURIComponent(sport)}`, []);

export const getStreamedLiveAll = async (): Promise<any[]> => fetchStreamedJson("/matches/live", []);

// "/matches/all" returns every match streamed.pk has ever indexed, across all
// sports — a much heavier payload than the homepage's "More Live Events" rail
// needs, and slow enough on its own that it risked starving the other
// requests fired alongside it. "/matches/all-today" is the same shape, scoped
// to today, so it stays fast and lazy-loadable on scroll.
export const getStreamedAllTodayMatches = async (): Promise<any[]> =>
  fetchStreamedJson("/matches/all-today", []);

export const getStreamedPopularAll = async (): Promise<any[]> =>
  fetchStreamedJson("/matches/all/popular", []);

export const getStreamedStream = async (source: string, id: string): Promise<any[]> =>
  fetchStreamedJson(`/stream/${encodeURIComponent(source)}/${encodeURIComponent(id)}`, []);

// ESPN's previous-N/next-N days window for a schedule view, e.g. "5 days back,
// 5 days forward" — formatted as the YYYYMMDD-YYYYMMDD range ESPN's scoreboard
// endpoint accepts in `dates`.
export const buildEspnDateRange = (daysBack: number, daysForward: number): string => {
  const toYYYYMMDD = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  const end = new Date();
  end.setDate(end.getDate() + daysForward);
  return `${toYYYYMMDD(start)}-${toYYYYMMDD(end)}`;
};

// Common shape both ESPN and TheSportsDB events get normalized into, so the UI
// never has to branch on which API a match came from.
export type NormalizedMatch = {
  id: string;
  source: "espn" | "sportsdb" | "streamed";
  status: "pre" | "in" | "post";
  statusDetail: string;
  date: string;
  homeName: string;
  awayName: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore?: string;
  awayScore?: string;
  // Explicit per-side result flag, straight from ESPN's `competitor.winner`
  // — more reliable than comparing scores client-side (cricket's score is a
  // formatted string like "161/5 (18/20 ov)", not a bare number to compare).
  homeWinner?: boolean;
  awayWinner?: boolean;
  sportLabel?: string;
  competition?: string;
  backdrop?: string;
  // Carried through so a finished match can be linked to /sports-match
  // without the page having to re-derive which API/league it came from.
  espnSport?: string;
  espnLeague?: string;
  sportsDbLeagueId?: string;
  // Goal/card timeline — populated for ESPN-sourced football matches only
  // (scoreboard and summary both expose the same `details[]` shape).
  keyEvents?: MatchKeyEvent[];
  // TheSportsDB's dedicated matchup artwork (`strBanner`) — distinct from
  // `backdrop`, which is the full-bleed background image. Only set when the
  // source actually has a banner; the hero carousel skips rendering it
  // otherwise rather than duplicating `backdrop`.
  banner?: string;
};

// Shared by the scoreboard (`competitions[0].details`) and the match summary
// (`header.competitions[0].details`) — same array shape either way.
const normalizeEspnEventDetails = (comp: any): MatchKeyEvent[] => {
  const details = comp?.details || [];
  return details.map((d: any, index: number) => ({
    id: `${d.team?.id || "evt"}-${index}`,
    time: d.clock?.displayValue || "",
    team: d.team?.displayName || "",
    type: d.scoringPlay ? "goal" : d.redCard ? "red-card" : "card",
    players: (d.participants || []).map((p: any) => p.athlete?.displayName).filter(Boolean),
  }));
};

export const normalizeEspnEvent = (
  event: any,
  sportLabel?: string,
  espnSport?: string,
  espnLeague?: string,
): NormalizedMatch | null => {
  const comp = event?.competitions?.[0];
  if (!comp) return null;
  const home = comp.competitors?.find((c: any) => c.homeAway === "home");
  const away = comp.competitors?.find((c: any) => c.homeAway === "away");
  if (!home || !away) return null;
  return {
    id: String(event.id),
    source: "espn",
    status: comp.status?.type?.state || "pre",
    statusDetail:
      comp.status?.type?.shortDetail || comp.status?.type?.description || "",
    date: event.date,
    homeName: home.team?.displayName || "TBD",
    awayName: away.team?.displayName || "TBD",
    homeLogo: home.team?.logo,
    awayLogo: away.team?.logo,
    homeScore: home.score,
    awayScore: away.score,
    homeWinner: typeof home.winner === "boolean" ? home.winner : undefined,
    awayWinner: typeof away.winner === "boolean" ? away.winner : undefined,
    sportLabel,
    // `sportLabel` is the tournament/league name passed in by the caller
    // (e.g. "FIFA World Cup") — `event.shortName`/`event.name` are the
    // *match* name ("QAT @ BIH"), which is the wrong thing to show as the
    // competition label in the hero/carousel.
    competition: sportLabel,
    espnSport,
    espnLeague,
    keyEvents: normalizeEspnEventDetails(comp),
  };
};

export const normalizeSportsDbEvent = (event: any): NormalizedMatch | null => {
  if (!event?.idEvent) return null;
  const status: NormalizedMatch["status"] =
    event.strStatus === "FT" || event.strStatus === "AET" || event.strStatus === "FT_PEN"
      ? "post"
      : !event.strStatus || event.strStatus === "NS"
        ? "pre"
        : "in";
  return {
    id: String(event.idEvent),
    source: "sportsdb",
    status,
    statusDetail: event.strStatus || event.strResult || "",
    date: event.strTimestamp || event.dateEvent,
    homeName: event.strHomeTeam,
    awayName: event.strAwayTeam,
    homeLogo: event.strHomeTeamBadge,
    awayLogo: event.strAwayTeamBadge,
    homeScore: event.intHomeScore,
    awayScore: event.intAwayScore,
    sportLabel: event.strSport,
    competition: event.strLeague,
    backdrop: event.strThumb || event.strBanner || event.strPoster || event.strLeagueBadge,
    banner: event.strBanner || undefined,
    sportsDbLeagueId: event.idLeague,
  };
};

type RawStreamedMatch = {
  id: string;
  title: string;
  category: string;
  date: number;
  poster?: string;
  teams?: { home?: { name: string; badge: string }; away?: { name: string; badge: string } };
};

// streamed.pk is inconsistent about this field's shape depending on category:
// `poster` usually comes back as a full path already, e.g.
// "/api/images/proxy/<hash>.webp" — just needs the host prepended. But
// `teams.home/away.badge` (confirmed on football/World Cup matches) comes
// back as a *bare* hash with no leading slash and no extension at all, e.g.
// "GwZg7AZpYEZgHCAjAJgCzrA...IQA" — that needs both the `/api/images/proxy/`
// prefix AND a `.webp` extension added, or the request 404s.
const IMAGE_EXTENSION_RE = /\.(webp|png|jpe?g)$/i;
export const resolveStreamedAsset = (path?: string): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return `https://streamed.pk${path}`;
  const withExtension = IMAGE_EXTENSION_RE.test(path) ? path : `${path}.webp`;
  return `https://streamed.pk/api/images/proxy/${withExtension}`;
};

// streamed.pk has no score/status fields — `status` is supplied by the caller
// based on which endpoint the match came from (e.g. "in" for /matches/live).
export const normalizeStreamedMatch = (
  match: RawStreamedMatch,
  status: NormalizedMatch["status"] = "pre",
): NormalizedMatch | null => {
  if (!match?.id) return null;
  const [titleHome, titleAway] = match.title.split(/\s+vs\.?\s+/i);
  const homeName = match.teams?.home?.name || titleHome || match.title;
  const awayName = match.teams?.away?.name || titleAway || "";
  return {
    id: String(match.id),
    source: "streamed",
    status,
    // `getMatchStatusLabel` already prepends "LIVE" for status "in" — putting
    // it here too produced "LIVE LIVE" on every streamed.pk-only card.
    // streamed.pk has no minute/period data, so there's nothing else to put
    // in this field.
    statusDetail: "",
    date: new Date(match.date).toISOString(),
    homeName,
    awayName,
    homeLogo: resolveStreamedAsset(match.teams?.home?.badge),
    awayLogo: resolveStreamedAsset(match.teams?.away?.badge),
    sportLabel: match.category,
    backdrop: resolveStreamedAsset(match.poster),
  };
};

const getEspnStat = (entry: any, name: string): string => {
  const stat = entry?.stats?.find((s: any) => s.name === name);
  return stat?.displayValue ?? "";
};

// Flattens ESPN's grouped standings (`children[].standings.entries[]`) into
// the same flat row shape TheSportsDB's `lookuptable.php` returns, so the one
// `Standings` component can render either source unmodified.
export const espnStandingsToTableRows = (data: { children: any[] }): any[] => {
  const groups = [...(data.children || [])].sort((a, b) => String(a.name).localeCompare(b.name));
  return groups.flatMap((group) =>
    (group.standings?.entries || []).map((entry: any) => ({
      idStanding: `${group.id}-${entry.team?.id}`,
      intRank: Number(getEspnStat(entry, "rank")) || 0,
      strTeam: entry.team?.displayName,
      strBadge: entry.team?.logos?.[0]?.href,
      strGroup: group.name,
      intPlayed: getEspnStat(entry, "gamesPlayed"),
      intWin: getEspnStat(entry, "wins"),
      intDraw: getEspnStat(entry, "ties"),
      intLoss: getEspnStat(entry, "losses"),
      intPoints: getEspnStat(entry, "points"),
    })),
  );
};

// ESPN's cricket standings come back flat (no groups) and much sparser than
// football's — just rank and match points, no games-played/win/loss split.
// Maps onto the same row shape so the one `Standings` component still works.
export const espnCricketStandingsToTableRows = (standings: any[]): any[] =>
  (standings || []).map((entry: any) => ({
    idStanding: entry.team?.id,
    intRank: Number(getEspnStat(entry, "rank")) || 0,
    strTeam: entry.team?.displayName,
    strBadge: entry.team?.logos?.[0]?.href || entry.team?.logo,
    intPoints: getEspnStat(entry, "matchPoints"),
  }));

// One label/tone everywhere a match's status is shown, so the carousel,
// rails, and schedule grid never disagree on wording — and kickoff times are
// always stated explicitly rather than left for the viewer to infer.
export const getMatchStatusLabel = (
  match: NormalizedMatch,
): { label: string; tone: "live" | "upcoming" | "final" } => {
  if (match.status === "in") {
    return { label: `LIVE ${match.statusDetail}`.trim(), tone: "live" };
  }
  if (match.status === "post") {
    return { label: match.statusDetail || "Final", tone: "final" };
  }
  const kickoff = new Date(match.date).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return { label: `Upcoming · ${kickoff}`, tone: "upcoming" };
};

// Only football (ESPN) and cricket (TheSportsDB) have a stats page for now —
// returns null for anything else so callers can skip the link entirely.
export const getMatchDetailHref = (match: NormalizedMatch): string | null => {
  if (match.status !== "post") return null;
  if (match.source === "espn" && match.espnSport && match.espnLeague) {
    return `/sports-match?source=espn&sport=${encodeURIComponent(match.espnSport)}&league=${encodeURIComponent(match.espnLeague)}&id=${encodeURIComponent(match.id)}`;
  }
  if (match.source === "sportsdb" && match.sportLabel?.toLowerCase() === "cricket") {
    return `/sports-match?source=sportsdb&id=${encodeURIComponent(match.id)}`;
  }
  return null;
};

// --- Match detail (stats/lineups/news/highlights) ---

export const getEspnSummary = async (sport: string, league: string, id: string): Promise<any> =>
  fetchJson("sportsSummary", { sport, league, id }, {});

export const getEspnNews = async (sport: string, league: string): Promise<{ articles: any[] }> =>
  fetchJson("sportsNews", { sport, league }, { articles: [] });

// Full article body — the `news` list endpoint above only carries a short
// description; this looks up ESPN's CMS record for one article by id, which
// carries the actual story HTML in `headlines[0].story`.
export const getEspnArticle = async (id: string): Promise<any> => {
  const data = await fetchJson("sportsArticle", { id }, { headlines: [] });
  return data.headlines?.[0] || null;
};

// ESPN's story HTML embeds CMS-only placeholder tags (<photo1>, <alsosee>,
// ...) that have no public asset behind them — strip those, keep the real
// markup (p/ul/li/a) as-is since it comes from ESPN's own CMS, not user input.
export const sanitizeEspnStoryHtml = (html?: string): string => {
  if (!html) return "";
  return html
    .replace(/<\/?(photo\d*|alsosee|related\d*|video\d*|graphic\d*)\s*\/?>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
};

export const getSportsDbEvent = async (id: string): Promise<{ events: any[] }> =>
  fetchJson("sportsdbEvent", { id }, { events: [] });

export const getSportsDbHighlights = async (
  date: string,
  sportName: string,
): Promise<{ tvhighlights: any[] }> =>
  fetchJson("sportsdbHighlights", { dates: date, sport: sportName }, { tvhighlights: [] });

export type BoxscoreRow = { team: string; teamLogo?: string; stats: { label: string; value: string }[] };

// ESPN's boxscore is per-team, each with a flat `statistics[]` — pivot it so
// the UI can render "label | home value | away value" rows directly.
export const normalizeEspnBoxscore = (
  summary: any,
): { labels: string[]; home: BoxscoreRow | null; away: BoxscoreRow | null } => {
  const teams = summary?.boxscore?.teams || [];
  const toRow = (entry: any): BoxscoreRow | null => {
    if (!entry) return null;
    return {
      team: entry.team?.displayName,
      teamLogo: entry.team?.logos?.[0]?.href,
      stats: (entry.statistics || []).map((s: any) => ({ label: s.label || s.name, value: s.displayValue })),
    };
  };
  const home = toRow(teams.find((t: any) => t.homeAway === "home"));
  const away = toRow(teams.find((t: any) => t.homeAway === "away"));
  const labels = (home?.stats || away?.stats || []).map((s) => s.label);
  return { labels, home, away };
};

export type RosterPlayer = {
  id: string;
  name: string;
  shortName?: string;
  jersey?: string;
  position?: string;
  starter: boolean;
  subbedIn: boolean;
  subbedOut: boolean;
  goals: number;
  yellowCards: number;
  redCards: number;
};

export type TeamRoster = {
  team: string;
  teamLogo?: string;
  formation?: string;
  players: RosterPlayer[];
};

// ESPN's `rosters[]` — formation + full squad with starter/sub flags and
// position, used for the lineup section of the match-detail page.
export const normalizeEspnRoster = (summary: any): TeamRoster[] => {
  return (summary?.rosters || []).map((entry: any) => ({
    team: entry.team?.displayName,
    teamLogo: entry.team?.logos?.[0]?.href,
    formation: entry.formation,
    players: (entry.roster || []).map((p: any) => ({
      id: String(p.athlete?.id),
      name: p.athlete?.displayName,
      shortName: p.athlete?.shortName,
      jersey: p.jersey,
      position: p.position?.abbreviation || p.position?.displayName,
      starter: Boolean(p.starter),
      subbedIn: Boolean(p.subbedIn),
      subbedOut: Boolean(p.subbedOut),
      goals: Number(getEspnStat(p, "totalGoals")) || 0,
      yellowCards: Number(getEspnStat(p, "yellowCards")) || 0,
      redCards: Number(getEspnStat(p, "redCards")) || 0,
    })),
  }));
};

export type MatchKeyEvent = {
  id: string;
  time: string;
  team: string;
  type: "goal" | "red-card" | "card" | "event";
  players: string[];
};

// ESPN's `header.competitions[0].details[]` — goals/cards keyed by flags
// rather than an explicit `type` field, so this infers a display type.
export const normalizeEspnKeyEvents = (summary: any): MatchKeyEvent[] =>
  normalizeEspnEventDetails(summary?.header?.competitions?.[0]);
