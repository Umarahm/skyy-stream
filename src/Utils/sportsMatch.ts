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

  return (
    fixtures.find(
      (fixture) =>
        (namesLikelyMatch(home, fixture.homeName) && namesLikelyMatch(away, fixture.awayName)) ||
        (namesLikelyMatch(home, fixture.awayName) && namesLikelyMatch(away, fixture.homeName)),
    ) || null
  );
};
