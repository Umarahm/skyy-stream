import Link from "next/link";
import styles from "./style.module.scss";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import { NormalizedMatch, getMatchDetailHref, getMatchStatusLabel } from "@/Utils/sports";

const TeamBadge = ({ name, logo, isWinner }: { name: string; logo?: string; isWinner: boolean }) => (
  <div className={`${styles.team} ${isWinner ? styles.winner : ""}`}>
    {logo ? (
      <LazyLoadImage
        src={logo}
        alt={name}
        effect="opacity"
        className={`${styles.teamBadge} skeleton`}
        width={36}
        height={36}
      />
    ) : (
      <div className={styles.teamBadge} />
    )}
    <span className={styles.teamName}>{name}</span>
  </div>
);

const getWinner = (match: NormalizedMatch): "home" | "away" | null => {
  if (match.status !== "post") return null;
  // Prefer ESPN's explicit per-side result flag when present — comparing
  // scores as numbers breaks for any sport whose score isn't a bare number.
  if (typeof match.homeWinner === "boolean" || typeof match.awayWinner === "boolean") {
    if (match.homeWinner) return "home";
    if (match.awayWinner) return "away";
    return null;
  }
  const home = Number(match.homeScore);
  const away = Number(match.awayScore);
  if (Number.isNaN(home) || Number.isNaN(away)) return null;
  if (home === away) return null;
  return home > away ? "home" : "away";
};

const MatchCard = ({
  match,
  canWatchLive,
  onWatchLive,
}: {
  match: NormalizedMatch;
  canWatchLive: boolean;
  onWatchLive: () => void;
}) => {
  const winner = getWinner(match);
  const status = getMatchStatusLabel(match);
  const detailHref = getMatchDetailHref(match);

  const card = (
    <div className={`${styles.matchCard} ${match.status === "in" ? styles.live : ""}`}>
      <div className={styles.matchStatus}>
        {status.tone === "live" ? (
          <span className={styles.liveBadge}>{status.label}</span>
        ) : (
          <span className={styles.statusText}>{status.label}</span>
        )}
      </div>

      <div className={styles.matchTeams}>
        <TeamBadge name={match.homeName} logo={match.homeLogo} isWinner={winner === "home"} />
        <div className={styles.score}>
          {match.status === "pre" ? (
            <span>vs</span>
          ) : (
            <span>
              <span className={winner === "home" ? styles.winnerScore : ""}>
                {match.homeScore ?? "-"}
              </span>
              {" : "}
              <span className={winner === "away" ? styles.winnerScore : ""}>
                {match.awayScore ?? "-"}
              </span>
            </span>
          )}
        </div>
        <TeamBadge name={match.awayName} logo={match.awayLogo} isWinner={winner === "away"} />
      </div>

      {canWatchLive && (
        <button type="button" className={styles.watchLiveBtn} onClick={onWatchLive}>
          Watch Live
        </button>
      )}
      {!canWatchLive && detailHref && <span className={styles.statsLink}>View match stats</span>}
    </div>
  );

  return detailHref ? (
    <Link href={detailHref} className={styles.matchCardLink}>
      {card}
    </Link>
  ) : (
    card
  );
};

export default MatchCard;
