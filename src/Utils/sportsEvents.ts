// Curated "events" layered on top of the generic sport data (SPORTS_CONFIG).
// Flip `enabled` to false to pull an event's tile/pages out of the hub
// without deleting any of the underlying football/cricket plumbing.
export const EVENTS_CONFIG = {
  fifaWorldCup: {
    enabled: true,
    label: "FIFA World Cup",
    shortLabel: "FIFA",
    logo: "/images/FIFA26logo.svg",
    sport: "football" as const, // reuses SPORTS_CONFIG.football's espnLeague/sportsDbLeagueId
  },
};
