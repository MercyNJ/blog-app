import { NavLink } from "react-router-dom";
import { CATEGORIES } from "./constants/categories";
import { CATEGORY_ICONS } from "./constants/categoryIcons";

export default function CategorySubheader({ setCategory }) {
  const handleCategoryChange = (category) => {
    if (setCategory) {
      setCategory(category);
    }
  };

  return (
    <nav className="categories">
      {CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category.value];

        return (
          <NavLink
            key={category.value}
            to={`/category/${category.value}`}
            onClick={() => handleCategoryChange(category.value)}
            className={({ isActive }) => isActive ? 'active-category' : undefined}
          >
            {Icon && <Icon className="category-icon" />}
            {category.label}
          </NavLink>
        );
      })}
    </nav>
  );
}