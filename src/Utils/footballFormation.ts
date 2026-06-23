import { RosterPlayer, TeamRoster } from "./sports";

// Coordinate space matches public/images/SVGforFootballFeild.svg's viewBox
// exactly (1230x900) — the pitch is drawn in perspective (narrower at the top
// "far" edge, wider at the bottom "near" edge), so player x-position has to
// scale with depth rather than being a flat percentage grid.
export const PITCH_VIEWBOX_WIDTH = 1230;
export const PITCH_VIEWBOX_HEIGHT = 900;

const TOP_HALF_WIDTH = 377.58; // (992.329 - 237.175) / 2, the pitch's top edge
const BOTTOM_HALF_WIDTH = 615; // (1230 - 0) / 2, the pitch's bottom edge
const CENTER_X = 615;
const LATERAL_MARGIN = 0.82; // keep markers off the touchline

const halfWidthAt = (t: number) => TOP_HALF_WIDTH + (BOTTOM_HALF_WIDTH - TOP_HALF_WIDTH) * t;

const pitchPoint = (t: number, s: number) => ({
  x: CENTER_X + s * halfWidthAt(t) * LATERAL_MARGIN,
  y: t * PITCH_VIEWBOX_HEIGHT,
});

// Row buckets, defense (1) to attack (5) — GK is 0. Wing-backs are grouped
// with the back line; wide mids/forwards share a row with their central
// counterparts and are separated horizontally instead.
const rowBucketForAbbreviation = (abbreviation = ""): number => {
  const code = abbreviation.toUpperCase().replace(/-(L|R|C)$/, "");
  if (code === "G" || code === "GK") return 0;
  if (["LWB", "RWB", "LB", "RB", "CB", "CD", "SW"].includes(code)) return 1;
  if (["DM", "CDM"].includes(code)) return 2;
  if (["CM", "LM", "RM"].includes(code)) return 3;
  if (["AM", "CAM", "LW", "RW"].includes(code)) return 4;
  if (["F", "FW", "ST", "CF"].includes(code)) return 5;
  return 3;
};

// Left-to-right sort key derived from the abbreviation itself (e.g. "LB",
// "CD-R") — used to order players within a row, not as an exact coordinate.
const lateralBias = (abbreviation = ""): number => {
  const upper = abbreviation.toUpperCase();
  if (upper.endsWith("-L")) return -1;
  if (upper.endsWith("-R")) return 1;
  if (upper.startsWith("L")) return -2;
  if (upper.startsWith("R")) return 2;
  return 0;
};

export type PitchPlayer = {
  player: RosterPlayer;
  x: number;
  y: number;
};

const distributeRow = (players: RosterPlayer[], t: number): PitchPlayer[] => {
  const sorted = [...players].sort((a, b) => {
    const biasDiff = lateralBias(a.position) - lateralBias(b.position);
    if (biasDiff !== 0) return biasDiff;
    return (Number(a.jersey) || 0) - (Number(b.jersey) || 0);
  });
  const n = sorted.length;
  return sorted.map((player, i) => {
    const s = n > 1 ? -0.85 + i * (1.7 / (n - 1)) : 0;
    const { x, y } = pitchPoint(t, s);
    return { player, x, y };
  });
};

const ROW_T_RANGE: [number, number] = [0.1, 0.46];
const GK_T = 0.045;

// `half` decides which goal line a team's GK sits closest to — "top" plays
// top-to-bottom (GK near y=0), "bottom" plays bottom-to-top (GK near y=900),
// so the two teams' lineups meet in the middle of the pitch.
export const buildPitchLayout = (roster: TeamRoster, half: "top" | "bottom"): PitchPlayer[] => {
  const starters = roster.players.filter((p) => p.starter);
  const gk = starters.find((p) => rowBucketForAbbreviation(p.position) === 0);
  const outfield = starters.filter((p) => p !== gk);

  const buckets = new Map<number, RosterPlayer[]>();
  outfield.forEach((p) => {
    const bucket = rowBucketForAbbreviation(p.position);
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push(p);
  });

  const rowIds = Array.from(buckets.keys()).sort((a, b) => a - b);
  const [minT, maxT] = ROW_T_RANGE;
  const mirror = half === "bottom";
  const adjustT = (t: number) => (mirror ? 1 - t : t);

  const layout: PitchPlayer[] = [];

  if (gk) {
    const { x, y } = pitchPoint(adjustT(GK_T), 0);
    layout.push({ player: gk, x, y });
  }

  rowIds.forEach((bucketId, index) => {
    const t = rowIds.length > 1 ? minT + index * ((maxT - minT) / (rowIds.length - 1)) : (minT + maxT) / 2;
    distributeRow(buckets.get(bucketId)!, adjustT(t)).forEach((p) => layout.push(p));
  });

  return layout;
};
