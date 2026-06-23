import { ReactNode } from "react";
import styles from "./style.module.scss";
import Navbar from "@/components/Navbar";
import SportsSubNav from "@/components/SportsSubNav";

const SportsShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className={styles.sportsPage}>
      <Navbar hub="sports" />
      <div className={styles.content}>
        <SportsSubNav />
        {children}
      </div>
    </div>
  );
};

export default SportsShell;
