import { useContext, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { NotificationContext } from "../NotificationContext";
import { usePageMeta } from "../utils/usePageMeta";
import { PASSWORD_REQUIREMENTS } from "../constants/passwordPolicy";

export default function ResetPasswordPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { showNotification } = useContext(NotificationContext);

  usePageMeta('Reset Password');

  // The token sits after "#" in the emailed link, which is never sent to the server.
  const [token] = useState(() => window.location.hash.slice(1));

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirect, setRedirect] = useState(false);

  // Keep the token out of the address bar and browser history once it has been read.
  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);

  async function submitNewPassword(ev) {
    ev.preventDefault();

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);

      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
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
          'Unable to reset your password.'
        );
      }

      showNotification('Password changed. Please log in. Other devices have been logged out.');
      setRedirect(true);

    } catch (error) {
      console.error('Reset password error:', error);

      setError(
        error.message ||
        'Unable to reset your password. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (redirect) {
    return <Navigate to="/login" />;
  }

  if (!token) {
    return (
      <div className="not-found-page">
        <h1>Reset Password</h1>
        <p>This reset link is incomplete. Please open the full link from your email, or request a new one.</p>
        <Link to="/forgot-password" className="back-to-home">Request a new link</Link>
      </div>
    );
  }

  return (
    <form
      className="login"
      onSubmit={submitNewPassword}
    >
      <h1>Reset Password</h1>

      <label htmlFor="reset-new-password" className="sr-only">
        New password
      </label>
      <input
        id="reset-new-password"
        type="password"
        placeholder="New password"
        autoComplete="new-password"
        value={newPassword}
        onChange={ev => {
          setNewPassword(ev.target.value);
          setError('');
        }}
      />

      <label htmlFor="reset-confirm-password" className="sr-only">
        Confirm new password
      </label>
      <input
        id="reset-confirm-password"
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
        {PASSWORD_REQUIREMENTS} Resetting your password logs you out on every device.
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
        {isSubmitting ? 'Saving…' : 'Reset password'}
      </button>

      <p className="auth-link">
        <Link to="/forgot-password">Request a new link</Link>
      </p>
    </form>
  );
}
