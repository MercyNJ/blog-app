import { Link } from "react-router-dom";
import {UserContext} from "./UserContext";

export default function CategorySubheader() {
  return (
    <nav className="categories">
      <Link to="/category/grief">Grief</Link>
      <Link to="/category/mental-wellness">Mental Wellness</Link>
      <Link to="/category/hope-encouragement">Hope & Encouragement</Link>
      <Link to="/category/my-journey">My Journey</Link>
      <Link to="/category/random-thoughts">Random Thoughts</Link>
    </nav>
  );
}
