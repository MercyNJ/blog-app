import { useContext, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { formatISO9075 } from "date-fns";
import { UserContext } from "../UserContext";
import { usePageMeta } from "../utils/usePageMeta";
import { scrollToElement } from "../utils/scrollToElement";
import AdminNav from "../AdminNav";

const ENTRIES_PER_PAGE = 20;

const ACTION_LABELS = {
  'post.create': 'Created post',
  'post.update': 'Edited post',
  'post.delete': 'Deleted post',
  'comment.update': "Edited someone's comment",
  'comment.delete': "Deleted someone's comment",
};

// Read-only view of the admin audit log; entries cannot be changed from the site.
export default function ActivityPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { userInfo, isLoadingUser } = useContext(UserContext);
  const headingRef = useRef(null);

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  usePageMeta('Activity');

  const isAdmin = userInfo?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchEntries(1);
    }
    // Load once the user is known to be an admin; later loads come from paging.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function fetchEntries(pageToFetch = 1) {
    try {
      setLoadingEntries(true);
      setError('');

      const response = await fetch(
        `${API_URL}/admin/activity?page=${pageToFetch}&limit=${ENTRIES_PER_PAGE}`,
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
          'Failed to load activity.'
        );
      }

      setEntries(data.entries || []);
      setPage(data.page || pageToFetch);
      setTotalPages(data.totalPages || 1);

    } catch (error) {
      console.error('Fetch activity error:', error);

      setError(
        error.message ||
        'Unable to load activity.'
      );
    } finally {
      setLoadingEntries(false);
    }
  }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    fetchEntries(newPage);
    scrollToElement(headingRef.current);
  }

  if (isLoadingUser) {
    return <p>Loading...</p>;
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="admin-activity">
      <AdminNav />

      <h1 className="category-heading" ref={headingRef}>
        Activity
      </h1>

      <p className="admin-note">
        A record of admin changes to posts and other people&apos;s comments. Entries cannot be edited or deleted.
      </p>

      {loadingEntries && <p>Loading activity...</p>}

      {!loadingEntries && error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {!loadingEntries && !error && entries.length === 0 && (
        <p className="info-paragraph">No activity yet.</p>
      )}

      {!loadingEntries && !error && entries.length > 0 && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Admin</th>
                <th scope="col">Action</th>
                <th scope="col">Item</th>
              </tr>
            </thead>

            <tbody>
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td>
                    <time>{formatISO9075(new Date(entry.createdAt))}</time>
                  </td>
                  <td>@{entry.actorUsername}</td>
                  <td>{ACTION_LABELS[entry.action] || entry.action}</td>
                  <td className="admin-comment-text">
                    {entry.targetLabel || `${entry.targetType} #${entry.targetId}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loadingEntries && !error && totalPages > 1 && (
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
