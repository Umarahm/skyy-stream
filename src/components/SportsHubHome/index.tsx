import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./style.module.scss";
import shellStyles from "@/components/SportsShell/style.module.scss";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Navbar from "@/components/Navbar";
import SportsSubNav from "@/components/SportsSubNav";
import ScrollRail from "@/components/SportsShared/ScrollRail";
import WatchLiveModal, { WatchTarget } from "@/components/SportsShared/WatchLiveModal";
import { useInView } from "@/components/SportsShared/useInView";
import {
  HOMEPAGE_SPORTS_DB_NAMES,
  NormalizedMatch,
  SPORTS_CONFIG,
  getEspnNews,
  getFootballLiveToday,
  getMultiSportEventsToday,
  getSportsDbEventsSeason,
  getSportsDbNextLeagueEvents,
  getSportsDbPastLeagueEvents,
  getWorldCupEventsToday,
  getStreamedAllTodayMatches,
  getStreamedLiveAll,
  getStreamedMatches,
  normalizeSportsDbEvent,
  normalizeStreamedMatch,
  resolveStreamedAsset,
  sortMatchesByStatus,
} from "@/Utils/sports";
import { EVENTS_CONFIG } from "@/Utils/sportsEvents";
import { CRICKET_LEAGUES, FOOTBALL_LEAGUES } from "@/Utils/sportsLeagues";
import { NewsArticle, normalizeArticles } from "@/components/FifaNewsPage";
import {
  StreamedMatch,
  findFixtureByTeams,
  findFixtureForStreamed,
  findSportsDbBackdrop,
  findStreamedMatch,
  findStreamedPoster,
} from "@/Utils/sportsMatch";
import SportsHero from "./SportsHero";
import WideMatchCard, { WideMatchCardSkeleton } from "./WideMatchCard";

const RAIL_SKELETON_COUNT = 4;

// Football and cricket appear first in the hero carousel; all other sports
// follow. Within each priority tier matches are sorted live → upcoming → finished.
const CAROUSEL_SPORT_PRIORITY: Record<string, number> = {
  Football: 0,
  Soccer: 0,
  "FIFA World Cup": 0, // ESPN-sourced matches carry fifaEvent.label as their sportLabel
  Cricket: 1,
};
const RailSkeleton = () => (
  <>
    {Array.from({ length: RAIL_SKELETON_COUNT }).map((_, i) => (
      <WideMatchCardSkeleton key={i} />
    ))}
  </>
);

const NewsTileSkeleton = () => (
  <div className={styles.newsTile}>
    <Skeleton className={styles.newsTileImage} />
    <Skeleton count={2} />
  </div>
);

const fifaEvent = EVENTS_CONFIG.fifaWorldCup;
const fifaConfig = SPORTS_CONFIG.football;

// The football scoreboard is the only homepage feed cached for 30s instead
// of 30 minutes (see backendfetch.ts) — match the poll cadence to that.
const FOOTBALL_LIVE_POLL_MS = 30 * 1000;

const SPORTSDB_TO_STREAMED_ID: Record<string, string> = {
  Cricket: "cricket",
  Basketball: "basketball",
  Baseball: "baseball",
  "Ice Hockey": "hockey",
};

const toDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const todayAsDate = () => toDateString(new Date());

// Merges a streamed.pk entry with its matching football fixture (if any) so
// the card shows a real score and goal scorer/time, instead of streamed.pk's
// blank "- : -" (it carries no score data of its own) — and ESPN's team logo
// (a real country flag, e.g. teamlogos/countries/500/qat.png) instead of
// streamed.pk's own scraped team badge. `backdrop` is deliberately left
// untouched — the card's image always stays streamed.pk's own poster.
const enrichStreamedWithFixture = (
  normalized: NormalizedMatch,
  raw: StreamedMatch,
  fixtures: NormalizedMatch[],
): NormalizedMatch => {
  const fixture = findFixtureForStreamed(raw, fixtures);
  if (!fixture) return normalized;
  return {
    ...normalized,
    homeLogo: fixture.homeLogo || normalized.homeLogo,
    awayLogo: fixture.awayLogo || normalized.awayLogo,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    statusDetail: fixture.statusDetail,
    keyEvents: fixture.keyEvents,
  };
};

const SportsHubHome = () => {
  // --- Above-the-fold data: hero carousel, Live Now, Live & Upcoming.
  // Fetched immediately on mount — everything else below is loaded lazily,
  // only once the user scrolls near it (see newsRef/moreLiveRef below).
  const [matches, setMatches] = useState<NormalizedMatch[]>([]);
  const [footballMatches, setFootballMatches] = useState<NormalizedMatch[]>([]);
  const [streamedMatches, setStreamedMatches] = useState<StreamedMatch[]>([]);
  const [liveStreamed, setLiveStreamed] = useState<StreamedMatch[]>([]);
  // TheSportsDB World Cup raw events — merged pool used as the backdrop
  // lookup source for ESPN football fixtures. `sportsDbFootballArtwork`
  // combines today's events + next/past league endpoints (curated, reliably
  // have strThumb/strBanner) + the full season (back-fills images later).
  const [worldCupEvents, setWorldCupEvents] = useState<any[]>([]);
  const [sportsDbFootballSeason, setSportsDbFootballSeason] = useState<any[]>([]);
  const [sportsDbFootballNext, setSportsDbFootballNext] = useState<any[]>([]);
  const [sportsDbFootballPast, setSportsDbFootballPast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchTarget, setWatchTarget] = useState<WatchTarget | null>(null);

  // --- Below-the-fold data: fetched on-scroll via useInView, not on mount.
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const newsLoadedRef = useRef(false);
  const { ref: newsRef, inView: newsInView } = useInView<HTMLDivElement>();

  const [allStreamed, setAllStreamed] = useState<StreamedMatch[]>([]);
  const [moreLiveLoading, setMoreLiveLoading] = useState(false);
  const moreLiveLoadedRef = useRef(false);
  const { ref: moreLiveRef, inView: moreLiveInView } = useInView<HTMLDivElement>();

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const date = todayAsDate();
      const [
        eventResults, streamedResults, footballStreamed, liveResults,
        worldCupResults, seasonResult, nextResult, pastResult,
      ] = await Promise.all([
        getMultiSportEventsToday(date),
        Promise.all(
          HOMEPAGE_SPORTS_DB_NAMES.map((name) => getStreamedMatches(SPORTSDB_TO_STREAMED_ID[name])),
        ),
        getStreamedMatches(fifaConfig.streamedId),
        getStreamedLiveAll(),
        getWorldCupEventsToday(date),
        getSportsDbEventsSeason(fifaConfig.sportsDbLeagueId, fifaConfig.sportsDbSeason),
        getSportsDbNextLeagueEvents(fifaConfig.sportsDbLeagueId),
        getSportsDbPastLeagueEvents(fifaConfig.sportsDbLeagueId),
      ]);

      if (!active) return;
      setMatches(eventResults);
      setStreamedMatches([...streamedResults.flat(), ...(footballStreamed || [])]);
      setLiveStreamed(liveResults || []);
      setWorldCupEvents(worldCupResults || []);
      setSportsDbFootballSeason(seasonResult.events || []);
      setSportsDbFootballNext(nextResult.events || []);
      setSportsDbFootballPast(pastResult.events || []);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  // Polled independently on a short cadence (matches the 30s cache TTL on
  // this one endpoint) so live football scores/goals stay fresh without
  // re-fetching streamed.pk/news/leagues every tick.
  useEffect(() => {
    let active = true;

    const loadFootball = () => {
      getFootballLiveToday(fifaEvent.label).then((result) => {
        if (active) setFootballMatches(result);
      });
    };

    loadFootball();
    const interval = setInterval(loadFootball, FOOTBALL_LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // FIFA News rail's data only fetches once its section scrolls into view.
  useEffect(() => {
    if (!newsInView || newsLoadedRef.current || !fifaEvent.enabled) return;
    newsLoadedRef.current = true;
    setNewsLoading(true);
    getEspnNews(fifaConfig.espnSport, fifaConfig.espnLeague).then((result) => {
      setNews(normalizeArticles(result.articles).slice(0, 6));
      setNewsLoading(false);
    });
  }, [newsInView]);

  // "More Live Events" only fetches once the user scrolls near it. Using
  // "/matches/all-today" (today's matches only) instead of "/matches/all"
  // (streamed.pk's entire catalog, every sport, all time) keeps this fast
  // enough to actually resolve instead of silently timing out/erroring —
  // which is why the rail previously appeared to never render anything.
  useEffect(() => {
    if (!moreLiveInView || moreLiveLoadedRef.current) return;
    moreLiveLoadedRef.current = true;
    setMoreLiveLoading(true);
    getStreamedAllTodayMatches().then((result) => {
      const liveIds = new Set(liveStreamed.map((m) => m.id));
      setAllStreamed((result || []).filter((m) => !liveIds.has(m.id)).slice(0, 24));
      setMoreLiveLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moreLiveInView]);

  // ESPN's football scoreboard has no backdrop image field at all. Look up
  // TheSportsDB artwork by team-name fuzzy match — prefer the full-season
  // endpoint (strThumb/strBanner are back-filled there after each match is
  // indexed, so it's more reliably populated than the per-day endpoint) and
  // fall back to today's events then streamed.pk.
  // next/past league endpoints are curated by TheSportsDB and consistently
  // have strThumb/strBanner populated — put them first so they win over the
  // season dump (which back-fills artwork slowly) and today's day endpoint.
  const footballBackdropPool = [
    ...sportsDbFootballNext,
    ...sportsDbFootballPast,
    ...sportsDbFootballSeason,
    ...worldCupEvents,
  ];
  const footballMatchesWithBackdrop = footballMatches.map((match) => {
    if (match.backdrop) return match;
    const sportsDbAssets = findSportsDbBackdrop(match, footballBackdropPool);
    if (sportsDbAssets?.backdrop) {
      return { ...match, backdrop: sportsDbAssets.backdrop, banner: sportsDbAssets.banner };
    }
    const streamedPoster = resolveStreamedAsset(findStreamedPoster(match, streamedMatches));
    return streamedPoster ? { ...match, backdrop: streamedPoster } : match;
  });
  const combinedMatches = sortMatchesByStatus([...matches, ...footballMatchesWithBackdrop]);

  const heroMatches = [
    ...matches,
    ...footballMatchesWithBackdrop,
  ].sort((a, b) => {
    const statusOrder: Record<string, number> = { in: 0, pre: 1, post: 2 };
    const statusDiff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
    if (statusDiff !== 0) return statusDiff;
    const aPrio = CAROUSEL_SPORT_PRIORITY[a.sportLabel ?? ""] ?? 99;
    const bPrio = CAROUSEL_SPORT_PRIORITY[b.sportLabel ?? ""] ?? 99;
    if (aPrio !== bPrio) return aPrio - bPrio;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const handleWatchLive = (match: NormalizedMatch) => {
    const streamedMatch = findStreamedMatch(match, streamedMatches);
    const source = streamedMatch?.sources?.[0];
    if (!streamedMatch || !source) return;
    setWatchTarget({
      title: `${match.homeName} vs ${match.awayName}`,
      source: source.source,
      id: source.id,
    });
  };

  const handleWatchStreamed = (raw: StreamedMatch) => {
    const source = raw.sources?.[0];
    if (!source) return;
    setWatchTarget({ title: raw.title, source: source.source, id: source.id });
  };

  return (
    <div className={shellStyles.sportsPage}>
      <Navbar hub="sports" />
      <SportsHero matches={heroMatches} />

      <div className={styles.content}>
        <SportsSubNav />

        {fifaEvent.enabled && (
          <Link href="/sports-fifa-schedule" className={styles.fifaPromo}>
            <img src={fifaEvent.logo} alt={fifaEvent.label} className={styles.fifaPromoLogo} />
            <div>
              <h3>{fifaEvent.label}</h3>
              <p>View the tournament hub — schedule, standings, news & highlights</p>
            </div>
          </Link>
        )}

        {loading ? (
          <div className={shellStyles.section}>
            <ScrollRail title="Live & Upcoming">
              <RailSkeleton />
            </ScrollRail>
          </div>
        ) : (
          <>
            {liveStreamed.length > 0 && (
              <div className={shellStyles.section}>
                <ScrollRail title="Live Now">
                  {liveStreamed.map((raw) => {
                    const normalized = normalizeStreamedMatch(raw, "in");
                    if (!normalized) return null;
                    const enriched = enrichStreamedWithFixture(normalized, raw, footballMatches);
                    return (
                      <WideMatchCard
                        key={raw.id}
                        match={enriched}
                        canWatchLive={Boolean(raw.sources?.[0])}
                        onWatchLive={() => handleWatchStreamed(raw)}
                        showGoals
                      />
                    );
                  })}
                </ScrollRail>
              </div>
            )}

            <div className={shellStyles.section}>
              <ScrollRail title="Live & Upcoming">
                {combinedMatches.length === 0 ? (
                  <p className={shellStyles.message}>No matches found across sports right now.</p>
                ) : (
                  combinedMatches.map((match) => (
                    <WideMatchCard
                      key={match.id}
                      match={match}
                      canWatchLive={
                        match.status === "in" && Boolean(findStreamedMatch(match, streamedMatches))
                      }
                      onWatchLive={() => handleWatchLive(match)}
                      stacked
                    />
                  ))
                )}
              </ScrollRail>
            </div>

            {/* Below-the-fold: data for these sections is fetched lazily,
                only once each section's ref scrolls into view (see useInView
                above) instead of all at once on page load. */}
            {fifaEvent.enabled && (
              <div ref={newsRef} className={shellStyles.section}>
                <ScrollRail title="FIFA World Cup News">
                  {newsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <NewsTileSkeleton key={i} />)
                  ) : news.length > 0 ? (
                    news.map((article) => (
                      <Link
                        key={article.id}
                        href={`/sports-fifa-news-article?id=${article.id}`}
                        className={styles.newsTile}
                      >
                        <LazyLoadImage
                          src={article.image || "/images/logo.svg"}
                          alt={article.headline}
                          effect="opacity"
                          className={`${styles.newsTileImage} skeleton`}
                        />
                        <p className={styles.newsTileTitle}>{article.headline}</p>
                      </Link>
                    ))
                  ) : null}
                </ScrollRail>
              </div>
            )}

            <div className={shellStyles.section}>
              <ScrollRail title="Football Leagues">
                {FOOTBALL_LEAGUES.map((league) => (
                  <Link
                    key={league.id}
                    href={`/sports-league?id=${league.id}`}
                    className={styles.leagueTile}
                    data-sports-search-item
                    data-sports-search-label={`${league.label} League`}
                  >
                    <div className={styles.leagueLogoWrap}>
                      <LazyLoadImage
                        src={league.logo}
                        alt={league.label}
                        effect="opacity"
                        className={`${styles.leagueLogo} skeleton`}
                      />
                    </div>
                    <span>{league.label}</span>
                  </Link>
                ))}
              </ScrollRail>
            </div>

            <div ref={moreLiveRef} className={shellStyles.section}>
              <ScrollRail title="Cricket Leagues">
                {CRICKET_LEAGUES.map((league) => (
                  <Link
                    key={league.id}
                    href={`/sports-league?id=${league.id}`}
                    className={styles.leagueTile}
                    data-sports-search-item
                    data-sports-search-label={`${league.label} League`}
                  >
                    <div className={styles.leagueLogoWrap}>
                      <LazyLoadImage
                        src={league.logo}
                        alt={league.label}
                        effect="opacity"
                        className={`${styles.leagueLogo} skeleton`}
                      />
                    </div>
                    <span>{league.label}</span>
                  </Link>
                ))}
              </ScrollRail>
            </div>

            <div className={shellStyles.section}>
              <ScrollRail title="More Live Events">
                {moreLiveLoading ? (
                  <RailSkeleton />
                ) : allStreamed.length > 0 ? (
                  allStreamed.map((raw) => {
                    const normalized = normalizeStreamedMatch(raw, "pre");
                    if (!normalized) return null;
                    const enriched = enrichStreamedWithFixture(normalized, raw, footballMatches);
                    return (
                      <WideMatchCard
                        key={raw.id}
                        match={enriched}
                        canWatchLive={Boolean(raw.sources?.[0])}
                        onWatchLive={() => handleWatchStreamed(raw)}
                        stacked
                      />
                    );
                  })
                ) : moreLiveLoadedRef.current ? (
                  <p className={shellStyles.message}>No extra live events right now.</p>
                ) : null}
              </ScrollRail>
            </div>
          </>
        )}
      </div>

      {watchTarget && <WatchLiveModal target={watchTarget} onClose={() => setWatchTarget(null)} />}
    </div>
  );
};

export default SportsHubHome;
