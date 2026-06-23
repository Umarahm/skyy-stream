import { useEffect, useState } from "react";
import styles from "./style.module.scss";
import { MdClose } from "react-icons/md";
import { getStreamedStream } from "@/Utils/sports";

export type WatchTarget = {
  title: string;
  source: string;
  id: string;
};

const WatchLiveModal = ({ target, onClose }: { target: WatchTarget; onClose: () => void }) => {
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getStreamedStream(target.source, target.id).then((result) => {
      if (!active) return;
      setStreams(Array.isArray(result) ? result : []);
      setActiveIndex(0);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [target.source, target.id]);

  const activeStream = streams[activeIndex];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{target.title}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">
            <MdClose />
          </button>
        </div>

        {loading ? (
          <p className={styles.message}>Loading stream...</p>
        ) : activeStream?.embedUrl ? (
          <>
            <div className={styles.modalPlayer}>
              <iframe
                src={activeStream.embedUrl}
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
              />
            </div>
            {streams.length > 1 && (
              <div className={styles.streamPicker}>
                {streams.map((stream, index) => (
                  <button
                    type="button"
                    key={stream.id || index}
                    className={`${styles.streamOption} ${index === activeIndex ? styles.active : ""}`}
                    onClick={() => setActiveIndex(index)}
                  >
                    {stream.language || `Stream ${index + 1}`} {stream.hd ? "HD" : ""}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className={styles.message}>No live stream is available for this match right now.</p>
        )}
      </div>
    </div>
  );
};

export default WatchLiveModal;
