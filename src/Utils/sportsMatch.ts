import type { NormalizedMatch } from "./sports";

export type StreamedMatch = {
  id: string;
  title: string;
  category: string;
  date: number; // unix ms
  poster?: string;
  popular: boolean;
  teams?: {
    home?: { name: string; badge: string };
    away?: { name: string; badge: string };
  };
  sources: { source: string; id: string }[];
};

const KICKOFF_WINDOW_MS = 3 * 60 * 60 * 1000;

const normalizeTeamName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

export const namesLikelyMatch = (a: string, b: string) => {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
};

// Reconciles a fixture (ESPN/TheSportsDB) against streamed.pk's match list by
// team name + kickoff-time proximity, per docs/sports/integration-plan.md.
export const findStreamedMatch = (
  match: NormalizedMatch,
  streamedMatches: StreamedMatch[],
): StreamedMatch | null => {
  const matchTime = new Date(match.date).getTime();
  if (Number.isNaN(matchTime)) return null;

  return (
    streamedMatches.find((streamed) => {
      if (!streamed.sources?.length) return false;
      if (Math.abs(streamed.date - matchTime) > KICKOFF_WINDOW_MS) return false;

      const [titleHome, titleAway] = streamed.title.split(/\s+vs\.?\s+/i);
      const home = streamed.teams?.home?.name || titleHome || "";
      const away = streamed.teams?.away?.name || titleAway || "";

      return (
        (namesLikelyMatch(home, match.homeName) && namesLikelyMatch(away, match.awayName)) ||
        (namesLikelyMatch(home, match.awayName) && namesLikelyMatch(away, match.homeName))
      );
    }) || null
  );
};

// ESPN's football scoreboard carries no backdrop/poster image at all
// (`normalizeEspnEvent` never sets `backdrop`), so every FIFA fixture in the
// homepage carousel/rail fell back to the empty-state SVG. streamed.pk's
// football matches *do* have real posters — reuse the same team-name +
// kickoff-window matching as `findStreamedMatch`, but without its
// `sources?.length` gate, since a match can have a usable poster even when
// it's not currently live-streamable.
export const findStreamedPoster = (
  match: NormalizedMatch,
  streamedMatches: StreamedMatch[],
): string | undefined => {
  const matchTime = new Date(match.date).getTime();
  if (Number.isNaN(matchTime)) return undefined;

  const found = streamedMatches.find((streamed) => {
    if (!streamed.poster) return false;
    if (Math.abs(streamed.date - matchTime) > KICKOFF_WINDOW_MS) return false;

    const [titleHome, titleAway] = streamed.title.split(/\s+vs\.?\s+/i);
    const home = streamed.teams?.home?.name || titleHome || "";
    const away = streamed.teams?.away?.name || titleAway || "";

    return (
      (namesLikelyMatch(home, match.homeName) && namesLikelyMatch(away, match.awayName)) ||
      (namesLikelyMatch(home, match.awayName) && namesLikelyMatch(away, match.homeName))
    );
  });

  return found?.poster;
};

// TheSportsDB's per-match backdrop (strThumb/strBanner/strPoster), matched
// by team name only — TheSportsDB events don't carry a precise kickoff
// timestamp comparable to streamed.pk's, so date isn't used as a filter here.
// Returns `backdrop` (the full-bleed background, preferring strThumb) and
// `banner` (TheSportsDB's dedicated matchup artwork) separately so the hero
// carousel can render them in two different spots instead of collapsing both
// into one image.
export const findSportsDbBackdrop = (
  match: NormalizedMatch,
  sportsDbEvents: any[],
): { backdrop?: string; banner?: string } | undefined => {
  const found = sportsDbEvents.find(
    (event) =>
      (namesLikelyMatch(event.strHomeTeam || "", match.homeName) &&
        namesLikelyMatch(event.strAwayTeam || "", match.awayName)) ||
      (namesLikelyMatch(event.strHomeTeam || "", match.awayName) &&
        namesLikelyMatch(event.strAwayTeam || "", match.homeName)),
  );
  if (!found) return undefined;
  return {
    backdrop: found.strThumb || found.strBanner || found.strPoster,
    banner: found.strBanner || undefined,
  };
};

// Shared by every "find the matching fixture by team name" lookup below —
// one normalized-team-name comparison, reused instead of re-implemented per
// data source pairing.
export const findFixtureByTeams = (
  home: string,
  away: string,
  fixtures: NormalizedMatch[],
): NormalizedMatch | null =>
  fixtures.find(
    (fixture) =>
      (namesLikelyMatch(home, fixture.homeName) && namesLikelyMatch(away, fixture.awayName)) ||
      (namesLikelyMatch(home, fixture.awayName) && namesLikelyMatch(away, fixture.homeName)),
  ) || null;

// The inverse lookup — given a streamed.pk match, find the corresponding
// fixture (e.g. an ESPN football match) so its real score/goal events can be
// merged into the streamed.pk card instead of showing a blank "- : -".
export const findFixtureForStreamed = (
  streamed: StreamedMatch,
  fixtures: NormalizedMatch[],
): NormalizedMatch | null => {
  const [titleHome, titleAway] = streamed.title.split(/\s+vs\.?\s+/i);
  const home = streamed.teams?.home?.name || titleHome || "";
  const away = streamed.teams?.away?.name || titleAway || "";
  return findFixtureByTeams(home, away, fixtures);
};
