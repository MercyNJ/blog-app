import { useState, useContext } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../UserContext";

export default function LoginPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [redirect, setRedirect] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setUserInfo } = useContext(UserContext);

  async function login(ev) {
    ev.preventDefault();

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);

      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      let responseData = {};

      try {
        responseData = await response.json();
      } catch {
        responseData = {};
      }

      if (!response.ok) {
        throw new Error(
          responseData.error ||
          responseData.message ||
          'Invalid email or password.'
        );
      }

      setUserInfo(responseData);
      setRedirect(true);

    } catch (error) {
      console.error('Login error:', error);

      setError(
        error.message ||
        'Unable to log in. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (redirect) {
    return <Navigate to="/" />;
  }

  return (
    <form
      className="login"
      onSubmit={login}
    >
      <h1>Login</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={ev => setEmail(ev.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={ev => setPassword(ev.target.value)}
      />

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}