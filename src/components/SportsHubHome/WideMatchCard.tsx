import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import styles from "./style.module.scss";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { NormalizedMatch, getMatchDetailHref, getMatchStatusLabel } from "@/Utils/sports";
import { namesLikelyMatch } from "@/Utils/sportsMatch";

export const WideMatchCardSkeleton = () => (
  <div className={styles.wideCard}>
    <Skeleton className={styles.wideCardBackdrop} />
    <div className={styles.wideCardBody}>
      <div className={styles.wideCardTop}>
        <Skeleton width={60} height={14} />
        <Skeleton width={50} height={14} />
      </div>
      <div className={styles.wideCardTeamsStacked}>
        <div className={styles.teamStacked}>
          <Skeleton circle width={44} height={44} />
          <Skeleton width={90} height={14} />
        </div>
        <Skeleton width={36} height={18} />
        <div className={styles.teamStacked}>
          <Skeleton circle width={44} height={44} />
          <Skeleton width={90} height={14} />
        </div>
      </div>
    </div>
  </div>
);

const TeamBadge = ({
  name,
  logo,
  size,
  badgeClass,
}: {
  name: string;
  logo?: string;
  size: number;
  badgeClass: string;
}) =>
  logo ? (
    <LazyLoadImage
      src={logo}
      alt={name}
      effect="opacity"
      className={`${badgeClass} skeleton`}
      width={size}
      height={size}
    />
  ) : (
    <div className={badgeClass} style={{ width: size, height: size }} />
  );

const CONFETTI_COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#fb923c"];

const ConfettiOverlay = () => (
  <div className={styles.confettiOverlay} aria-hidden>
    {Array.from({ length: 20 }, (_, i) => (
      <span
        key={i}
        className={styles.confettiParticle}
        style={{
          left: `${(i / 20) * 95 + 2}%`,
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animationDelay: `${((i % 6) * 0.08).toFixed(2)}s`,
          width: `${[4, 5, 6, 7, 5, 4][i % 6]}px`,
          height: `${[6, 5, 4, 7, 5, 6][i % 6]}px`,
          borderRadius: i % 3 === 0 ? "50%" : "2px",
        }}
      />
    ))}
  </div>
);

// True when the match finished or is in a penalty shootout.
const isPenaltyMatch = (statusDetail?: string) =>
  /pen(alt|s)?|pso|ft_pen|shootout/i.test(statusDetail || "");

const WideMatchCard = ({
  match,
  canWatchLive,
  onWatchLive,
  showGoals = false,
  stacked = false,
}: {
  match: NormalizedMatch;
  canWatchLive: boolean;
  onWatchLive: () => void;
  showGoals?: boolean;
  stacked?: boolean;
}) => {
  const status = getMatchStatusLabel(match);
  const detailHref = getMatchDetailHref(match);
  const isPens = isPenaltyMatch(match.statusDetail);

  const allGoalEvents = showGoals
    ? (match.keyEvents || []).filter((e) => e.type === "goal")
    : [];
  const homeGoals = allGoalEvents
    .filter((g) => namesLikelyMatch(g.team, match.homeName))
    .slice(-4);
  const awayGoals = allGoalEvents
    .filter((g) => namesLikelyMatch(g.team, match.awayName))
    .slice(-4);

  // Confetti: fires when live goal count rises between polls.
  const prevGoalCountRef = useRef<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const prev = prevGoalCountRef.current;
    const curr = allGoalEvents.length;
    prevGoalCountRef.current = curr;
    if (match.status === "in" && prev !== null && curr > prev) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 2600);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allGoalEvents.length, match.status]);

  const isSingleEntity = !match.awayName;

  const searchAttrs = {
    "data-sports-search-item": "",
    "data-sports-search-label": isSingleEntity
      ? `${match.homeName} · ${match.competition || match.sportLabel || "Sport"}`
      : `${match.homeName} vs ${match.awayName} · ${match.competition || match.sportLabel || "Sport"}`,
  };

  const scoreNode = (size: "normal" | "stacked") => {
    if (match.status === "pre") return "vs";
    const score = `${match.homeScore ?? "-"} : ${match.awayScore ?? "-"}`;
    if (!isPens) return score;
    return (
      <>
        {score}
        <span className={styles.penBadge}>PKS</span>
      </>
    );
  };

  const card = (
    <div
      className={`${styles.wideCard} ${match.status === "in" ? styles.live : ""}`}
      {...(!detailHref ? searchAttrs : undefined)}
    >
      {showConfetti && <ConfettiOverlay />}
      <div
        className={styles.wideCardBackdrop}
        style={{ backgroundImage: `url(${match.backdrop || "/images/NoSportImgFound.svg"})` }}
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

        {isSingleEntity ? (
          <div className={stacked ? styles.wideCardTeamsStacked : `${styles.wideCardTeams} ${styles.single}`}>
            <div className={stacked ? styles.teamStacked : styles.team}>
              <TeamBadge
                name={match.homeName}
                logo={match.homeLogo}
                size={stacked ? 44 : 28}
                badgeClass={stacked ? styles.teamBadgeLg : styles.teamBadge}
              />
              <span>{match.homeName}</span>
            </div>
          </div>
        ) : stacked ? (
          <div className={styles.wideCardTeamsStacked}>
            <div className={styles.teamStacked}>
              <TeamBadge name={match.homeName} logo={match.homeLogo} size={44} badgeClass={styles.teamBadgeLg} />
              <span>{match.homeName}</span>
            </div>
            <div className={styles.scoreStacked}>{scoreNode("stacked")}</div>
            <div className={styles.teamStacked}>
              <TeamBadge name={match.awayName} logo={match.awayLogo} size={44} badgeClass={styles.teamBadgeLg} />
              <span>{match.awayName}</span>
            </div>
          </div>
        ) : (
          // Compact layout — goals pinned under each team column.
          <div className={styles.wideCardTeams}>
            <div className={styles.teamGoalsWrap}>
              <div className={styles.team}>
                <TeamBadge name={match.homeName} logo={match.homeLogo} size={28} badgeClass={styles.teamBadge} />
                <span>{match.homeName}</span>
              </div>
              {homeGoals.length > 0 && (
                <ul className={styles.teamGoalsList}>
                  {homeGoals.map((g) => (
                    <li key={g.id}>
                      ⚽ {g.time ? `${g.time}′` : ""} {g.players[0] || ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.score}>{scoreNode("normal")}</div>

            <div className={`${styles.teamGoalsWrap} ${styles.teamGoalsWrapAway}`}>
              <div className={styles.team}>
                <TeamBadge name={match.awayName} logo={match.awayLogo} size={28} badgeClass={styles.teamBadge} />
                <span>{match.awayName}</span>
              </div>
              {awayGoals.length > 0 && (
                <ul className={`${styles.teamGoalsList} ${styles.teamGoalsListAway}`}>
                  {awayGoals.map((g) => (
                    <li key={g.id}>
                      ⚽ {g.time ? `${g.time}′` : ""} {g.players[0] || ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
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
    <Link href={detailHref} className={styles.wideCardLink} {...searchAttrs}>
      {card}
    </Link>
  ) : (
    card
  );
};

export default WideMatchCard;
