import 'react-quill/dist/quill.snow.css';
import { useState, useContext } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Editor from "../Editor";
import { CATEGORIES } from "../constants/categories";
import { ACCEPTED_IMAGE_TYPES } from "../constants/images";
import { UserContext } from "../UserContext";
import { NotificationContext } from "../NotificationContext";
import { usePageMeta } from "../utils/usePageMeta";

export default function CreatePost() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { userInfo, isLoadingUser } = useContext(UserContext);
  const { showNotification } = useContext(NotificationContext);
  const navigate = useNavigate();

  usePageMeta('Create Post');

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState('');
  const [category, setCategory] = useState('');
  const [redirectTo, setRedirectTo] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createNewPost(ev) {
    ev.preventDefault();

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    if (!summary.trim()) {
      setError('Summary is required.');
      return;
    }

    if (!category) {
      setError('Please select a category.');
      return;
    }

    const cleanContent = content.replace(/<[^>]*>/g, '').trim();

    if (!cleanContent) {
      setError('Content is required.');
      return;
    }

    if (!files?.[0]) {
      setError('Please upload an image.');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);

      const data = new FormData();

      data.set('title', title);
      data.set('summary', summary);
      data.set('content', content);
      data.set('category', category);
      data.set('file', files[0]);

      const response = await fetch(`${API_URL}/post`, {
        method: 'POST',
        body: data,
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
          'Failed to create post.'
        );
      }

      showNotification('Post published.');

      // Open the new post so the admin sees it as readers will.
      setRedirectTo(responseData.id ? `/post/${responseData.id}` : '/');

    } catch (error) {
      console.error('Create post error:', error);

      setError(
        error.message ||
        'Unable to create post. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingUser) {
    return <p>Loading...</p>;
  }

  if (!userInfo || userInfo.role !== 'admin') {
    return <Navigate to="/" />;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} />;
  }

  return (
    <form onSubmit={createNewPost}>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={ev => setTitle(ev.target.value)}
      />

      <input
        type="text"
        placeholder="Summary"
        value={summary}
        onChange={ev => setSummary(ev.target.value)}
      />

      <input
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        onChange={ev => setFiles(ev.target.files)}
      />

      <select
        value={category}
        onChange={ev => setCategory(ev.target.value)}
      >
        <option value="">Select Category</option>

        {CATEGORIES.map(category => (
          <option
            key={category.value}
            value={category.value}
          >
            {category.label}
          </option>
        ))}
      </select>

      <Editor
        value={content}
        onChange={setContent}
      />

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      <div className="button-container">
        <button
          type="submit"
          className="create-post-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Post'}
        </button>

        <button
          type="button"
          className="cancel-post-button"
          onClick={() => navigate('/')}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}