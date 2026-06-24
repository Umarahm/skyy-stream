import { useEffect, useState } from "react";
import shellStyles from "@/components/SportsShell/style.module.scss";
import {
  NormalizedMatch,
  SPORTS_CONFIG,
  espnCricketStandingsToTableRows,
  getEspnScoreboardFull,
  getStreamedMatches,
  normalizeEspnEvent,
} from "@/Utils/sports";
import { StreamedMatch, findStreamedMatch } from "@/Utils/sportsMatch";
import CricketMatchCard from "./CricketMatchCard";
import Standings from "@/components/SportsShared/Standings";
import WatchLiveModal, { WatchTarget } from "@/components/SportsShared/WatchLiveModal";

const config = SPORTS_CONFIG.cricket;

const SportsCricketTab = () => {
  const [matches, setMatches] = useState<NormalizedMatch[]>([]);
  const [table, setTable] = useState<any[]>([]);
  const [streamedMatches, setStreamedMatches] = useState<StreamedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchTarget, setWatchTarget] = useState<WatchTarget | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      // ESPN's cricket scoreboard accepts a bare year as `dates` and returns
      // that whole season — real score strings ("161/5 (18/20 ov)") and an
      // explicit per-side `winner` flag, instead of TheSportsDB's bare run
      // total (which made "highest number wins" the only signal available).
      const season = String(new Date().getFullYear());
      const [scoreboard, streamed] = await Promise.all([
        getEspnScoreboardFull(config.espnSport, config.espnLeague, season),
        getStreamedMatches(config.streamedId),
      ]);

      if (!active) return;
      setMatches(
        (scoreboard.events || [])
          .map((event: any) => normalizeEspnEvent(event, config.label, config.espnSport, config.espnLeague))
          .filter((match): match is NormalizedMatch => Boolean(match))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 12),
      );
      setTable(espnCricketStandingsToTableRows(scoreboard.standings));
      setStreamedMatches(streamed || []);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

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

  return (
    <>
      <div className={shellStyles.header}>
        <h1>Cricket</h1>
        <p>Indian Premier League — fixtures, results & standings</p>
      </div>

      {loading ? (
        <p className={shellStyles.message}>Loading cricket...</p>
      ) : (
        <>
          <div className={shellStyles.section}>
            <h2>Fixtures & Results</h2>
            {matches.length === 0 ? (
              <p className={shellStyles.message}>No fixtures found right now.</p>
            ) : (
              <div className={shellStyles.grid}>
                {matches.map((match) => (
                  <CricketMatchCard
                    key={match.id}
                    match={match}
                    canWatchLive={
                      match.status === "in" && Boolean(findStreamedMatch(match, streamedMatches))
                    }
                    onWatchLive={() => handleWatchLive(match)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className={shellStyles.section}>
            <h2>Standings</h2>
            <Standings table={table} />
          </div>
        </>
      )}

      {watchTarget && <WatchLiveModal target={watchTarget} onClose={() => setWatchTarget(null)} />}
    </>
  );
};

export default SportsCricketTab;
