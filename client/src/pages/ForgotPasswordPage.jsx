import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../utils/usePageMeta";

export default function ForgotPasswordPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  usePageMeta('Forgot Password');

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function requestReset(ev) {
    ev.preventDefault();

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    try {
      setError('');
      setNotice('');
      setIsSubmitting(true);

      const response = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
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
          'Unable to send a reset link.'
        );
      }

      setNotice(`${data.message} It may take a few minutes, so please check your spam folder too.`);

    } catch (error) {
      console.error('Forgot password error:', error);

      setError(
        error.message ||
        'Unable to send a reset link. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="login"
      onSubmit={requestReset}
    >
      <h1>Forgot Password</h1>

      <p className="password-help">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>

      <label htmlFor="forgot-email" className="sr-only">
        Email
      </label>
      <input
        id="forgot-email"
        type="email"
        placeholder="Email"
        autoComplete="email"
        value={email}
        onChange={ev => {
          setEmail(ev.target.value);
          setError('');
        }}
      />

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {notice && (
        <p className="notice-message">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </button>

      <p className="auth-link">
        <Link to="/login">Back to Login</Link>
      </p>
    </form>
  );
}
