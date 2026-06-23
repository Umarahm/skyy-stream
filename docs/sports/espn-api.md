# ESPN Public API Reference

Source: [pseudo-r/Public-ESPN-API](https://github.com/pseudo-r/Public-ESPN-API)
([README](https://github.com/pseudo-r/Public-ESPN-API/blob/main/README.md),
[docs/README](https://github.com/pseudo-r/Public-ESPN-API/blob/main/docs/README.md),
[response_schemas](https://github.com/pseudo-r/Public-ESPN-API/blob/main/docs/response_schemas.md),
[_global](https://github.com/pseudo-r/Public-ESPN-API/blob/main/docs/sports/_global.md))

> **This is not an official ESPN API.** It is community-documented reverse engineering
> of endpoints ESPN's own website/apps use. No auth, no SLA, no rate-limit guarantee,
> and individual endpoints can change or disappear without notice. The maintainers
> state all documented domains were live-verified via browser HTTP tests on 2026-03-26.
> Build with caching + graceful fallback, not as a hard dependency.

## Coverage

17 sports / 139+ leagues documented, including **Australian Football, Baseball,
Basketball, Cricket, Field Hockey, Football (American), Golf, Hockey, Lacrosse, MMA,
Racing, Rugby, Rugby League, Soccer, Tennis, Volleyball, Water Polo**.

## The 6 API domains

| Domain | Used for |
|---|---|
| `site.api.espn.com/apis/site/v2/` | Scoreboards, teams, news, rosters, schedules, summaries — the main "user-friendly" feed |
| `site.api.espn.com/apis/v2/` | **Standings only.** The `apis/site/v2/.../standings` path returns an empty/stub response for many leagues — this is the most common gotcha in this API. |
| `site.web.api.espn.com/apis/common/v3/` | Athlete profiles & detailed statistics |
| `sports.core.api.espn.com/v2/` and `v3/` | The low-level "core" data graph — events → competitions → plays/odds/broadcasts, full athlete/team/venue directories, with deep pagination |
| `cdn.espn.com/core/` | Full game packages (drives, plays, win-probability) — append `?xhr=1` |
| `now.core.api.espn.com/v1/` | Real-time news feed |

## General request shape

```
# Site API (scores/teams/news) — what you'll use 90% of the time
GET https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/{resource}

# Standings (note the missing "site" segment)
GET https://site.api.espn.com/apis/v2/sports/{sport}/{league}/standings

# Core API (deep data graph)
GET https://sports.core.api.espn.com/v2/sports/{sport}/leagues/{league}/{resource}
```

`{resource}` is commonly one of: `scoreboard`, `teams`, `teams/{id}/roster`,
`teams/{id}/schedule`, `teams/{id}/injuries`, `news`, `summary?event={id}`.

### Common query parameters

| Param | Meaning | Example |
|---|---|---|
| `dates` | Filter by date (or range) | `20260622` |
| `week` | Week number (NFL/college football) | `1`–`18` |
| `seasontype` | `1`=pre, `2`=regular, `3`=post | `2` |
| `season` | Year | `2026` |
| `groups` | Conference/league subgroup (college sports, soccer stages) | `groups=80` (FBS) |
| `page`, `limit` | Pagination on Core API list endpoints | `limit=500` |
| `sort`, `active`, `position`, `country`, `gender` | Filters on athlete/team list endpoints | |
| `xhr=1` | Required on `cdn.espn.com` package requests | |

## Sport-by-sport league slugs

### Football (American) — sport slug `football`
| League | Slug |
|---|---|
| NFL | `nfl` |
| NCAA Football | `college-football` |
| CFL | `cfl` |
| UFL | `ufl` |
| XFL | `xfl` |

Extras: QBR ratings, recruiting classes, SP+ Power Index, win-probability/odds inside
CDN game packages.

### Basketball — sport slug `basketball`
15 leagues: `nba`, `wnba`, `nba-development` (G League), `mens-college-basketball`,
`womens-college-basketball`, `nbl`, `fiba`, plus Olympics/summer-league variants.
Extras: NCAA Bracketology, BPI ratings.

### Baseball — sport slug `baseball`
`mlb`, `college-baseball`, `college-softball`, `world-baseball-classic`,
`caribbean-series`, `dominican-winter-league`, `puerto-rican-winter-league`,
`venezuelan-winter-league`, `mexican-winter-league`, `olympics-baseball`, `llb`/`lls`
(Little League).

### Soccer — sport slug `soccer`
By far the largest league list. Highlights:
- **International:** `fifa.world`, `fifa.wwc`, `fifa.world.u20`, `fifa.cwc`,
  `fifa.friendly`, `fifa.olympics`, `fifa.worldq`
- **UEFA:** `uefa.champions`, `uefa.europa`, `uefa.europa.conf`, `uefa.euro`,
  `uefa.wchampions`, `uefa.nations`
- **England:** `eng.1` (Premier League), `eng.2` (Championship), `eng.fa`, `eng.league_cup`
- **Spain:** `esp.1` (LaLiga), `esp.2`, `esp.copa_del_rey`
- **Germany:** `ger.1` (Bundesliga), `ger.2`, `ger.dfb_pokal`
- **Italy:** `ita.1` (Serie A), `ita.2`, `ita.coppa_italia`
- **France:** `fra.1` (Ligue 1), `fra.2`, `fra.coupe_de_france`
- **USA/CONCACAF:** `usa.1` (MLS), `usa.nwsl`, `usa.open`, `concacaf.champions`,
  `concacaf.gold`, `concacaf.nations.league`
- **Mexico:** `mex.1`, `mex.2`
- **South America:** `conmebol.libertadores`, `conmebol.sudamericana`,
  `conmebol.america`, `arg.1`, `bra.1`, `chi.1`, `col.1`
- **Africa:** `caf.nations`, `caf.champions`, `rsa.1`, `nga.1`
- **Asia/Oceania:** `afc.champions`, `jpn.1`, `chn.1`, `ind.1`, `ksa.1`, `aus.1`

Soccer-specific endpoints worth knowing:
| Resource | Notes |
|---|---|
| `summary?event={id}` | Full match report |
| `competitions/{id}/plays?limit=300` | Play-by-play (goals/cards/subs) — set `limit=300` to get the whole match |
| `competitions/{id}/situation` | Live match context |
| `competitions/{id}/probabilities` | Win probability |
| `teams/{id}/roster`, `teams/{id}/injuries`, `teams/{id}/schedule` | Team detail pages |

### Cricket — sport slug `cricket`
- **Core v2:** `https://sports.core.api.espn.com/v2/sports/cricket/leagues/{league}/...`
- **Core v3:** `https://sports.core.api.espn.com/v3/sports/cricket/leagues/{league}/...`
- **Site API:** `https://site.api.espn.com/apis/site/v2/sports/cricket/{league}/...`

> **⚠️ The cricket `scoreboard` resource on the Site API 404s on all tested domains.**
> Use the Core API events endpoint instead (`/leagues/{league}/events`), or fall back
> to summary/event-by-event lookups. League slugs for cricket vary per tournament
> (no fixed enum, unlike the NFL/NBA-style leagues) — discover them via the league
> catalog endpoint rather than hardcoding.

Useful endpoints once you have a `{league}` slug:
| Resource | Purpose |
|---|---|
| `/calendar` | Match schedule, filterable by `dates`/`weeks`/`seasontype` |
| `/seasons`, `/seasons/{season}/athletes` | Season + roster data |
| `/teams`, `/athletes` | Team & player directories |
| `/events/{event}`, `/events/{event}/competitions/{competition}` | Individual match detail |
| `/events/{event}/competitions/{competition}/broadcasts` | Broadcast info |
| `/events/{event}/competitions/{competition}/odds` | Betting odds |
| `/rankings` | Team/player rankings |
| `/venues`, `/countries`, `/circuits`, `/positions` | Reference data |

### Racing (Motorsport) — sport slug `racing`
| League | Slug |
|---|---|
| Formula 1 | `f1` |
| IndyCar | `irl` |
| NASCAR Cup Series | `nascar-premier` |
| NASCAR Xfinity ("Secondary") | `nascar-secondary` |
| NASCAR Truck Series | `nascar-truck` |

### Australian Football — sport slug `australian-football`
Single league: `afl`. Same standings caveat as below applies (`/apis/v2/`, not
`/apis/site/v2/`).

### College sports (cross-sport bucket)
| Sport | League slug |
|---|---|
| Football | `college-football` |
| Men's Basketball | `mens-college-basketball` |
| Women's Basketball | `womens-college-basketball` |
| Baseball | `college-baseball` |

Conference filtering via `groups=`: `80` FBS, `4` ACC, `8` Big 12, `9` Pac-12, `12` SEC,
`21` Big Ten. Football/men's basketball also expose ranking endpoints and
SP+/BPI power indices.

### Golf, Tennis, MMA, and others
Documented in the same repo (`docs/sports/golf.md`, `tennis.md`, `mma.md`, etc., not
individually fetched here). Pattern is consistent: `sport` + `league` slug
(`golf`/`pga`, `tennis`/`atp`|`wta`, `mma`/`ufc`) against the same domains above. Golf
and tennis frequently use tournament/event names rather than numeric team IDs since
there are no "teams."

## ⚠️ Known gotchas (apply across sports)

1. **Standings 404/empty on Site API.** Always use
   `https://site.api.espn.com/apis/v2/sports/{sport}/{league}/standings`
   (no `/site/`), not `/apis/site/v2/.../standings`.
2. **Cricket scoreboard 404s.** Use Core API `/events` instead.
3. **CDN game packages need `?xhr=1`.**
4. **Site API athlete data is thin.** For real stats use the Core API
   (`sports.core.api.espn.com`) or `site.web.api.espn.com/apis/common/v3/`.
5. **Unofficial & unauthenticated** — no documented rate limit, but no guarantee
   either. Cache aggressively (this project already has [`Utils/cache.tsx`](../../src/Utils/cache.tsx)
   and [`Utils/clientCache.tsx`](../../src/Utils/clientCache.tsx) patterns used for anime
   metadata — reuse the same approach for scoreboard/standings responses).

## Example calls

```bash
# NFL scoreboard (today)
curl "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"

# NBA teams
curl "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams"

# MLB scores on a specific date
curl "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=20260622"

# Premier League standings (note /apis/v2/, not /apis/site/v2/)
curl "https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings"

# Cricket — list events for a league (NOT scoreboard)
curl "https://sports.core.api.espn.com/v2/sports/cricket/leagues/{league}/events"

# F1 scoreboard
curl "https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard"
```

## Response shapes (high level)

- **Scoreboard:** league metadata + array of `events`, each with competitions, team
  scores, status (`pre`/`in`/`post`), and statistical leaders.
- **Teams:** hierarchical sport → league → `teams[]`, each with id, `displayName`,
  colors, `logos[]`, and links.
- **Standings:** grouped by conference/division, each team entry has W/L record,
  win %, games-behind, and playoff-clinch indicator.
- **Athlete (core profile):** bio, position, physical measurements, draft history,
  college. Separate sub-resources for stats, game logs, splits, and an "overview"
  endpoint that bundles stat snapshot + upcoming schedule + recent news + injury status.
- **News:** headline articles (via the `now.core.api.espn.com` "Now" API) with
  publish date, image, and tags linking back to league/team/athlete IDs.
- **Odds (Core API):** spread/moneyline/over-under per sportsbook provider, including
  opening-line comparisons.

Full field-level schemas: see
[response_schemas.md](https://github.com/pseudo-r/Public-ESPN-API/blob/main/docs/response_schemas.md)
in the source repo.
