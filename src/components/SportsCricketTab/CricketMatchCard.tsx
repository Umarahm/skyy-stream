import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import { NormalizedMatch, getMatchStatusLabel } from "@/Utils/sports";
import styles from "./style.module.scss";

// Cricket has no "FT"/highest-score-wins concept — a side can score fewer
// total runs and still win (chasing a target), so the outcome has to come
// from ESPN's explicit per-side `winner` flag, not a score comparison.
const getOutcome = (match: NormalizedMatch): string => {
  if (match.status !== "post") return "";
  if (match.homeWinner) return `${match.homeName} won`;
  if (match.awayWinner) return `${match.awayName} won`;
  return match.statusDetail || "Match ended";
};

const CricketTeamRow = ({
  name,
  logo,
  score,
  isWinner,
}: {
  name: string;
  logo?: string;
  score?: string;
  isWinner: boolean;
}) => (
  <div className={`${styles.cricketTeamRow} ${isWinner ? styles.cricketWinner : ""}`}>
    {logo ? (
      <LazyLoadImage
        src={logo}
        alt={name}
        effect="opacity"
        className={`${styles.cricketBadge} skeleton`}
        width={32}
        height={32}
      />
    ) : (
      <div className={styles.cricketBadge} />
    )}
    <span className={styles.cricketTeamName}>{name}</span>
    <span className={styles.cricketScore}>{score || "Yet to bat"}</span>
  </div>
);

const CricketMatchCard = ({
  match,
  canWatchLive,
  onWatchLive,
}: {
  match: NormalizedMatch;
  canWatchLive: boolean;
  onWatchLive: () => void;
}) => {
  const status = getMatchStatusLabel(match);
  const outcome = getOutcome(match);

  return (
    <div className={`${styles.cricketCard} ${match.status === "in" ? styles.cricketLive : ""}`}>
      <div className={styles.cricketStatus}>
        {status.tone === "live" ? (
          <span className={styles.cricketLiveBadge}>{status.label}</span>
        ) : (
          <span className={styles.cricketStatusText}>
            {status.tone === "upcoming" ? status.label : match.competition || "Indian Premier League"}
          </span>
        )}
      </div>

      <CricketTeamRow
        name={match.homeName}
        logo={match.homeLogo}
        score={match.homeScore}
        isWinner={Boolean(match.homeWinner)}
      />
      <CricketTeamRow
        name={match.awayName}
        logo={match.awayLogo}
        score={match.awayScore}
        isWinner={Boolean(match.awayWinner)}
      />

      {outcome && <p className={styles.cricketOutcome}>{outcome}</p>}

      {canWatchLive && (
        <button type="button" className={styles.watchLiveBtn} onClick={onWatchLive}>
          Watch Live
        </button>
      )}
    </div>
  );
};

export default CricketMatchCard;
