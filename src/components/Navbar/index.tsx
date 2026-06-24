import React, { useState, useEffect } from "react";
import styles from "./style.module.scss";
import Link from "next/link";
// import {
//   AiFillHome,
//   AiOutlineHome,
//   AiFillPlayCircle,
//   AiOutlinePlayCircle,
// } from "react-icons/ai";
// import {
//   IoLibrary,
//   IoLibraryOutline,
//   IoSettings,
//   IoSettingsOutline,
//   IoSearchOutline,
//   IoSearch,
// } from "react-icons/io5";
// import { PiTelevisionFill, PiTelevisionLight } from "react-icons/pi";

import { IoLibrary, IoLibraryOutline } from "react-icons/io5";
import {
  MdOutlineCollectionsBookmark,
  MdCollectionsBookmark,
  MdMenuBook,
  MdOutlineMenuBook,
  MdHome,
  MdOutlineHome,
  MdPlayCircle,
  MdOutlinePlayCircle,
  MdSearch,
  MdOutlineSearch,
  MdSettings,
  MdOutlineSettings,
  MdTv,
  MdOutlineTv,
  MdTheaterComedy,
  MdOutlineTheaterComedy,
} from "react-icons/md";
import { RiEye2Line, RiEye2Fill, RiCalendarScheduleLine } from "react-icons/ri";
import { GrAnnounce } from "react-icons/gr";
import { usePathname, useSearchParams } from "next/navigation";
import { AppHub } from "@/Utils/settings";
import SportsSearchPopover from "@/components/SportsShared/SportsSearchPopover";

const Navbar = ({ hub }: { hub: AppHub | "" }) => {
  const path = usePathname();
  const params = useSearchParams();
  // const query=
  const [pathname, setPathname] = useState(path);
  const [sportsSearchOpen, setSportsSearchOpen] = useState(false);
  useEffect(() => {
    if (params.get("type") !== null) setPathname("/" + params.get("type"));
    // else setPathname(path);
    else if (path !== null) {
      const arr = path?.split("/");
      setPathname("/" + arr[1]);
    }
    // console.log(path);
  }, [path, params]);
  return (
    <div className={styles.navbar}>
      <Link
        href={hub === "japanese" ? "/japanese" : hub === "sports" ? "/sports" : "/"}
        aria-label="Home"
        data-tooltip-id="tooltip"
        data-tooltip-content="Home"
      >
        {pathname === "/" ||
        pathname === "/japanese" ||
        pathname === "/sports" ||
        pathname === "/recommendation" ? (
          <MdHome className={styles.active} />
        ) : (
          <MdOutlineHome className={styles.inactive} />
        )}
      </Link>
      {hub === "sports" ? (
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => setSportsSearchOpen(true)}
          aria-label="Search"
          data-tooltip-id="tooltip"
          data-tooltip-content="Search this page"
        >
          {sportsSearchOpen ? (
            <MdSearch className={styles.active} />
          ) : (
            <MdOutlineSearch className={styles.inactive} />
          )}
        </button>
      ) : (
        <Link
          href={hub === "japanese" ? "/anime-search" : "/search"}
          aria-label="Search"
          data-tooltip-id="tooltip"
          data-tooltip-html="<div>Search <span class='tooltip-btn'>CTRL + K</span></div>"
        >
          {pathname === "/search" || pathname === "/anime-search" ? (
            <MdSearch className={styles.active} />
          ) : (
            <MdOutlineSearch className={styles.inactive} />
          )}
        </Link>
      )}
      {hub === "sports" ? null : hub !== "japanese" ? (
        <>
          <Link
            href="/movie"
            aria-label="Movies"
            data-tooltip-id="tooltip"
            data-tooltip-content="Movies"
          >
            {pathname === "/movie" ? (
              <MdPlayCircle className={styles.active} />
            ) : (
              <MdOutlinePlayCircle className={styles.inactive} />
            )}
          </Link>
          <Link
            href="/tv"
            aria-label="Tv shows"
            data-tooltip-id="tooltip"
            data-tooltip-content="TV shows"
          >
            {pathname === "/tv" ? (
              <MdTv className={styles.active} />
            ) : (
              <MdOutlineTv className={styles.inactive} />
            )}
          </Link>
          <Link
            href="/kdrama"
            aria-label="K-Drama"
            data-tooltip-id="tooltip"
            data-tooltip-content="K-Drama"
            className={styles.mobileHide}
          >
            {pathname === "/kdrama" ? (
              <MdTheaterComedy className={styles.active} />
            ) : (
              <MdOutlineTheaterComedy className={styles.inactive} />
            )}
          </Link>
          <Link
            href="/collections"
            aria-label="Collections"
            data-tooltip-id="tooltip"
            data-tooltip-content="Collections"
            className={styles.mobileHide}
          >
            {pathname === "/collections" ? (
              <MdCollectionsBookmark className={styles.active} />
            ) : (
              <MdOutlineCollectionsBookmark className={styles.inactive} />
            )}
          </Link>
          <Link
            href="/library"
            aria-label="Library"
            data-tooltip-id="tooltip"
            data-tooltip-content="Library"
            className={styles.mobileHide}
          >
            {pathname === "/library" ? (
              <IoLibrary className={styles.active} />
            ) : (
              <IoLibraryOutline className={styles.inactive} />
            )}
          </Link>
        </>
      ) : (
        <>
          <Link
            href="/anime"
            aria-label="Anime"
            data-tooltip-id="tooltip"
            data-tooltip-content="Anime"
          >
            {pathname === "/anime" || pathname === "/anime-detail" || pathname === "/anime-details" ? (
              <RiEye2Fill className={styles.active} />
            ) : (
              <RiEye2Line className={styles.inactive} />
            )}
          </Link>
          <Link
            href="/manga"
            aria-label="Manga"
            data-tooltip-id="tooltip"
            data-tooltip-content="Manga"
          >
            {pathname === "/manga" || pathname === "/manga-read" ? (
              <MdMenuBook className={styles.active} />
            ) : (
              <MdOutlineMenuBook className={styles.inactive} />
            )}
          </Link>
          <Link
            href="/schedule"
            aria-label="Schedule"
            data-tooltip-id="tooltip"
            data-tooltip-content="Anime Schedule"
            className={styles.mobileHide}
          >
            <RiCalendarScheduleLine
              className={pathname === "/schedule" ? styles.active : styles.inactive}
            />
          </Link>
        </>
      )}
      <Link
        href="/announcements"
        aria-label="Announcements"
        data-tooltip-id="tooltip"
        data-tooltip-content="Announcements"
        className={styles.mobileHide}
      >
        <GrAnnounce
          className={pathname === "/announcements" ? styles.active : styles.inactive}
        />
      </Link>
      <Link
        href="/settings"
        aria-label="Settings"
        data-tooltip-id="tooltip"
        data-tooltip-content="Settings"
      >
        {pathname === "/settings" ||
          pathname === "/downloads" ||
          pathname === "/disclaimer" ||
          pathname === "/signup" ||
          pathname === "/login" ? (
          <MdSettings className={styles.active} />
        ) : (
          <MdOutlineSettings className={styles.inactive} />
        )}
      </Link>
      {sportsSearchOpen && <SportsSearchPopover onClose={() => setSportsSearchOpen(false)} />}
    </div>
  );
};

export default Navbar;
