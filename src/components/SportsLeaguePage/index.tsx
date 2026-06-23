import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import shellStyles from "@/components/SportsShell/style.module.scss";
import MatchCard from "@/components/SportsShared/MatchCard";
import Standings from "@/components/SportsShared/Standings";
import {
  NormalizedMatch,
  buildEspnDateRange,
  espnStandingsToTableRows,
  getEspnScoreboard,
  getEspnStandings,
  getSportsDbEventsSeason,
  getSportsDbTable,
  normalizeEspnEvent,
  normalizeSportsDbEvent,
} from "@/Utils/sports";
import { getLeagueById } from "@/Utils/sportsLeagues";

const SportsLeaguePage = () => {
  const params = useSearchParams();
  const id = params.get("id") || "";
  const league = getLeagueById(id);

  const [matches, setMatches] = useState<NormalizedMatch[]>([]);
  const [table, setTable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!league) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      if (league.kind === "espn") {
        const [scoreboard, standings] = await Promise.all([
          getEspnScoreboard(league.sport, league.league, buildEspnDateRange(5, 5)),
          getEspnStandings(league.sport, league.league),
        ]);
        if (!active) return;
        setMatches(
          (scoreboard.events || [])
            .map((event: any) => normalizeEspnEvent(event, league.label, league.sport, league.league))
            .filter((match): match is NormalizedMatch => Boolean(match))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        );
        setTable(espnStandingsToTableRows(standings));
      } else {
        const [events, standingsTable] = await Promise.all([
          getSportsDbEventsSeason(league.league),
          getSportsDbTable(league.league),
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
      }
      if (active) setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [league?.id]);

  if (!league) {
    return <p className={shellStyles.message}>League not found.</p>;
  }

  return (
    <>
      <div className={shellStyles.header}>
        <LazyLoadImage
          src={league.logo}
          alt={league.label}
          effect="opacity"
          className="skeleton"
          width={48}
          height={48}
        />
        <h1>{league.label}</h1>
      </div>

      {loading ? (
        <p className={shellStyles.message}>Loading {league.label}...</p>
      ) : (
        <>
          <div className={shellStyles.section}>
            <h2>Fixtures</h2>
            {matches.length === 0 ? (
              <p className={shellStyles.message}>No fixtures found right now.</p>
            ) : (
              <div className={shellStyles.grid}>
                {matches.map((match) => (
                  <MatchCard key={match.id} match={match} canWatchLive={false} onWatchLive={() => {}} />
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
    </>
  );
};

export default SportsLeaguePage;
