// Short curated league list (not exhaustive) for the homepage "All Leagues"
// rails — IDs/logos verified directly against ESPN.
export type LeagueEntry = {
  id: string;
  label: string;
  kind: "espn"; // every entry is ESPN-backed now — cricket moved off TheSportsDB
  sport: "soccer" | "cricket";
  league: string; // espn league slug ("eng.1") or numeric league id ("8048")
  // ESPN's cricket scoreboard takes a bare year as `dates` and returns that
  // season's full fixture list + standings in one call (confirmed working);
  // football pages build their own date range instead, so this is unused there.
  season?: string;
  logo: string;
};

export const LEAGUES_CATALOG: LeagueEntry[] = [
  {
    id: "eng.1",
    label: "Premier League",
    kind: "espn",
    sport: "soccer",
    league: "eng.1",
    logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
  },
  {
    id: "esp.1",
    label: "La Liga",
    kind: "espn",
    sport: "soccer",
    league: "esp.1",
    logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
  },
  {
    id: "ger.1",
    label: "Bundesliga",
    kind: "espn",
    sport: "soccer",
    league: "ger.1",
    logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png",
  },
  {
    id: "ita.1",
    label: "Serie A",
    kind: "espn",
    sport: "soccer",
    league: "ita.1",
    logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png",
  },
  {
    id: "uefa.champions",
    label: "Champions League",
    kind: "espn",
    sport: "soccer",
    league: "uefa.champions",
    logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
  },
  {
    id: "8048",
    label: "IPL",
    kind: "espn",
    sport: "cricket",
    league: "8048",
    season: "2026",
    logo: "https://r2.thesportsdb.com/images/media/league/badge/gaiti11741709844.png",
  },
  {
    id: "8044",
    label: "Big Bash League",
    kind: "espn",
    sport: "cricket",
    league: "8044",
    season: "2026",
    logo: "https://r2.thesportsdb.com/images/media/league/badge/yko7ny1546635346.png",
  },
  {
    id: "21266",
    label: "Major League Cricket",
    kind: "espn",
    sport: "cricket",
    league: "21266",
    season: "2026",
    logo: "https://r2.thesportsdb.com/images/media/league/badge/mbbos01689159510.png",
  },
];

export const FOOTBALL_LEAGUES = LEAGUES_CATALOG.filter((l) => l.sport === "soccer");
export const CRICKET_LEAGUES = LEAGUES_CATALOG.filter((l) => l.sport === "cricket");

export const getLeagueById = (id: string): LeagueEntry | undefined =>
  LEAGUES_CATALOG.find((l) => l.id === id);
