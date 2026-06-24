import Link from "next/link";
import styles from "./style.module.scss";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { NormalizedMatch, getMatchDetailHref, getMatchStatusLabel } from "@/Utils/sports";

// Mirrors WideMatchCard's stacked layout (the one used by Live & Upcoming
// and More Live Events, the only two rails that ever show this skeleton) so
// a rail can show placeholder cards while its data is still loading instead
// of an empty gap.
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
  // Goal scorer/time line — only the "Live Now" rail wants this, the
  // cross-sport "Live & Upcoming" and streamed.pk rails stay score-only.
  showGoals?: boolean;
  // Live Now keeps the compact side-by-side row; Live & Upcoming and More
  // Live Events stack badge-over-name per team (bigger, no truncation vs.
  // cramming both teams + score into one row).
  stacked?: boolean;
}) => {
  const status = getMatchStatusLabel(match);
  const detailHref = getMatchDetailHref(match);
  const goals = showGoals ? (match.keyEvents || []).filter((event) => event.type === "goal").slice(-3) : [];
  // streamed.pk lists plenty of non-head-to-head broadcasts alongside actual
  // matches — a NASCAR rally, an NBA draft, a "SkySports" channel feed. Those
  // never had a real away team to begin with (normalizeStreamedMatch's
  // " vs " split only ever produced one side), so showing a "vs" and an
  // empty second team slot is wrong — render it as a single entry instead.
  const isSingleEntity = !match.awayName;

  // Picked up by SportsSearchPopover's DOM scan — it queries every element
  // carrying this attribute rather than each rail tracking its own search
  // index, so the popover always reflects exactly what's rendered right now.
  const searchAttrs = {
    "data-sports-search-item": "",
    "data-sports-search-label": isSingleEntity
      ? `${match.homeName} · ${match.competition || match.sportLabel || "Sport"}`
      : `${match.homeName} vs ${match.awayName} · ${match.competition || match.sportLabel || "Sport"}`,
  };

  const card = (
    <div
      className={`${styles.wideCard} ${match.status === "in" ? styles.live : ""}`}
      {...(!detailHref ? searchAttrs : undefined)}
    >
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
            <div className={styles.scoreStacked}>
              {match.status === "pre" ? "vs" : `${match.homeScore ?? "-"} : ${match.awayScore ?? "-"}`}
            </div>
            <div className={styles.teamStacked}>
              <TeamBadge name={match.awayName} logo={match.awayLogo} size={44} badgeClass={styles.teamBadgeLg} />
              <span>{match.awayName}</span>
            </div>
          </div>
        ) : (
          <div className={styles.wideCardTeams}>
            <div className={styles.team}>
              <TeamBadge name={match.homeName} logo={match.homeLogo} size={28} badgeClass={styles.teamBadge} />
              <span>{match.homeName}</span>
            </div>
            <div className={styles.score}>
              {match.status === "pre" ? "vs" : `${match.homeScore ?? "-"} : ${match.awayScore ?? "-"}`}
            </div>
            <div className={styles.team}>
              <TeamBadge name={match.awayName} logo={match.awayLogo} size={28} badgeClass={styles.teamBadge} />
              <span>{match.awayName}</span>
            </div>
          </div>
        )}
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
    <Link href={detailHref} className={styles.wideCardLink} {...searchAttrs}>
      {card}
    </Link>
  ) : (
    card
  );
};

export default WideMatchCard;
