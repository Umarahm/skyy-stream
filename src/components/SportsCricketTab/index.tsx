import { useEffect, useState } from "react";
import shellStyles from "@/components/SportsShell/style.module.scss";
import {
  NormalizedMatch,
  SPORTS_CONFIG,
  getSportsDbEventsSeason,
  getSportsDbTable,
  getStreamedMatches,
  normalizeSportsDbEvent,
} from "@/Utils/sports";
import { StreamedMatch, findStreamedMatch } from "@/Utils/sportsMatch";
import MatchCard from "@/components/SportsShared/MatchCard";
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
      const [events, standingsTable, streamed] = await Promise.all([
        getSportsDbEventsSeason(config.sportsDbLeagueId, config.sportsDbSeason),
        getSportsDbTable(config.sportsDbLeagueId, config.sportsDbSeason),
        getStreamedMatches(config.streamedId),
      ]);

      if (!active) return;
      setMatches(
        (events.events || [])
          .map(normalizeSportsDbEvent)
          .filter((match): match is NormalizedMatch => Boolean(match))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 12),
      );
      setTable(standingsTable.table || []);
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
        <p>Major League Cricket — fixtures & standings</p>
      </div>

      {loading ? (
        <p className={shellStyles.message}>Loading cricket...</p>
      ) : (
        <>
          <div className={shellStyles.section}>
            <h2>Fixtures</h2>
            {matches.length === 0 ? (
              <p className={shellStyles.message}>No fixtures found right now.</p>
            ) : (
              <div className={shellStyles.grid}>
                {matches.map((match) => (
                  <MatchCard
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
