import { useEffect, useMemo, useState } from "react";
import shellStyles from "@/components/SportsShell/style.module.scss";
import styles from "./style.module.scss";
import ScrollRail from "@/components/SportsShared/ScrollRail";
import WatchLiveModal, { WatchTarget } from "@/components/SportsShared/WatchLiveModal";
import {
  getStreamedLiveAll,
  getStreamedMatches,
  getStreamedPopularAll,
  getStreamedSportsList,
  resolveStreamedAsset,
} from "@/Utils/sports";

type SportEntry = { id: string; name: string };
type StreamedMatchRaw = {
  id: string;
  title: string;
  category: string;
  poster?: string;
  teams?: { home?: { badge: string }; away?: { badge: string } };
  sources: { source: string; id: string }[];
};

const ALL_SPORT: SportEntry = { id: "all", name: "All" };

const getMatchImage = (match: StreamedMatchRaw) =>
  resolveStreamedAsset(match.poster) ||
  resolveStreamedAsset(match.teams?.home?.badge) ||
  "/images/NoSportImgFound.svg";

const LiveMatchCard = ({
  match,
  live,
  onWatch,
}: {
  match: StreamedMatchRaw;
  live: boolean;
  onWatch: () => void;
}) => (
  <div className={styles.liveCard}>
    <div className={styles.liveCardImage} style={{ backgroundImage: `url(${getMatchImage(match)})` }}>
      {live && <span className={styles.liveBadge}>LIVE</span>}
    </div>
    <p className={styles.liveCardTitle}>{match.title}</p>
    <button type="button" className={styles.watchBtn} onClick={onWatch}>
      Watch
    </button>
  </div>
);

const SportsLiveTab = () => {
  const [sports, setSports] = useState<SportEntry[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [liveMatches, setLiveMatches] = useState<StreamedMatchRaw[]>([]);
  const [popularMatches, setPopularMatches] = useState<StreamedMatchRaw[]>([]);
  const [sportMatches, setSportMatches] = useState<StreamedMatchRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchTarget, setWatchTarget] = useState<WatchTarget | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const [sportsList, live, popular] = await Promise.all([
        getStreamedSportsList(),
        getStreamedLiveAll(),
        getStreamedPopularAll(),
      ]);
      if (!active) return;
      setSports(sportsList || []);
      setLiveMatches(live || []);
      setPopularMatches(popular || []);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedSport === "all") {
      setSportMatches([]);
      return;
    }
    let active = true;
    getStreamedMatches(selectedSport).then((result) => {
      if (active) setSportMatches(result || []);
    });
    return () => {
      active = false;
    };
  }, [selectedSport]);

  const filteredLive = useMemo(
    () =>
      selectedSport === "all" ? liveMatches : liveMatches.filter((m) => m.category === selectedSport),
    [liveMatches, selectedSport],
  );
  const filteredPopular = useMemo(
    () =>
      selectedSport === "all"
        ? popularMatches
        : popularMatches.filter((m) => m.category === selectedSport),
    [popularMatches, selectedSport],
  );

  const handleWatch = (match: StreamedMatchRaw) => {
    const source = match.sources?.[0];
    if (!source) return;
    setWatchTarget({ title: match.title, source: source.source, id: source.id });
  };

  return (
    <>
      <div className={shellStyles.header}>
        <h1>Live</h1>
        <p>Matches streaming right now, via streamed.pk</p>
      </div>

      <div className={styles.sportPills}>
        {[ALL_SPORT, ...sports].map((sport) => (
          <button
            type="button"
            key={sport.id}
            className={`${styles.sportPill} ${sport.id === selectedSport ? styles.active : ""}`}
            onClick={() => setSelectedSport(sport.id)}
          >
            {sport.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={shellStyles.message}>Loading live matches...</p>
      ) : (
        <>
          <div className={shellStyles.section}>
            {filteredLive.length === 0 ? (
              <p className={shellStyles.message}>Nothing is live right now.</p>
            ) : (
              <ScrollRail title="Live Now">
                {filteredLive.map((match) => (
                  <LiveMatchCard key={match.id} match={match} live onWatch={() => handleWatch(match)} />
                ))}
              </ScrollRail>
            )}
          </div>

          {selectedSport === "all" ? (
            <div className={shellStyles.section}>
              <ScrollRail title="Popular">
                {filteredPopular.map((match) => (
                  <LiveMatchCard
                    key={match.id}
                    match={match}
                    live={false}
                    onWatch={() => handleWatch(match)}
                  />
                ))}
              </ScrollRail>
            </div>
          ) : (
            <div className={shellStyles.section}>
              <ScrollRail title={sports.find((s) => s.id === selectedSport)?.name || "Matches"}>
                {sportMatches.map((match) => (
                  <LiveMatchCard
                    key={match.id}
                    match={match}
                    live={false}
                    onWatch={() => handleWatch(match)}
                  />
                ))}
              </ScrollRail>
            </div>
          )}
        </>
      )}

      {watchTarget && <WatchLiveModal target={watchTarget} onClose={() => setWatchTarget(null)} />}
    </>
  );
};

export default SportsLiveTab;
