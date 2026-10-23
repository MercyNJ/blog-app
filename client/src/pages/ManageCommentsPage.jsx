import { useContext, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { formatISO9075 } from "date-fns";
import { UserContext } from "../UserContext";
import { NotificationContext } from "../NotificationContext";
import { usePageMeta } from "../utils/usePageMeta";
import { scrollToElement } from "../utils/scrollToElement";
import { decodeCommentText } from "../utils/decodeCommentText";
import AdminNav from "../AdminNav";

const COMMENTS_PER_PAGE = 20;
const COMMENT_PREVIEW_LENGTH = 200;
const MAX_POST_OPTIONS = 100;

function previewComment(content) {
  const text = decodeCommentText(content);

  return text.length > COMMENT_PREVIEW_LENGTH
    ? `${text.slice(0, COMMENT_PREVIEW_LENGTH).trimEnd()}…`
    : text;
}

export default function ManageCommentsPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { userInfo, isLoadingUser } = useContext(UserContext);
  const { showNotification } = useContext(NotificationContext);
  const headingRef = useRef(null);

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [deleteCommentError, setDeleteCommentError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [postFilter, setPostFilter] = useState('');
  const [postOptions, setPostOptions] = useState([]);

  usePageMeta('Manage Comments');

  const isAdmin = userInfo?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchComments(1);
      fetchPostOptions();
    }
    // Load once the user is known to be an admin; later loads come from paging and deleting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Titles for the Post dropdown, from the public post list (newest first, up to 100 posts).
  async function fetchPostOptions() {
    try {
      const response = await fetch(`${API_URL}/post?limit=${MAX_POST_OPTIONS}`);
      const data = await response.json();

      if (response.ok) {
        setPostOptions((data.posts || []).map(post => ({ id: post.id, title: post.title })));
      }
    } catch (error) {
      console.error('Fetch post options error:', error);
    }
  }

  // Search and the post filter both run on the server and combine, so results stay paginated.
  async function fetchComments(pageToFetch = 1, search = activeSearch, post = postFilter) {
    try {
      setLoadingComments(true);
      setError('');
      setActiveSearch(search);
      setPostFilter(post);

      const searchQuery = search ? `&q=${encodeURIComponent(search)}` : '';
      const postQuery = post ? `&postId=${encodeURIComponent(post)}` : '';

      const response = await fetch(
        `${API_URL}/admin/comments?page=${pageToFetch}&limit=${COMMENTS_PER_PAGE}${searchQuery}${postQuery}`,
        { credentials: 'include' }
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
          'Failed to load comments.'
        );
      }

      setComments(data.comments || []);
      setPage(data.page || pageToFetch);
      setTotalPages(data.totalPages || 1);

    } catch (error) {
      console.error('Fetch comments error:', error);

      setError(
        error.message ||
        'Unable to load comments.'
      );
    } finally {
      setLoadingComments(false);
    }
  }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    fetchComments(newPage);
    scrollToElement(headingRef.current);
  }

  function handleSearch(ev) {
    ev.preventDefault();
    fetchComments(1, searchTerm.trim());
  }

  function handlePostChange(post) {
    fetchComments(1, activeSearch, post);
  }

  function showAllComments() {
    setSearchTerm('');
    fetchComments(1, '', '');
  }

  async function handleDelete(comment) {
    const confirmed = window.confirm(
      `Delete this comment by @${comment.author?.username || 'unknown'}?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingCommentId(comment.id);
    setDeleteCommentError(null);

    try {
      const response = await fetch(`${API_URL}/comment/${comment.id}`, {
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
          'Failed to delete comment.'
        );
      }

      showNotification('Comment deleted.');

      // Reload so pagination stays correct; step back if this page is now empty.
      const pageToReload = comments.length === 1 && page > 1 ? page - 1 : page;
      fetchComments(pageToReload);

    } catch (error) {
      console.error('Delete comment error:', error);
      setDeleteCommentError({ commentId: comment.id, message: error.message });
    } finally {
      setDeletingCommentId(null);
    }
  }

  if (isLoadingUser) {
    return <p>Loading...</p>;
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="manage-comments">
      <AdminNav />

      <h1 className="category-heading" ref={headingRef}>
        Manage Comments
      </h1>

      <div className="admin-toolbar">
        <form className="admin-search" onSubmit={handleSearch}>
          <label htmlFor="manage-comments-search" className="sr-only">
            Search comments
          </label>
          <input
            id="manage-comments-search"
            type="text"
            placeholder="Search comments, authors or posts..."
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

        <div className="admin-filter">
          <label htmlFor="manage-comments-post">Post:</label>
          <select
            id="manage-comments-post"
            value={postFilter}
            onChange={(e) => handlePostChange(e.target.value)}
          >
            <option value="">All posts</option>

            {postOptions.map(post => (
              <option
                key={post.id}
                value={String(post.id)}
              >
                {post.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingComments && <p>Loading comments...</p>}

      {!loadingComments && error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {!loadingComments && !error && comments.length === 0 && (
        <p className="info-paragraph">
          {activeSearch
            ? 'No comments match your search.'
            : postFilter
              ? 'No comments on this post.'
              : 'No comments yet.'}
        </p>
      )}

      {!loadingComments && (activeSearch || postFilter) && (
        <button
          type="button"
          className="show-all-button"
          onClick={showAllComments}
        >
          Show all comments
        </button>
      )}

      {!loadingComments && !error && comments.length > 0 && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Comment</th>
                <th scope="col">Author</th>
                <th scope="col">Post</th>
                <th scope="col">Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {comments.map(comment => (
                <tr key={comment.id}>
                  <td className="admin-comment-text">
                    {previewComment(comment.content)}

                    {deleteCommentError?.commentId === comment.id && (
                      <p className="error-message">
                        {deleteCommentError.message}
                      </p>
                    )}
                  </td>

                  <td>@{comment.author?.username || 'unknown'}</td>

                  <td>
                    {comment.post ? (
                      <Link to={`/post/${comment.post.id}`}>{comment.post.title}</Link>
                    ) : (
                      'Unknown post'
                    )}
                  </td>

                  <td>
                    <time>{formatISO9075(new Date(comment.createdAt))}</time>
                  </td>

                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-button"
                        onClick={() => handleDelete(comment)}
                        disabled={deletingCommentId === comment.id}
                        aria-label={`Delete comment by @${comment.author?.username || 'unknown'}`}
                      >
                        {deletingCommentId === comment.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loadingComments && !error && totalPages > 1 && (
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
