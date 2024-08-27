/*
import Header from "./Header";
import CategorySubheader from "./CategorySubheader";
import Footer from "./Footer";
import BannerImage from "./BannerImage";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";

export default function Layout() {
	const location = useLocation();

  return (
    <>
      <Header />
      <CategorySubheader /> 
      {location.pathname !== "/about" && <BannerImage />}
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
*/

import Header from "./Header";
import CategorySubheader from "./CategorySubheader";
import Footer from "./Footer";
import BannerImage from "./BannerImage";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";

import { useEffect, useState } from "react";
import { FaArrowUp } from "react-icons/fa";

export default function Layout() {
  const location = useLocation();
  const [showScroll, setShowScroll] = useState(false);

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

  return (
    <>
      <Header />
      <CategorySubheader /> 
      {location.pathname !== "/about" && <BannerImage />}
      <main>
        <Outlet />
      </main>
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

