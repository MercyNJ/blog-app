import { useContext, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { formatISO9075 } from "date-fns";
import { UserContext } from "../UserContext";
import { NotificationContext } from "../NotificationContext";
import { CATEGORIES } from "../constants/categories";
import { usePageMeta } from "../utils/usePageMeta";
import { scrollToElement } from "../utils/scrollToElement";

const POSTS_PER_PAGE = 20;

export default function ManagePostsPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { userInfo, isLoadingUser } = useContext(UserContext);
  const { showNotification } = useContext(NotificationContext);
  const headingRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [deletingPostId, setDeletingPostId] = useState(null);
  const [deletePostError, setDeletePostError] = useState(null);

  usePageMeta('Manage Posts');

  const isAdmin = userInfo?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchPosts(1);
    }
    // Load once the user is known to be an admin; later loads come from paging and deleting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Uses the public post list, so only posts already visible to readers are shown.
  async function fetchPosts(pageToFetch = 1, category = categoryFilter) {
    try {
      setLoadingPosts(true);
      setError('');
      setActiveSearch('');

      const categoryQuery = category ? `&category=${encodeURIComponent(category)}` : '';

      const response = await fetch(
        `${API_URL}/post?page=${pageToFetch}&limit=${POSTS_PER_PAGE}${categoryQuery}`
      );

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

  // Uses the public search, so results are the same posts readers can find. Not paginated.
  async function searchPosts(term) {
    const trimmedTerm = term.trim();

    if (!trimmedTerm) {
      fetchPosts(1);
      return;
    }

    // The search endpoint can't filter by category, so a search covers all categories.
    setCategoryFilter('');

    try {
      setLoadingPosts(true);
      setError('');
      setActiveSearch(trimmedTerm);

      const response = await fetch(
        `${API_URL}/search?q=${encodeURIComponent(trimmedTerm)}`
      );

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
          'Failed to search posts.'
        );
      }

      setPosts(data.posts || []);

    } catch (error) {
      console.error('Search posts error:', error);

      setPosts([]);

      setError(
        error.message ||
        'Unable to search posts.'
      );
    } finally {
      setLoadingPosts(false);
    }
  }

  function clearSearch() {
    setSearchTerm('');
    fetchPosts(1);
  }

  function handleCategoryChange(category) {
    setCategoryFilter(category);
    setSearchTerm('');
    fetchPosts(1, category);
  }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    fetchPosts(newPage);
    scrollToElement(headingRef.current);
  }

  async function handleDelete(post) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${post.title}"?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingPostId(post.id);
    setDeletePostError(null);

    try {
      const response = await fetch(`${API_URL}/post/${post.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

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
          'Failed to delete post.'
        );
      }

      showNotification('Post deleted.');

      // Reload the current view; when paging, step back if this page is now empty.
      if (activeSearch) {
        searchPosts(activeSearch);
      } else {
        const pageToReload = posts.length === 1 && page > 1 ? page - 1 : page;
        fetchPosts(pageToReload);
      }

    } catch (error) {
      console.error('Delete post error:', error);
      setDeletePostError({ postId: post.id, message: error.message });
    } finally {
      setDeletingPostId(null);
    }
  }

  if (isLoadingUser) {
    return <p>Loading...</p>;
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="manage-posts">
      <h1 className="category-heading" ref={headingRef}>
        Manage Posts
      </h1>

      <div className="manage-posts-actions">
        <Link to="/create" className="read-more-button">
          New Post
        </Link>
      </div>

      <form
        className="search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          searchPosts(searchTerm);
        }}
      >
        <label htmlFor="manage-posts-search" className="sr-only">
          Search posts
        </label>
        <input
          id="manage-posts-search"
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

      <div className="manage-posts-filter">
        <label htmlFor="manage-posts-category">Category:</label>
        <select
          id="manage-posts-category"
          value={categoryFilter}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="">All categories</option>

          {CATEGORIES.map(category => (
            <option
              key={category.value}
              value={category.value}
            >
              {category.label}
            </option>
          ))}
        </select>
      </div>

      {loadingPosts && <p>Loading posts...</p>}

      {!loadingPosts && error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {!loadingPosts && !error && posts.length === 0 && (
        <p className="info-paragraph">
          {activeSearch
            ? 'No posts match your search.'
            : categoryFilter
              ? 'No posts in this category.'
              : 'No posts yet.'}
        </p>
      )}

      {!loadingPosts && activeSearch && (
        <button
          type="button"
          className="show-all-button"
          onClick={clearSearch}
        >
          Show all posts
        </button>
      )}

      {!loadingPosts && !error && posts.length > 0 && (
        <div className="manage-posts-table-wrapper">
          <table className="manage-posts-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Category</th>
                <th scope="col">Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {posts.map(post => (
                <tr key={post.id}>
                  <td>
                    <Link to={`/post/${post.id}`}>{post.title}</Link>

                    {deletePostError?.postId === post.id && (
                      <p className="error-message">
                        {deletePostError.message}
                      </p>
                    )}
                  </td>

                  <td>
                    {CATEGORIES.find(c => c.value === post.category)?.label || post.category}
                  </td>

                  <td>
                    <time>
                      {formatISO9075(new Date(post.createdAt), { representation: 'date' })}
                    </time>
                  </td>

                  <td>
                    <div className="manage-posts-row-actions">
                      <Link
                        to={`/edit/${post.id}`}
                        className="manage-posts-button"
                        aria-label={`Edit "${post.title}"`}
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        className="manage-posts-button"
                        onClick={() => handleDelete(post)}
                        disabled={deletingPostId === post.id}
                        aria-label={`Delete "${post.title}"`}
                      >
                        {deletingPostId === post.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loadingPosts && !error && !activeSearch && totalPages > 1 && (
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
    </div>
  );
}
