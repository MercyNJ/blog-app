import { useContext, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { formatISO9075 } from "date-fns";
import { UserContext } from "../UserContext";
import { NotificationContext } from "../NotificationContext";
import { usePageMeta } from "../utils/usePageMeta";
import { scrollToElement } from "../utils/scrollToElement";
import AdminNav from "../AdminNav";

const USERS_PER_PAGE = 20;

const countOf = (count, noun) => `${count} ${noun}${Number(count) === 1 ? '' : 's'}`;

export default function ManageUsersPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { userInfo, isLoadingUser } = useContext(UserContext);
  const { showNotification } = useContext(NotificationContext);
  const headingRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [actionError, setActionError] = useState(null);

  usePageMeta('Manage Users');

  const isAdmin = userInfo?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchUsers(1);
    }
    // Load once the user is known to be an admin; later loads come from paging and actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function fetchUsers(pageToFetch = 1, search = activeSearch) {
    try {
      setLoadingUsers(true);
      setError('');
      setActiveSearch(search);

      const searchQuery = search ? `&q=${encodeURIComponent(search)}` : '';

      const response = await fetch(
        `${API_URL}/admin/users?page=${pageToFetch}&limit=${USERS_PER_PAGE}${searchQuery}`,
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
          'Failed to load users.'
        );
      }

      setUsers(data.users || []);
      setPage(data.page || pageToFetch);
      setTotalPages(data.totalPages || 1);

    } catch (error) {
      console.error('Fetch users error:', error);

      setError(
        error.message ||
        'Unable to load users.'
      );
    } finally {
      setLoadingUsers(false);
    }
  }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    fetchUsers(newPage);
    scrollToElement(headingRef.current);
  }

  function handleSearch(ev) {
    ev.preventDefault();
    fetchUsers(1, searchTerm.trim());
  }

  function showAllUsers() {
    setSearchTerm('');
    fetchUsers(1, '');
  }

  // Shared by both row actions: same in-progress state, inline error and reload.
  async function runUserAction(user, request, fallbackError, successMessage) {
    setUpdatingUserId(user.id);
    setActionError(null);

    try {
      const response = await request();

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
          fallbackError
        );
      }

      showNotification(successMessage);

      // Reload so pagination stays correct; step back if this page is now empty.
      const pageToReload = users.length === 1 && page > 1 ? page - 1 : page;
      fetchUsers(pageToReload);

    } catch (error) {
      console.error('User action error:', error);
      setActionError({ userId: user.id, message: error.message });
    } finally {
      setUpdatingUserId(null);
    }
  }

  function handleMakeAdmin(user) {
    const confirmed = window.confirm(
      `Make @${user.username} an admin?\n\n` +
      '• They will be able to change all posts, comments and users.\n' +
      '• They will also be able to remove other admins.\n' +
      '• Another admin can remove this access later.'
    );

    if (!confirmed) {
      return;
    }

    changeRole(user, 'admin', `@${user.username} is now an admin.`);
  }

  function handleRemoveAdmin(user) {
    const confirmed = window.confirm(
      `Remove admin access from @${user.username}?\n\n` +
      '• They will become a normal user straight away.\n' +
      '• They will lose the admin pages and can no longer manage posts or users.\n' +
      '• Their posts and comments stay.\n' +
      '• An admin can give this access back later.'
    );

    if (!confirmed) {
      return;
    }

    changeRole(user, 'user', `@${user.username} is now a normal user.`);
  }

  function changeRole(user, role, successMessage) {
    runUserAction(
      user,
      () => fetch(`${API_URL}/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role }),
      }),
      'Failed to update user.',
      successMessage
    );
  }

  function handleDelete(user) {
    const postNote = Number(user.postCount) > 0
      ? `• Their ${countOf(user.postCount, 'post')} will stay, shown as by "Deleted user".\n`
      : '';

    const confirmed = window.confirm(
      `Delete @${user.username} permanently?\n\n` +
      `• Their account and ${countOf(user.commentCount, 'comment')} will be deleted.\n` +
      postNote +
      '• They will be logged out straight away.\n' +
      '• Their name will show as "Deleted user" in Activity.\n' +
      '• This cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    runUserAction(
      user,
      () => fetch(`${API_URL}/admin/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
      }),
      'Failed to delete user.',
      'User deleted.'
    );
  }

  if (isLoadingUser) {
    return <p>Loading...</p>;
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="manage-users">
      <AdminNav />

      <h1 className="category-heading" ref={headingRef}>
        Manage Users
      </h1>

      <div className="admin-toolbar">
        <form className="admin-search" onSubmit={handleSearch}>
          <label htmlFor="manage-users-search" className="sr-only">
            Search users
          </label>
          <input
            id="manage-users-search"
            type="text"
            placeholder="Search usernames or emails..."
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
      </div>

      {loadingUsers && <p>Loading users...</p>}

      {!loadingUsers && error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {!loadingUsers && !error && users.length === 0 && (
        <p className="info-paragraph">
          {activeSearch ? 'No users match your search.' : 'No users yet.'}
        </p>
      )}

      {!loadingUsers && activeSearch && (
        <button
          type="button"
          className="show-all-button"
          onClick={showAllUsers}
        >
          Show all users
        </button>
      )}

      {!loadingUsers && !error && users.length > 0 && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Comments</th>
                <th scope="col">Joined</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    @{user.username}

                    {actionError?.userId === user.id && (
                      <p className="error-message">
                        {actionError.message}
                      </p>
                    )}
                  </td>

                  <td>{user.email}</td>

                  <td>{user.role === 'admin' ? 'Admin' : 'User'}</td>

                  <td>{user.commentCount}</td>

                  <td>
                    <time>
                      {formatISO9075(new Date(user.createdAt), { representation: 'date' })}
                    </time>
                  </td>

                  <td>
                    {user.id === userInfo.id && 'This is you'}

                    {user.id !== userInfo.id && user.role === 'admin' && (
                      <>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-button"
                            onClick={() => handleRemoveAdmin(user)}
                            disabled={updatingUserId === user.id}
                            aria-label={`Remove admin access from @${user.username}`}
                          >
                            Remove admin
                          </button>
                        </div>

                        <p className="admin-row-note">
                          Remove admin access before deleting this account.
                        </p>
                      </>
                    )}

                    {user.role !== 'admin' && (
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-button"
                          onClick={() => handleMakeAdmin(user)}
                          disabled={updatingUserId === user.id}
                          aria-label={`Make @${user.username} an admin`}
                        >
                          Make admin
                        </button>

                        <button
                          type="button"
                          className="admin-button"
                          onClick={() => handleDelete(user)}
                          disabled={updatingUserId === user.id}
                          aria-label={`Delete @${user.username}`}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loadingUsers && !error && totalPages > 1 && (
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
