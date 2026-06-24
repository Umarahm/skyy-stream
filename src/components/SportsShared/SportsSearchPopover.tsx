import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./style.module.scss";
import { MdClose, MdSearch } from "react-icons/md";

type SearchResult = {
  label: string;
  href: string | null;
  el: HTMLElement;
};

const MAX_RESULTS = 30;
const HIGHLIGHT_MS = 1600;

// There's no central registry of "every event currently loaded" — different
// sports pages (home, live, cricket, league) each hold their own match state.
// Rather than wiring every page into a shared store, this scans the live DOM
// for anything carrying `data-sports-search-item` (set by WideMatchCard and
// the league tiles) — so it always reflects exactly what's rendered on
// screen right now, on whichever sports page is open.
const scanSearchableItems = (): SearchResult[] =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-sports-search-item]")).map((el) => ({
    label: el.getAttribute("data-sports-search-label") || "",
    href: el.tagName === "A" ? el.getAttribute("href") : null,
    el,
  }));

const SportsSearchPopover = ({ onClose }: { onClose: () => void }) => {
  const { push } = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchResult[]>([]);

  useEffect(() => {
    setItems(scanSearchableItems());
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const normalizedQuery = query.trim().toLowerCase();
  const results = (
    normalizedQuery
      ? items.filter((item) => item.label.toLowerCase().includes(normalizedQuery))
      : items
  ).slice(0, MAX_RESULTS);

  const handleSelect = (item: SearchResult) => {
    onClose();
    if (item.href) {
      push(item.href);
      return;
    }
    // Let the popover finish unmounting first so its layout removal doesn't
    // throw off where `scrollIntoView` lands.
    setTimeout(() => {
      item.el.scrollIntoView({ behavior: "smooth", block: "center" });
      item.el.classList.add(styles.searchHighlight);
      setTimeout(() => item.el.classList.remove(styles.searchHighlight), HIGHLIGHT_MS);
    }, 50);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.searchPanel}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchBar}>
          <MdSearch />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, teams, leagues..."
          />
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close search">
            <MdClose />
          </button>
        </div>
        <div className={styles.searchResults}>
          {results.length === 0 ? (
            <p className={styles.message}>
              {items.length === 0 ? "Nothing loaded on this page yet." : "No matches for that search."}
            </p>
          ) : (
            results.map((item, index) => (
              <button
                type="button"
                key={`${item.label}-${index}`}
                className={styles.searchResultRow}
                onClick={() => handleSelect(item)}
              >
                {item.label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SportsSearchPopover;
