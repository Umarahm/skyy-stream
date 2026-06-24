import styles from "./style.module.scss";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";

const Standings = ({ table }: { table: any[] }) => {
  if (!table.length) {
    return <p className={styles.message}>Standings unavailable for this competition yet.</p>;
  }

  const groups = table.reduce((acc: Record<string, any[]>, row) => {
    const key = row.strGroup || "Standings";
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});

  const sortedGroups = Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, rows]) => [
      group,
      [...rows].sort((a, b) => Number(a.intRank) - Number(b.intRank)),
    ] as [string, any[]]);

  return (
    <div className={styles.standingsWrapper}>
      {sortedGroups.map(([group, rows]) => (
        <div key={group} className={styles.standingsGroup}>
          <h3>{group}</h3>
          <table className={styles.standingsTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.idStanding || `${row.strTeam}-${row.intRank}`}
                  className={index === 0 ? styles.topRow : ""}
                >
                  <td>{row.intRank}</td>
                  <td className={styles.teamCell}>
                    {row.strBadge ? (
                      <LazyLoadImage
                        src={row.strBadge}
                        alt={row.strTeam}
                        effect="opacity"
                        className={`${styles.standingsBadge} skeleton`}
                        width={20}
                        height={20}
                      />
                    ) : (
                      <div className={styles.standingsBadge} />
                    )}
                    {row.strTeam}
                  </td>
                  <td>{row.intPlayed}</td>
                  <td>{row.intWin}</td>
                  <td>{row.intDraw}</td>
                  <td>{row.intLoss}</td>
                  <td>{row.intPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default Standings;
