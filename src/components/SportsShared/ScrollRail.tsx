import { ReactNode, useRef } from "react";
import styles from "./style.module.scss";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";

const ScrollRail = ({ title, children }: { title: string; children: ReactNode }) => {
  const railRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <h2 className={styles.railHeading}>
        {title}
        <div className={styles.railControls}>
          <MdChevronLeft
            onClick={() => railRef.current?.scrollBy(-700, 0)}
            data-tooltip-id="tooltip"
            data-tooltip-content="Swipe Left"
          />
          swipe
          <MdChevronRight
            onClick={() => railRef.current?.scrollBy(700, 0)}
            data-tooltip-id="tooltip"
            data-tooltip-content="Swipe Right"
          />
        </div>
      </h2>
      <div className={styles.railRow} ref={railRef}>
        {children}
      </div>
    </>
  );
};

export default ScrollRail;
