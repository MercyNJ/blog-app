import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatISO9075 } from "date-fns";
import { FaHeartBroken, FaBrain, FaSun, FaRoute, FaFeatherAlt } from "react-icons/fa";
import { CATEGORIES } from "./constants/categories";
import myimg from './assets/picS.png';

const CATEGORY_ICONS = {
  'grief': FaHeartBroken,
  'mental-wellness': FaBrain,
  'hope-encouragement': FaSun,
  'my-journey': FaRoute,
  'reflections': FaFeatherAlt,
};

export default function Sidebar() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [recentPosts, setRecentPosts] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    fetchRecentPosts();
  }, []);

  async function fetchRecentPosts() {
    try {
      setLoadingRecent(true);

      const response = await fetch(`${API_URL}/post?limit=5`);
      const data = await response.json();

      if (response.ok) {
        setRecentPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Fetch recent posts error:', error);
    } finally {
      setLoadingRecent(false);
    }
  }

  function handleSearch(ev) {
    ev.preventDefault();

    const trimmed = searchTerm.trim();

    if (!trimmed) {
      return;
    }

    navigate(`/?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <aside className="sidebar">
      <section className="sidebar-section">
        <h3 className="sidebar-heading">Search</h3>

        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={ev => setSearchTerm(ev.target.value)}
            className="search-input"
          />

          <button type="submit" className="search-button">
            Search
          </button>
        </form>
      </section>

      <section className="sidebar-section">
        <h3 className="sidebar-heading">Recent Posts</h3>

        {loadingRecent && (
          <p className="sidebar-empty">Loading...</p>
        )}

        {!loadingRecent && recentPosts.length === 0 && (
          <p className="sidebar-empty">No posts yet.</p>
        )}

        {!loadingRecent && recentPosts.length > 0 && (
          <ul className="sidebar-recent-posts">
            {recentPosts.map(post => (
              <li key={post.id}>
                <div className="recent-post-content">
                  <Link to={`/post/${post.id}`}>{post.title}</Link>
                  <time>{formatISO9075(new Date(post.createdAt))}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sidebar-section">
        <h3 className="sidebar-heading">Categories</h3>

        <ul className="sidebar-categories">
          {CATEGORIES.map(category => {
            const Icon = CATEGORY_ICONS[category.value];

            return (
              <li key={category.value}>
                <Link to={`/category/${category.value}`}>
                  {Icon && <Icon className="category-icon" />}
                  {category.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="sidebar-section sidebar-about">
        <h3 className="sidebar-heading">I&apos;M MERCY NJUGUNA</h3>

        <img
          src={myimg}
          alt="Mercy Njuguna"
          className="sidebar-about-image"
        />

        <p className="sidebar-about-text">
          I am a follower of Christ, a wife, a mom, and a software engineer.
          <br /><br />
          I created this space to encourage and inspire you on your journey
          to living a meaningful life in Christ.
          <br /><br />
          Join me as we explore how to live with an eternal perspective.
        </p>

        <Link to="/about" className="read-more-button">
          READ MORE
        </Link>
      </section>
    </aside>
  );
}
