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

