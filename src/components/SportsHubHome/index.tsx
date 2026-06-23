import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./style.module.scss";
import shellStyles from "@/components/SportsShell/style.module.scss";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import Navbar from "@/components/Navbar";
import SportsSubNav from "@/components/SportsSubNav";
import ScrollRail from "@/components/SportsShared/ScrollRail";
import WatchLiveModal, { WatchTarget } from "@/components/SportsShared/WatchLiveModal";
import {
  HOMEPAGE_SPORTS_DB_NAMES,
  NormalizedMatch,
  SPORTS_CONFIG,
  getEspnNews,
  getFootballLiveToday,
  getMultiSportEventsToday,
  getStreamedAllMatches,
  getStreamedLiveAll,
  getStreamedMatches,
  normalizeStreamedMatch,
} from "@/Utils/sports";
import { EVENTS_CONFIG } from "@/Utils/sportsEvents";
import { CRICKET_LEAGUES, FOOTBALL_LEAGUES } from "@/Utils/sportsLeagues";
import { NewsArticle, normalizeArticles } from "@/components/FifaNewsPage";
import { StreamedMatch, findFixtureForStreamed, findStreamedMatch } from "@/Utils/sportsMatch";
import SportsHero from "./SportsHero";
import WideMatchCard from "./WideMatchCard";

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

const todayAsDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const statusWeight: Record<NormalizedMatch["status"], number> = { in: 0, pre: 1, post: 2 };
const sortMatches = (items: NormalizedMatch[]) =>
  [...items].sort((a, b) => {
    const weightDiff = statusWeight[a.status] - statusWeight[b.status];
    if (weightDiff !== 0) return weightDiff;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

// Merges a streamed.pk "Live Now" entry with its matching football fixture
// (if any) so the card shows a real score and goal scorer/time, instead of
// streamed.pk's blank "- : -" (it carries no score data of its own).
const enrichStreamedWithFixture = (
  normalized: NormalizedMatch,
  raw: StreamedMatch,
  fixtures: NormalizedMatch[],
): NormalizedMatch => {
  const fixture = findFixtureForStreamed(raw, fixtures);
  if (!fixture) return normalized;
  return {
    ...normalized,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    statusDetail: fixture.statusDetail,
    keyEvents: fixture.keyEvents,
  };
};

const SportsHubHome = () => {
  const [matches, setMatches] = useState<NormalizedMatch[]>([]);
  const [footballMatches, setFootballMatches] = useState<NormalizedMatch[]>([]);
  const [streamedMatches, setStreamedMatches] = useState<StreamedMatch[]>([]);
  const [liveStreamed, setLiveStreamed] = useState<StreamedMatch[]>([]);
  const [allStreamed, setAllStreamed] = useState<StreamedMatch[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchTarget, setWatchTarget] = useState<WatchTarget | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const date = todayAsDate();
      const [eventResults, streamedResults, footballStreamed, liveResults, allResults, newsResults] =
        await Promise.all([
          getMultiSportEventsToday(date),
          Promise.all(
            HOMEPAGE_SPORTS_DB_NAMES.map((name) => getStreamedMatches(SPORTSDB_TO_STREAMED_ID[name])),
          ),
          getStreamedMatches(fifaConfig.streamedId),
          getStreamedLiveAll(),
          getStreamedAllMatches(),
          fifaEvent.enabled ? getEspnNews(fifaConfig.espnSport, fifaConfig.espnLeague) : Promise.resolve({ articles: [] }),
        ]);

      if (!active) return;
      setMatches(eventResults);
      setStreamedMatches([...streamedResults.flat(), ...(footballStreamed || [])]);
      setLiveStreamed(liveResults || []);
      setAllStreamed((allResults || []).slice(0, 20));
      setNews(normalizeArticles(newsResults.articles).slice(0, 6));
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
      getFootballLiveToday().then((result) => {
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

  const combinedMatches = sortMatches([...matches, ...footballMatches]);

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
      <SportsHero matches={combinedMatches} />

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
          <p className={shellStyles.message}>Loading matches...</p>
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
                    />
                  ))
                )}
              </ScrollRail>
            </div>

            {fifaEvent.enabled && news.length > 0 && (
              <div className={shellStyles.section}>
                <ScrollRail title="FIFA World Cup News">
                  {news.map((article) => (
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
                  ))}
                </ScrollRail>
              </div>
            )}

            <div className={shellStyles.section}>
              <ScrollRail title="Football Leagues">
                {FOOTBALL_LEAGUES.map((league) => (
                  <Link key={league.id} href={`/sports-league?id=${league.id}`} className={styles.leagueTile}>
                    <LazyLoadImage
                      src={league.logo}
                      alt={league.label}
                      effect="opacity"
                      className={`${styles.leagueLogo} skeleton`}
                    />
                    <span>{league.label}</span>
                  </Link>
                ))}
              </ScrollRail>
            </div>

            <div className={shellStyles.section}>
              <ScrollRail title="Cricket Leagues">
                {CRICKET_LEAGUES.map((league) => (
                  <Link key={league.id} href={`/sports-league?id=${league.id}`} className={styles.leagueTile}>
                    <LazyLoadImage
                      src={league.logo}
                      alt={league.label}
                      effect="opacity"
                      className={`${styles.leagueLogo} skeleton`}
                    />
                    <span>{league.label}</span>
                  </Link>
                ))}
              </ScrollRail>
            </div>

            {allStreamed.length > 0 && (
              <div className={shellStyles.section}>
                <ScrollRail title="More Live Events">
                  {allStreamed.map((raw) => {
                    const normalized = normalizeStreamedMatch(raw, "pre");
                    if (!normalized) return null;
                    return (
                      <WideMatchCard
                        key={raw.id}
                        match={normalized}
                        canWatchLive={Boolean(raw.sources?.[0])}
                        onWatchLive={() => handleWatchStreamed(raw)}
                      />
                    );
                  })}
                </ScrollRail>
              </div>
            )}
          </>
        )}
      </div>

      {watchTarget && <WatchLiveModal target={watchTarget} onClose={() => setWatchTarget(null)} />}
    </div>
  );
};

export default SportsHubHome;
