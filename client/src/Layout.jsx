import Header from "./Header";
import Footer from "./Footer";
import BannerImage from "./BannerImage";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <Header />
      <BannerImage />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

