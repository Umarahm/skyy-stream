# Integration Plan — Sports Page

How [`espn-api.md`](./espn-api.md) and [`streamed-pk-api.md`](./streamed-pk-api.md)
map onto this codebase's existing structure. This is a plan, not yet implemented.

## Where it fits

This project already has the shape for this feature — it's the same pattern used for
anime/movies, just a new vertical:

```
src/
  Utils/
    axios.tsx          # per-service axios instance, baseURL set per external API
    fetch.tsx           # axiosFetch(): single param-bag fetch helper keyed by requestID
    cache.tsx / clientCache.tsx
  pages/
    api/                # Next.js API routes — used as server-side proxies
    schedule.tsx         # thin page wrapper -> <SchedulePage />
  components/
    SchedulePage/        # the actual UI + data-fetching logic
```

Following that pattern for sports:

```
src/
  Utils/
    espn.ts             # new axios instance, baseURL https://site.api.espn.com
    streamedpk.ts        # new axios instance, baseURL https://streamed.pk/api
  pages/
    api/
      sports/
        scoreboard.ts    # proxy -> ESPN site API (adds caching, hides any future key)
        standings.ts     # proxy -> ESPN /apis/v2/ standings (encapsulates the apis/v2 vs apis/site/v2 gotcha)
        live.ts          # proxy -> streamed.pk /api/matches/live
    sports.tsx           # thin page wrapper, mirrors schedule.tsx
  components/
    SportsPage/
      index.tsx
      SportSelector.tsx   # built from ESPN sport list + streamed.pk /api/sports
      Scoreboard.tsx
      Standings.tsx
      LiveMatchCard.tsx   # cross-references ESPN event with streamed.pk match by team/time
```

## Why proxy through `pages/api/` instead of calling client-side

1. **The `/apis/site/v2/` vs `/apis/v2/` standings gotcha** belongs in one place
   server-side, not repeated in every component that needs standings.
2. **Caching** — ESPN is unofficial/unauthenticated with no rate-limit guarantee;
   a server route can cache scoreboard/standings responses for e.g. 30–60s
   (live scores) or 5–10 min (standings) using the existing
   [`Utils/cache.tsx`](../../src/Utils/cache.tsx) helpers, the same way other
   external-data fetches in this app are cached.
3. **Streamed.pk match → ESPN event reconciliation** (matching by team name +
   kickoff time) is business logic, not view logic — keep it in an API route or a
   `Utils/sportsMatch.ts` helper, not inline in a component.

## Data flow for one sport (example: cricket)

1. `GET /api/sports/scoreboard?sport=cricket&league={league}` (your proxy)
   → internally hits ESPN Core API `/v2/sports/cricket/leagues/{league}/events`
   (not `scoreboard` — that 404s for cricket per [`espn-api.md`](./espn-api.md)).
2. Component renders fixtures from step 1 (team names, badges via ESPN team logos,
   start time, status).
3. In parallel, `GET /api/sports/live?sport=cricket` (your proxy) → streamed.pk
   `/api/matches/cricket/popular` or `/live`.
4. Match streamed.pk entries to ESPN fixtures by team name + date proximity. Where
   matched, surface a "Watch Live" affordance using the streamed.pk match's
   `sources[]` → resolved lazily on click via `/api/stream/{source}/{id}`.
5. No match found → fixture still renders (score/status from ESPN), just without a
   watch link.

## Sport selector

Don't hardcode the sport list in the UI. Two independent discovery sources:

- ESPN sports are effectively fixed (17 sports, documented in
  [`espn-api.md`](./espn-api.md)) — fine to hardcode the sport→league slug map as a
  TypeScript const, since league slugs aren't exposed via a discovery endpoint.
- Streamed.pk sport list **is** dynamic — fetch `/api/sports` rather than
  hardcoding, since stream-availability categories can change independently of
  what ESPN tracks.

Treat "which sports show a Watch Live button" (intersection with streamed.pk's
current `/api/sports` list) as a runtime computation, not a fixed set — it'll
naturally include/exclude cricket, MMA, boxing etc. based on what's actually live.

## Cricket specifically

Cricket is the one sport in scope here that needs special-casing on the ESPN side
(no fixed league slug, no working `scoreboard` endpoint — see
[`espn-api.md#cricket`](./espn-api.md#cricket--sport-slug-cricket)). Plan for:

- Discover cricket league slugs at startup/cache-warm time via the league catalog
  endpoint, rather than assuming a fixed slug like `nfl`/`nba`.
- Use `/events` + `/events/{event}/competitions/{competition}` instead of
  `scoreboard` for fixtures.
- Streamed.pk side is uniform — `cricket` is just another `id` from `/api/sports`,
  no special-casing needed there.

## Open decision before building the "Watch Live" part

Scores/standings/news (ESPN side) are uncontroversial sports data, same risk profile
as TMDB/AniList already used in this app. The streamed.pk integration is a different
category — it serves third-party live-broadcast embeds of unclear provenance (see the
note in [`README.md`](./README.md)). Recommend building the ESPN-backed
scoreboard/standings/schedule UI first, and treating "Watch Live" embeds as a
separate, explicitly-approved follow-up rather than bundling both into one PR.
