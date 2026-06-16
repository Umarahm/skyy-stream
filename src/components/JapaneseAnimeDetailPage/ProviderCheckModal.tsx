import { AnimatePresence, motion } from "framer-motion";
import styles from "./provider-check.module.scss";

export type ProviderProbeItem = {
  provider: string;
  status: "idle" | "checking" | "success" | "failed";
  message?: string;
};

const ProviderCheckModal = ({
  open,
  title,
  episode,
  items,
}: {
  open: boolean;
  title: string;
  episode: number | null;
  items: ProviderProbeItem[];
}) => {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <h3>Checking Providers</h3>
            <p className={styles.context}>
              {title} {episode ? `• EP ${episode}` : ""}
            </p>
            <div className={styles.list}>
              {items.map((item) => (
                <div key={item.provider} className={`${styles.item} ${styles[item.status]}`}>
                  <span className={styles.dot}></span>
                  <div>
                    <h4>{item.provider.toUpperCase()}</h4>
                    <p>{item.message || "Waiting..."}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default ProviderCheckModal;
