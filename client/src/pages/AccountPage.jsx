import { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../UserContext";
import { NotificationContext } from "../NotificationContext";
import { usePageMeta } from "../utils/usePageMeta";
import { PASSWORD_REQUIREMENTS } from "../constants/passwordPolicy";

export default function AccountPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { userInfo, isLoadingUser } = useContext(UserContext);
  const { showNotification } = useContext(NotificationContext);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  usePageMeta('My Account');

  async function changePassword(ev) {
    ev.preventDefault();

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);

      const response = await fetch(`${API_URL}/account/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
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
          'Unable to change password.'
        );
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification('Password changed. Other devices have been logged out.');

    } catch (error) {
      console.error('Change password error:', error);

      setError(
        error.message ||
        'Unable to change password. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingUser) {
    return <p>Loading...</p>;
  }

  if (!userInfo) {
    return <Navigate to="/login" state={{ from: '/account' }} />;
  }

  return (
    <form
      className="login"
      onSubmit={changePassword}
    >
      <h1>My Account</h1>

      <p className="account-summary">
        Logged in as <strong>@{userInfo.username}</strong>
      </p>

      <h2 className="account-section-heading">Change password</h2>

      <label htmlFor="account-current-password" className="sr-only">
        Current password
      </label>
      <input
        id="account-current-password"
        type="password"
        placeholder="Current password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={ev => {
          setCurrentPassword(ev.target.value);
          setError('');
        }}
      />

      <label htmlFor="account-new-password" className="sr-only">
        New password
      </label>
      <input
        id="account-new-password"
        type="password"
        placeholder="New password"
        autoComplete="new-password"
        value={newPassword}
        onChange={ev => {
          setNewPassword(ev.target.value);
          setError('');
        }}
      />

      <label htmlFor="account-confirm-password" className="sr-only">
        Confirm new password
      </label>
      <input
        id="account-confirm-password"
        type="password"
        placeholder="Confirm new password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={ev => {
          setConfirmPassword(ev.target.value);
          setError('');
        }}
      />

      <p className="password-help">
        {PASSWORD_REQUIREMENTS} Changing your password logs you out on other devices.
      </p>

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}
