import Header from "./Header";
import CategorySubheader from "./CategorySubheader";
import Footer from "./Footer";
import BannerImage from "./BannerImage";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";

import { useEffect, useRef, useState } from "react";
import { FaArrowUp } from "react-icons/fa";
import { scrollToElement } from "./utils/scrollToElement";

// Content-browsing routes get the sidebar; forms and About don't.
const SIDEBAR_ROUTES = [/^\/$/, /^\/category\//, /^\/post\//];

export default function Layout() {
  const location = useLocation();
  const [showScroll, setShowScroll] = useState(false);
  const mainRef = useRef(null);

  const showBanner = location.pathname !== "/about";
  const showSidebar = SIDEBAR_ROUTES.some(
    pattern => pattern.test(location.pathname)
  );

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const checkScrollTop = () => {
    if (!showScroll && window.pageYOffset > 300) {
      setShowScroll(true);
    } else if (showScroll && window.pageYOffset <= 300) {
      setShowScroll(false);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', checkScrollTop);
    return () => {
      window.removeEventListener('scroll', checkScrollTop);
    };
  }, [showScroll]);

  // On each page change, show the page's content rather than the previous scroll position.
  // The home page opens at the top; home-page searches scroll themselves (see IndexPage).
  useEffect(() => {
    const isHomePage = location.pathname === '/';

    if (isHomePage && new URLSearchParams(location.search).has('q')) {
      return;
    }

    if (isHomePage) {
      window.scrollTo({ top: 0 });
      return;
    }

    scrollToElement(mainRef.current, 'auto');
    // Only page changes should scroll; query-string changes are handled by the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const pageContent = (
    <>
      <CategorySubheader />
      {showBanner && <BannerImage />}
      <main ref={mainRef}>
        <Outlet />
      </main>
    </>
  );

  return (
    <>
      <div className="site-header">
        <Header />
      </div>

      {showSidebar ? (
        <div className="page-body">
          <div className="primary-column">
            {pageContent}
          </div>
          <Sidebar />
        </div>
      ) : (
        pageContent
      )}

      <Footer />

      {showScroll && (
        <FaArrowUp
          onClick={scrollToTop}
          className="scroll-to-top"
          title="Scroll to top"
        />
      )}
    </>
  );
}
