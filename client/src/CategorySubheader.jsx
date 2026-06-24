import { Link } from "react-router-dom";

export default function CategorySubheader({ setCategory }) {
  const handleCategoryChange = (category) => {
    setCategory(category);
  };

  return (
    <nav className="categories">
      <Link to="/category/grief" onClick={() => handleCategoryChange("grief")}>Grief</Link>
      <Link to="/category/mental-wellness" onClick={() => handleCategoryChange("mental-wellness")}>Mental Wellness</Link>
      <Link to="/category/hope-encouragement" onClick={() => handleCategoryChange("hope-encouragement")}>Hope & Encouragement</Link>
      <Link to="/category/my-journey" onClick={() => handleCategoryChange("my-journey")}>My Journey</Link>
      <Link to="/category/reflections" onClick={() => handleCategoryChange("reflections")}>Reflections</Link>
    </nav>
  );
}