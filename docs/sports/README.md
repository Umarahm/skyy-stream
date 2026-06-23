# Sports Feature — Reference Docs

This folder documents the two external APIs that the planned **Sports page**
will be built on, and how they map onto this project's existing conventions
(see [`src/Utils/axios.tsx`](../../src/Utils/axios.tsx), [`src/Utils/fetch.tsx`](../../src/Utils/fetch.tsx),
[`src/pages/api/`](../../src/pages/api/), [`src/components/SchedulePage`](../../src/components/SchedulePage)).

| Doc | What it covers |
|---|---|
| [`espn-api.md`](./espn-api.md) | ESPN's public (unofficial) sports data API — scores, schedules, standings, teams, athletes, news. Covers all 17 sports including cricket. |
| [`streamed-pk-api.md`](./streamed-pk-api.md) | Streamed.pk's API — match listings and live-stream embed links, organized by sport. |
| [`integration-plan.md`](./integration-plan.md) | How the two APIs combine into one Sports page in this Next.js app: proxy routes, caching, data shape, component layout. |

## Two different jobs

These APIs are **not interchangeable** — they serve different parts of the page:

- **ESPN API** → "What's the data?" Scores, fixtures/schedules, standings, team & player
  info, news. No video. This is the backbone of any scoreboard/schedule UI (same role
  TMDB plays for movies in this app, or AniList for anime).
- **Streamed.pk** → "Where do I watch it?" Returns an `embedUrl` per match/source for
  live video. No historical data, no stats, no auth.

A typical page flow: pull fixtures from ESPN (reliable, structured, has team
badges/logos and reliable IDs) → cross-reference by team names/kickoff time against
Streamed.pk's `/api/matches/{sport}` list to attach a "Watch Live" link when a match is
currently airing.

## ⚠️ Note on Streamed.pk

Streamed.pk is a free, unauthenticated aggregator of third-party live-stream embeds for
sports broadcasts — it does not appear to hold broadcast rights itself, and the embed
sources (`alpha`, `bravo`, `charlie`, …) are opaque third parties. Functionally this is
the same category of service as the anime-streaming aggregators already used elsewhere
in this codebase (`anikoto.ts`, `miruro.ts`), so it's consistent with existing project
patterns — but flagging it explicitly here since "embed live sports broadcasts" carries
different (and more visible) copyright exposure than on-demand anime. Worth a deliberate
go/no-go before wiring it into a real page, rather than assuming it's covered by the
existing pattern.
