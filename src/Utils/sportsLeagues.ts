// Short curated league list (not exhaustive) for the homepage "All Leagues"
// rails — IDs/logos verified directly against ESPN/TheSportsDB.
export type LeagueEntry = {
  id: string;
  label: string;
  kind: "espn" | "sportsdb";
  sport: string; // espn sport slug, or TheSportsDB sport name
  league: string; // espn league slug, or TheSportsDB league id
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
    id: "4460",
    label: "IPL",
    kind: "sportsdb",
    sport: "Cricket",
    league: "4460",
    logo: "https://r2.thesportsdb.com/images/media/league/badge/gaiti11741709844.png",
  },
  {
    id: "4461",
    label: "Big Bash League",
    kind: "sportsdb",
    sport: "Cricket",
    league: "4461",
    logo: "https://r2.thesportsdb.com/images/media/league/badge/yko7ny1546635346.png",
  },
  {
    id: "5401",
    label: "Major League Cricket",
    kind: "sportsdb",
    sport: "Cricket",
    league: "5401",
    logo: "https://r2.thesportsdb.com/images/media/league/badge/mbbos01689159510.png",
  },
];

export const FOOTBALL_LEAGUES = LEAGUES_CATALOG.filter((l) => l.kind === "espn");
export const CRICKET_LEAGUES = LEAGUES_CATALOG.filter((l) => l.kind === "sportsdb");

export const getLeagueById = (id: string): LeagueEntry | undefined =>
  LEAGUES_CATALOG.find((l) => l.id === id);
