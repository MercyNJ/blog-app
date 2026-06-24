import { useState } from "react";

export default function RegisterPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    try {
      setError('');
      setSuccess('');
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

      setSuccess(
        'Registration successful. You can now log in.'
      );

      setUsername('');
      setEmail('');
      setPassword('');

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

  return (
    <form
      className="register"
      onSubmit={register}
    >
      <h1>Register</h1>

      <input
        type="text"
        placeholder="Username"
        required
        value={username}
        onChange={ev => {
          setUsername(ev.target.value);
          setError('');
        }}
      />

      <input
        type="email"
        placeholder="Email"
        required
        value={email}
        onChange={ev => {
          setEmail(ev.target.value);
          setError('');
        }}
      />

      <input
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

      {success && (
        <p className="success-message">
          {success}
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