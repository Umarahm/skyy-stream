import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./style.module.scss";
import { EVENTS_CONFIG } from "@/Utils/sportsEvents";

const TABS = [
  { href: "/sports", label: "Home" },
  { href: "/sports-live", label: "Live" },
  { href: "/sports-cricket", label: "Cricket" },
];

const FIFA_ROUTES = new Set([
  "/sports-fifa-schedule",
  "/sports-fifa-standings",
  "/sports-fifa-news",
  "/sports-fifa-highlights",
]);

const SportsSubNav = () => {
  const pathname = usePathname();
  const fifa = EVENTS_CONFIG.fifaWorldCup;

  return (
    <div className={styles.subNav}>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`${styles.tabPill} ${pathname === tab.href ? styles.active : ""}`}
        >
          {tab.label}
        </Link>
      ))}
      {fifa.enabled && (
        <Link
          href="/sports-fifa-schedule"
          className={`${styles.tabPill} ${styles.fifaPill} ${
            pathname && FIFA_ROUTES.has(pathname) ? styles.active : ""
          }`}
        >
          <img src={fifa.logo} alt={fifa.label} className={styles.fifaLogo} />
          {fifa.label}
        </Link>
      )}
    </div>
  );
};

export default SportsSubNav;
