import { useState } from "react";
import { Navigate } from "react-router-dom";

export default function RegisterPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirect, setRedirect] = useState(false);

  async function register(ev) {
    ev.preventDefault();

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (!confirmPassword) {
      setError('Please confirm your password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);

      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
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
          'Registration failed.'
        );
      }

      setRedirect(true);

    } catch (error) {
      console.error('Registration error:', error);

      setError(
        error.message ||
        'Unable to register.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (redirect) {
    return <Navigate to="/login" />;
  }

  return (
    <form
      className="register"
      onSubmit={register}
    >
      <h1>Register</h1>

      <label htmlFor="register-username" className="sr-only">
        Username
      </label>
      <input
        id="register-username"
        type="text"
        placeholder="Username"
        required
        value={username}
        onChange={ev => {
          setUsername(ev.target.value);
          setError('');
        }}
      />

      <label htmlFor="register-email" className="sr-only">
        Email
      </label>
      <input
        id="register-email"
        type="email"
        placeholder="Email"
        required
        value={email}
        onChange={ev => {
          setEmail(ev.target.value);
          setError('');
        }}
      />

      <label htmlFor="register-password" className="sr-only">
        Password
      </label>
      <input
        id="register-password"
        type="password"
        placeholder="Password"
        required
        minLength={8}
        value={password}
        onChange={ev => {
          setPassword(ev.target.value);
          setError('');
        }}
      />

      <label htmlFor="register-confirm-password" className="sr-only">
        Confirm Password
      </label>
      <input
        id="register-confirm-password"
        type="password"
        placeholder="Confirm Password"
        required
        minLength={8}
        value={confirmPassword}
        onChange={ev => {
          setConfirmPassword(ev.target.value);
          setError('');
        }}
      />

      <p className="password-help">
        Password must contain at least 8 characters,
        one uppercase letter, one lowercase letter,
        one number, and one special character.
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
        {isSubmitting ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
