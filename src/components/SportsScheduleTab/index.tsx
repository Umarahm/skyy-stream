import { useEffect, useState } from "react";
import shellStyles from "@/components/SportsShell/style.module.scss";
import {
  NormalizedMatch,
  SPORTS_CONFIG,
  SportKey,
  buildEspnDateRange,
  getEspnScoreboard,
  getStreamedMatches,
  normalizeEspnEvent,
} from "@/Utils/sports";
import { StreamedMatch, findStreamedMatch } from "@/Utils/sportsMatch";
import MatchCard from "@/components/SportsShared/MatchCard";
import WatchLiveModal, { WatchTarget } from "@/components/SportsShared/WatchLiveModal";
import { useReportFifaLoading } from "@/Utils/FifaLoadingContext";

const groupMatchesByDay = (items: NormalizedMatch[]) => {
  const map = new Map<string, NormalizedMatch[]>();
  items.forEach((match) => {
    const key = new Date(match.date).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(match);
  });
  return Array.from(map.entries()).map(([key, dayMatches]) => ({
    key,
    label: new Date(dayMatches[0].date).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    }),
    matches: dayMatches,
  }));
};

const SportsScheduleTab = ({ sport }: { sport: SportKey }) => {
  const config = SPORTS_CONFIG[sport];
  const [matches, setMatches] = useState<NormalizedMatch[]>([]);
  const [streamedMatches, setStreamedMatches] = useState<StreamedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchTarget, setWatchTarget] = useState<WatchTarget | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const [scoreboard, streamed] = await Promise.all([
        getEspnScoreboard(config.espnSport, config.espnLeague, buildEspnDateRange(5, 5)),
        getStreamedMatches(config.streamedId),
      ]);

      if (!active) return;
      setMatches(
        (scoreboard.events || [])
          .map((event: any) => normalizeEspnEvent(event, config.label, config.espnSport, config.espnLeague))
          .filter((match): match is NormalizedMatch => Boolean(match))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      );
      setStreamedMatches(streamed || []);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [config.espnSport, config.espnLeague, config.streamedId, config.label]);

  useReportFifaLoading(`schedule-${sport}`, loading);

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
        <h1>{config.label} Schedule</h1>
        <p>Fixtures and live scores</p>
      </div>

      {loading ? (
        <p className={shellStyles.message}>Loading fixtures...</p>
      ) : matches.length === 0 ? (
        <p className={shellStyles.message}>No fixtures found right now.</p>
      ) : (
        groupMatchesByDay(matches).map((day) => (
          <div className={shellStyles.section} key={day.key}>
            <h2 className={shellStyles.dayHeading}>{day.label}</h2>
            <div className={shellStyles.grid}>
              {day.matches.map((match) => (
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
          </div>
        ))
      )}

      {watchTarget && <WatchLiveModal target={watchTarget} onClose={() => setWatchTarget(null)} />}
    </>
  );
};

export default SportsScheduleTab;
