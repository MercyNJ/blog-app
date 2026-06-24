import { Link } from "react-router-dom";
import { CATEGORIES } from "./constants/categories";

export default function CategorySubheader({ setCategory }) {
  const handleCategoryChange = (category) => {
    if (setCategory) {
      setCategory(category);
    }
  };

  return (
    <nav className="categories">
      {CATEGORIES.map((category) => (
        <Link
          key={category.value}
          to={`/category/${category.value}`}
          onClick={() => handleCategoryChange(category.value)}
        >
          {category.label}
        </Link>
      ))}
    </nav>
  );
}