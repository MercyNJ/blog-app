import Post from "../Post";
import PostSkeleton from "../PostSkeleton";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const SKELETON_COUNT = 5;

export default function IndexPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();

  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState('');

  const [isSearchMode, setIsSearchMode] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const query = searchParams.get('q');

    if (query) {
      setSearchTerm(query);
      handleSearch(query);
    } else {
      fetchPosts(1);
    }
    // Runs only when the URL's search query changes (e.g. via the sidebar search).
  }, [searchParams]);

  async function fetchPosts(pageToFetch = 1) {
    try {
      setLoadingPosts(true);
      setError('');
      setIsSearchMode(false);

      const response = await fetch(`${API_URL}/post?page=${pageToFetch}&limit=10`);

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
      setPage(data.page || pageToFetch);
      setTotalPages(data.totalPages || 1);

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

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    fetchPosts(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      setIsSearchMode(true);

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
        Browse Posts
      </div>

      {loadingPosts &&
        Array.from({ length: SKELETON_COUNT }).map((_, index) => (
          <PostSkeleton key={index} />
        ))}

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

      {!loadingPosts && !error && !isSearchMode && totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="pagination-button"
          >
            Previous
          </button>

          <span className="pagination-status">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}