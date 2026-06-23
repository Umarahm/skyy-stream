import Link from "next/link";
import styles from "./style.module.scss";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import { NormalizedMatch, getMatchDetailHref, getMatchStatusLabel } from "@/Utils/sports";

const WideMatchCard = ({
  match,
  canWatchLive,
  onWatchLive,
  showGoals = false,
}: {
  match: NormalizedMatch;
  canWatchLive: boolean;
  onWatchLive: () => void;
  // Goal scorer/time line — only the "Live Now" rail wants this, the
  // cross-sport "Live & Upcoming" and streamed.pk rails stay score-only.
  showGoals?: boolean;
}) => {
  const status = getMatchStatusLabel(match);
  const detailHref = getMatchDetailHref(match);
  const goals = showGoals ? (match.keyEvents || []).filter((event) => event.type === "goal").slice(-3) : [];

  const card = (
    <div className={`${styles.wideCard} ${match.status === "in" ? styles.live : ""}`}>
      <div
        className={styles.wideCardBackdrop}
        style={{ backgroundImage: `url(${match.backdrop || "/images/logo.svg"})` }}
      />
      <div className={styles.wideCardBody}>
        <div className={styles.wideCardTop}>
          <span className={styles.sportLabel}>{match.sportLabel || "Sport"}</span>
          {status.tone === "live" ? (
            <span className={styles.liveBadge}>{status.label}</span>
          ) : (
            <span className={styles.statusText}>{status.label}</span>
          )}
        </div>
        <div className={styles.wideCardTeams}>
          <div className={styles.team}>
            <LazyLoadImage
              src={match.homeLogo || "/images/logo.svg"}
              alt={match.homeName}
              effect="opacity"
              className={`${styles.teamBadge} skeleton`}
              width={28}
              height={28}
            />
            <span>{match.homeName}</span>
          </div>
          <div className={styles.score}>
            {match.status === "pre" ? "vs" : `${match.homeScore ?? "-"} : ${match.awayScore ?? "-"}`}
          </div>
          <div className={styles.team}>
            <LazyLoadImage
              src={match.awayLogo || "/images/logo.svg"}
              alt={match.awayName}
              effect="opacity"
              className={`${styles.teamBadge} skeleton`}
              width={28}
              height={28}
            />
            <span>{match.awayName}</span>
          </div>
        </div>
        {match.status === "in" && goals.length > 0 && (
          <ul className={styles.goalScorers}>
            {goals.map((goal) => (
              <li key={goal.id}>
                ⚽ {goal.time} {goal.players.join(", ") || goal.team}
              </li>
            ))}
          </ul>
        )}
        {canWatchLive && (
          <button type="button" className={styles.watchLiveBtn} onClick={onWatchLive}>
            Watch Live
          </button>
        )}
        {!canWatchLive && detailHref && <span className={styles.statsLink}>View match stats</span>}
      </div>
    </div>
  );

  return detailHref ? (
    <Link href={detailHref} className={styles.wideCardLink}>
      {card}
    </Link>
  ) : (
    card
  );
};

export default WideMatchCard;
