import { useEffect, useState } from "react";
import shellStyles from "@/components/SportsShell/style.module.scss";
import {
  SPORTS_CONFIG,
  SportKey,
  espnStandingsToTableRows,
  getEspnStandings,
  getSportsDbTable,
} from "@/Utils/sports";
import Standings from "@/components/SportsShared/Standings";
import { useReportFifaLoading } from "@/Utils/FifaLoadingContext";

const SportsStandingsTab = ({ sport }: { sport: SportKey }) => {
  const config = SPORTS_CONFIG[sport];
  const [table, setTable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useReportFifaLoading(`standings-${sport}`, loading);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      // ESPN has full grouped standings (all teams per group); TheSportsDB's
      // free-tier `lookuptable.php` is capped to one row per group, so it's
      // only used as a fallback when ESPN has no coverage for this sport.
      if (config.espnLeague) {
        const espnResult = await getEspnStandings(config.espnSport, config.espnLeague);
        const rows = espnStandingsToTableRows(espnResult);
        if (active) {
          setTable(rows);
          setLoading(false);
        }
        return;
      }

      const result = await getSportsDbTable(config.sportsDbLeagueId, config.sportsDbSeason);
      if (!active) return;
      setTable(result.table || []);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [config.espnLeague, config.espnSport, config.sportsDbLeagueId, config.sportsDbSeason]);

  return (
    <>
      <div className={shellStyles.header}>
        <h1>{config.label} Standings</h1>
        <p>Current table</p>
      </div>

      {loading ? <p className={shellStyles.message}>Loading standings...</p> : <Standings table={table} />}
    </>
  );
};

export default SportsStandingsTab;
