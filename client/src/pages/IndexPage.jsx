import Post from "../Post";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import myimg from '../assets/picS.png';

export default function IndexPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();

  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const query = searchParams.get('q');

    if (query) {
      setSearchTerm(query);
      handleSearch(query);
    } else {
      fetchPosts();
    }
    // Runs only when the URL's search query changes (e.g. via the sidebar search).
  }, [searchParams]);

  async function fetchPosts() {
    try {
      setLoadingPosts(true);
      setError('');

      const response = await fetch(`${API_URL}/post`);

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          'Failed to load posts.'
        );
      }

      setPosts(data.posts || []);

    } catch (error) {
      console.error('Fetch posts error:', error);

      setError(
        error.message ||
        'Unable to load posts.'
      );
    } finally {
      setLoadingPosts(false);
    }
  }

  async function handleSearch(term = searchTerm) {
    const trimmedTerm = term.trim();

    if (!trimmedTerm) {
      fetchPosts();
      return;
    }

    try {
      setLoadingPosts(true);
      setError('');

      const response = await fetch(
        `${API_URL}/search?q=${encodeURIComponent(trimmedTerm)}`
      );

      let data = [];

      try {
        data = await response.json();
      } catch {
        data = [];
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          'No posts found.'
        );
      }

      setPosts(data.posts || []);

    } catch (error) {
      console.error('Search error:', error);

      setPosts([]);

      setError(
        error.message ||
        'Unable to search posts.'
      );
    } finally {
      setLoadingPosts(false);
    }
  }

  return (
    <>
      <div className="about-me">
        <img
          src={myimg}
          alt="Mercy Njuguna"
          className="about-me-image"
        />

        <div className="about-me-text">
          <h2 className="about-me-heading">
            I'M MERCY NJUGUNA
          </h2>

          <p>
            I am a follower of Christ, a wife, a mom, and a software engineer.
            <br /><br />
            I created this space to encourage and inspire you on your journey
            to living a meaningful life in Christ.
            <br /><br /><br />
            Join me as we explore how to live with an eternal perspective.
          </p>

          <br />

          <Link
            to="/about"
            className="read-more-button"
          >
            READ MORE
          </Link>
        </div>
      </div>

      <form
        className="search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <input
          type="text"
          placeholder="Search posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <button
          type="submit"
          className="search-button"
        >
          Search
        </button>
      </form>

      <div className="must-reads">
        MUST READS
      </div>

      {loadingPosts && (
        <p>Loading posts...</p>
      )}

      {!loadingPosts && error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {!loadingPosts && !error && posts.length === 0 && (
        <p>No posts found.</p>
      )}

      {!loadingPosts &&
        posts.map(post => (
          <Post
            key={post.id}
            {...post}
          />
        ))}
    </>
  );
}