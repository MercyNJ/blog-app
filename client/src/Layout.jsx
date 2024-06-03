import Header from "./Header";
import CategorySubheader from "./CategorySubheader";
import Footer from "./Footer";
import BannerImage from "./BannerImage";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <Header />
      <CategorySubheader /> 
      <BannerImage />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

