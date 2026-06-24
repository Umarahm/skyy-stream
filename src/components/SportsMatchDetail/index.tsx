import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import shellStyles from "@/components/SportsShell/style.module.scss";
import styles from "./style.module.scss";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import {
  MatchKeyEvent,
  RosterPlayer,
  TeamRoster,
  getEspnSummary,
  getSportsDbEvent,
  normalizeEspnBoxscore,
  normalizeEspnKeyEvents,
  normalizeEspnRoster,
} from "@/Utils/sports";
import PitchLineup from "./PitchLineup";

type MatchSource = "espn" | "sportsdb";

const DEFAULT_HOME_COLOR = "1d4ed8";
const DEFAULT_AWAY_COLOR = "dc2626";

const EventIcon = ({ type }: { type: MatchKeyEvent["type"] }) => {
  if (type === "goal") return <span className={styles.eventIcon}>⚽</span>;
  if (type === "red-card") return <span className={styles.eventIcon}>🟥</span>;
  return <span className={styles.eventIcon}>🟨</span>;
};

// Bench only — starters are shown on the pitch graphic instead.
const BenchList = ({ roster }: { roster: TeamRoster }) => {
  const bench = roster.players.filter((p) => !p.starter);
  if (bench.length === 0) return null;

  const renderPlayer = (player: RosterPlayer) => (
    <li key={player.id} className={styles.rosterPlayer}>
      <span className={styles.jersey}>{player.jersey || "-"}</span>
      <span className={styles.playerName}>{player.shortName || player.name}</span>
      <span className={styles.position}>{player.position}</span>
      {player.subbedIn && <span className={styles.subTag}>IN</span>}
    </li>
  );

  return (
    <div className={styles.rosterTeam}>
      <div className={styles.rosterHeader}>
        {roster.teamLogo ? (
          <LazyLoadImage
            src={roster.teamLogo}
            alt={roster.team}
            effect="opacity"
            className={`${styles.rosterBadge} skeleton`}
            width={28}
            height={28}
          />
        ) : (
          <div className={styles.rosterBadge} />
        )}
        <h3>{roster.team}</h3>
        {roster.formation && <span className={styles.formation}>{roster.formation}</span>}
      </div>
      <p className={styles.rosterSubheading}>Bench</p>
      <ul className={styles.rosterList}>{bench.map(renderPlayer)}</ul>
    </div>
  );
};

const SportsMatchDetail = () => {
  const params = useSearchParams();
  const source = (params.get("source") as MatchSource) || "espn";
  const sport = params.get("sport") || "";
  const league = params.get("league") || "";
  const id = params.get("id") || "";

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [sportsDbEvent, setSportsDbEvent] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      if (source === "espn") {
        const data = await getEspnSummary(sport, league, id);
        if (active) setSummary(data);
      } else {
        const data = await getSportsDbEvent(id);
        if (active) setSportsDbEvent((data.events || [])[0] || null);
      }
      if (active) setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [source, sport, league, id]);

  if (loading) {
    return <p className={shellStyles.message}>Loading match details...</p>;
  }

  if (source === "sportsdb") {
    if (!sportsDbEvent) {
      return <p className={shellStyles.message}>Match details unavailable.</p>;
    }
    return (
      <div className={styles.matchDetail}>
        <div className={shellStyles.header}>
          <h1>
            {sportsDbEvent.strHomeTeam} {sportsDbEvent.intHomeScore ?? "-"} : {sportsDbEvent.intAwayScore ?? "-"}{" "}
            {sportsDbEvent.strAwayTeam}
          </h1>
          <p>{sportsDbEvent.strLeague}</p>
        </div>
        <div className={styles.basicResult}>
          {sportsDbEvent.strResult && <p>{sportsDbEvent.strResult}</p>}
          {sportsDbEvent.strDescriptionEN && <p>{sportsDbEvent.strDescriptionEN}</p>}
          {sportsDbEvent.strVenue && (
            <p>
              Venue: {sportsDbEvent.strVenue}
              {sportsDbEvent.strCity ? `, ${sportsDbEvent.strCity}` : ""}
            </p>
          )}
        </div>
        <p className={styles.statsUnavailable}>
          Detailed stats (lineups, ball-by-ball breakdowns) aren&apos;t available for this competition yet.
        </p>
      </div>
    );
  }

  if (!summary || Object.keys(summary).length === 0) {
    return <p className={shellStyles.message}>Match details unavailable.</p>;
  }

  const competitors = summary?.header?.competitions?.[0]?.competitors || [];
  const home = competitors.find((c: any) => c.homeAway === "home");
  const away = competitors.find((c: any) => c.homeAway === "away");
  const statusText = summary?.header?.competitions?.[0]?.status?.type?.description;

  const boxscore = normalizeEspnBoxscore(summary);
  const rosters = normalizeEspnRoster(summary);
  const keyEvents = normalizeEspnKeyEvents(summary);
  const homeRoster = rosters.find((r) => r.team === home?.team?.displayName);
  const awayRoster = rosters.find((r) => r.team === away?.team?.displayName);

  return (
    <div className={styles.matchDetail}>
      <div className={styles.matchHeader}>
        <div className={styles.headerTeam}>
          {home?.team?.logos?.[0]?.href ? (
            <LazyLoadImage
              src={home.team.logos[0].href}
              alt={home?.team?.displayName}
              effect="opacity"
              className={`${styles.headerBadge} skeleton`}
              width={56}
              height={56}
            />
          ) : (
            <div className={styles.headerBadge} />
          )}
          <span>{home?.team?.displayName}</span>
        </div>
        <div className={styles.headerScore}>
          <span>
            {home?.score ?? "-"} : {away?.score ?? "-"}
          </span>
          <span className={styles.headerStatus}>{statusText}</span>
        </div>
        <div className={styles.headerTeam}>
          {away?.team?.logos?.[0]?.href ? (
            <LazyLoadImage
              src={away.team.logos[0].href}
              alt={away?.team?.displayName}
              effect="opacity"
              className={`${styles.headerBadge} skeleton`}
              width={56}
              height={56}
            />
          ) : (
            <div className={styles.headerBadge} />
          )}
          <span>{away?.team?.displayName}</span>
        </div>
      </div>

      {keyEvents.length > 0 && (
        <div className={shellStyles.section}>
          <h2>Key Events</h2>
          <ul className={styles.eventsList}>
            {keyEvents.map((event) => (
              <li key={event.id} className={styles.eventRow}>
                <span className={styles.eventTime}>{event.time}</span>
                <EventIcon type={event.type} />
                <span className={styles.eventTeam}>{event.team}</span>
                <span className={styles.eventPlayers}>{event.players.join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(boxscore.home || boxscore.away) && (
        <div className={shellStyles.section}>
          <h2>Team Stats</h2>
          <table className={styles.statsTable}>
            <thead>
              <tr>
                <th>{boxscore.home?.team}</th>
                <th></th>
                <th>{boxscore.away?.team}</th>
              </tr>
            </thead>
            <tbody>
              {boxscore.labels.map((label, index) => (
                <tr key={label}>
                  <td>{boxscore.home?.stats[index]?.value ?? "-"}</td>
                  <td className={styles.statsLabel}>{label}</td>
                  <td>{boxscore.away?.stats[index]?.value ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rosters.length > 0 && (
        <div className={shellStyles.section}>
          <h2>Lineups</h2>
          {homeRoster && awayRoster && (
            <PitchLineup
              home={{ roster: homeRoster, color: `#${home?.team?.color || DEFAULT_HOME_COLOR}` }}
              away={{ roster: awayRoster, color: `#${away?.team?.color || DEFAULT_AWAY_COLOR}` }}
            />
          )}
          <div className={styles.rosterGrid}>
            {rosters.map((roster) => (
              <BenchList key={roster.team} roster={roster} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SportsMatchDetail;
