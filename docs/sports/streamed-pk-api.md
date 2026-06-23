# Streamed.pk API Reference

Source: https://streamed.pk/docs/ (pasted directly from the site — see caveat below
on why this couldn't be re-fetched automatically).

> **Free, unauthenticated, no documented rate limit ("may change in future").**
> Returns JSON only. Standard HTTP status codes. No SDK — plain `fetch`/`axios`
> against `https://streamed.pk/api/...`.

> **⚠️ Content note:** this API aggregates third-party `embedUrl` links for live
> sports broadcasts. The embed sources (`alpha`, `bravo`, `charlie`, …) are opaque —
> Streamed.pk doesn't say who operates them or whether they're authorized
> broadcasters. Worth a deliberate decision before wiring this into the app for real
> (see the note in [`README.md`](./README.md)) — this doc just records the API shape.

## Base URL

```
https://streamed.pk/api
```

## Endpoint summary

| Resource | Endpoint | Description |
|---|---|---|
| Matches | `/api/matches/...` | Sports events data |
| Streams | `/api/stream/...` | Stream links for an event |
| Sports | `/api/sports` | List of available sport categories |
| Images | `/api/images/...` | Team badges & event posters |

## 1. Sports — `/api/sports`

Returns every sport category available right now. Use the returned `id` as the
`{SPORT}` path segment for the Matches endpoints below — **don't hardcode a sport
list**, this is the discovery endpoint and includes cricket (`cricket`) alongside
football, basketball, tennis, hockey, baseball, MMA, boxing, etc.

```ts
interface Sport {
  id: string;   // e.g. "football", "cricket" — used in Matches API
  name: string; // display name, e.g. "Football"
}
```

```bash
curl https://streamed.pk/api/sports
```

```json
[
  { "id": "football", "name": "Football" },
  { "id": "basketball", "name": "Basketball" },
  { "id": "cricket", "name": "Cricket" },
  { "id": "tennis", "name": "Tennis" },
  { "id": "hockey", "name": "Hockey" },
  { "id": "baseball", "name": "Baseball" },
  { "id": "mma", "name": "MMA" },
  { "id": "boxing", "name": "Boxing" }
]
```

## 2. Matches — `/api/matches/...`

```ts
interface APIMatch {
  id: string;
  title: string;            // "Team A vs Team B"
  category: string;         // sport id, e.g. "football"
  date: number;              // unix ms
  poster?: string;           // path, combine with /api/images/poster/
  popular: boolean;
  teams?: {
    home?: { name: string; badge: string };
    away?: { name: string; badge: string };
  };
  sources: { source: string; id: string }[]; // -> feed into Streams API
}
```

| Endpoint | Description |
|---|---|
| `GET /api/matches/[SPORT]` | All matches for a sport (use a sport `id` from `/api/sports`) |
| `GET /api/matches/[SPORT]/popular` | Same, popular only |
| `GET /api/matches/all` | All matches, all sports |
| `GET /api/matches/all/popular` | All matches, popular only |
| `GET /api/matches/all-today` | Matches scheduled today |
| `GET /api/matches/all-today/popular` | Today, popular only |
| `GET /api/matches/live` | Currently live matches |
| `GET /api/matches/live/popular` | Currently live, popular only |

For cricket specifically: `GET /api/matches/cricket`, `/api/matches/cricket/popular`
(same shape as every other sport — `cricket` is just another `id` from `/api/sports`).

## 3. Streams — `/api/stream/{source}/{id}`

Each match's `sources[]` array tells you which source+id pair to hit. Sources are
fixed identifiers (NATO-alphabet style), not sport-specific:

| Source | Endpoint |
|---|---|
| Alpha | `GET /api/stream/alpha/[id]` |
| Bravo | `GET /api/stream/bravo/[id]` |
| Charlie | `GET /api/stream/charlie/[id]` |
| Delta | `GET /api/stream/delta/[id]` |
| Echo | `GET /api/stream/echo/[id]` |
| Foxtrot | `GET /api/stream/foxtrot/[id]` |
| Golf | `GET /api/stream/golf/[id]` |
| Hotel | `GET /api/stream/hotel/[id]` |
| Intel | `GET /api/stream/intel/[id]` |

```ts
interface Stream {
  id: string;
  streamNo: number;
  language: string;  // "English", "Spanish", ...
  hd: boolean;
  embedUrl: string;  // <iframe src> target
  source: string;
}
```

Response is an **array** of streams (multiple languages/qualities per source):

```json
[
  { "id": "stream_456", "streamNo": 1, "language": "English", "hd": true,
    "embedUrl": "https://embed.example.com/watch?v=abcd1234", "source": "alpha" },
  { "id": "stream_457", "streamNo": 2, "language": "Spanish", "hd": false,
    "embedUrl": "https://embed.example.com/watch?v=efgh5678", "source": "alpha" }
]
```

### End-to-end flow

```js
const matches = await fetch('https://streamed.pk/api/matches/cricket').then(r => r.json());
const match = matches[0];
const { source, id } = match.sources[0];
const streams = await fetch(`https://streamed.pk/api/stream/${source}/${id}`).then(r => r.json());
// streams[0].embedUrl -> <iframe src={embedUrl} />
```

## 4. Images — `/api/images/...`

All served as WebP.

| Endpoint | Purpose |
|---|---|
| `GET /api/images/badge/[id].webp` | Team badge. `[id]` = `team.badge` field from a match object |
| `GET /api/images/poster/[homeBadge]/[awayBadge].webp` | Composited match poster from both team badges |
| `GET /api/images/proxy/[poster].webp` | Generic image proxy. `[poster]` = `match.poster` field |

```html
<img src="https://streamed.pk/api/images/badge/man-utd-badge.webp" alt="Man Utd" />
<img src="https://streamed.pk/api/images/poster/man-utd-badge/liverpool-badge.webp" />
<img src="https://streamed.pk/api/images/proxy/custom-event-poster.webp" />
```

## Notes for this project

- No API key / auth handling needed — this is a plain `axios` instance like
  [`Utils/axios.tsx`](../../src/Utils/axios.tsx), `baseURL: "https://streamed.pk/api"`.
- `date` is unix **milliseconds** — straightforward `new Date(match.date)`, no
  timezone math needed server-side.
- Always resolve `sources[]` → `/api/stream/{source}/{id}` lazily (on match-detail
  view), not when listing matches — avoids N+1 fetches against every source for
  every match in a list view.
- `popular` matches are a good fit for a homepage rail; `all-today` / `live` map
  directly onto "Schedule" and "Live Now" sections.

## Why this doc was pasted, not fetched

This page (and the rest of `streamed.pk`) was unreachable from this environment —
both `curl` and `Invoke-WebRequest` failed at the TLS handshake stage itself (not a
404/timeout, the connection is rejected before any HTTP response), consistent with
TLS/JA3 fingerprint-based bot blocking. Content above was supplied directly by the
user from the live page rather than fetched by the agent.
