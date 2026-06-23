import { TeamRoster } from "@/Utils/sports";
import { PITCH_VIEWBOX_HEIGHT, PITCH_VIEWBOX_WIDTH, PitchPlayer, buildPitchLayout } from "@/Utils/footballFormation";
import styles from "./style.module.scss";

type TeamWithColor = { roster: TeamRoster; color: string };

const MARKER_RADIUS = 26;

const displayName = (p: PitchPlayer["player"]) => p.shortName || p.name;

const PlayerMarker = ({ entry, color }: { entry: PitchPlayer; color: string }) => {
  const { player, x, y } = entry;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r={MARKER_RADIUS} fill={color} stroke="#0a0a0a" strokeWidth={2.5} />
      <text textAnchor="middle" dy={7} fontSize={21} fontWeight={700} fill="#fff">
        {player.jersey || "-"}
      </text>
      <text textAnchor="middle" y={MARKER_RADIUS + 19} fontSize={18} fill="#fff" className={styles.pitchPlayerName}>
        {displayName(player)}
      </text>

      {player.goals > 0 && (
        <text x={-MARKER_RADIUS - 8} y={-MARKER_RADIUS + 6} fontSize={22} textAnchor="middle">
          ⚽
        </text>
      )}
      {player.redCards > 0 ? (
        <rect x={MARKER_RADIUS - 5} y={-MARKER_RADIUS - 6} width={14} height={19} rx={2} fill="#ef4444" />
      ) : player.yellowCards > 0 ? (
        <rect x={MARKER_RADIUS - 5} y={-MARKER_RADIUS - 6} width={14} height={19} rx={2} fill="#facc15" />
      ) : null}
    </g>
  );
};

const PitchLineup = ({ home, away }: { home: TeamWithColor; away: TeamWithColor }) => {
  const homeLayout = buildPitchLayout(home.roster, "bottom");
  const awayLayout = buildPitchLayout(away.roster, "top");

  return (
    <div className={styles.pitchScroll}>
      <div className={styles.pitchWrapper}>
        <svg
          viewBox={`0 0 ${PITCH_VIEWBOX_WIDTH} ${PITCH_VIEWBOX_HEIGHT}`}
          className={styles.pitchSvg}
          preserveAspectRatio="xMidYMid meet"
        >
          <image href="/images/SVGforFootballFeild.svg" x={0} y={0} width={PITCH_VIEWBOX_WIDTH} height={PITCH_VIEWBOX_HEIGHT} />
          {awayLayout.map((entry) => (
            <PlayerMarker key={entry.player.id} entry={entry} color={away.color} />
          ))}
          {homeLayout.map((entry) => (
            <PlayerMarker key={entry.player.id} entry={entry} color={home.color} />
          ))}
        </svg>

        <div className={styles.pitchLegend}>
          <span>
            <i style={{ background: away.color }} /> {away.roster.team}
          </span>
          <span>
            <i style={{ background: home.color }} /> {home.roster.team}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PitchLineup;
