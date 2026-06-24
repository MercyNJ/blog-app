import 'react-quill/dist/quill.snow.css';
import { useState, useEffect, useContext } from "react";
import { Navigate, useParams } from "react-router-dom";
import Editor from "../Editor";
import { CATEGORIES } from "../constants/categories";
import { UserContext } from "../UserContext";

export default function EditPost() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { id } = useParams();
  const { userInfo, isLoadingUser } = useContext(UserContext);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState(null);
  const [category, setCategory] = useState('');

  const [redirect, setRedirect] = useState(false);
  const [loadingPost, setLoadingPost] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPost() {
      try {
        setLoadingPost(true);
        setError('');

        const response = await fetch(`${API_URL}/post/${id}`);

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
            'Failed to load post.'
          );
        }

        setTitle(responseData.title || '');
        setSummary(responseData.summary || '');
        setContent(responseData.content || '');
        setCategory(responseData.category || '');

      } catch (error) {
        console.error('Fetch post error:', error);

        setError(
          error.message ||
          'Unable to load post.'
        );
      } finally {
        setLoadingPost(false);
      }
    }

    fetchPost();
  }, [API_URL, id]);

  async function updatePost(ev) {
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

    try {
      setError('');
      setIsSubmitting(true);

      const data = new FormData();

      data.set('id', id);
      data.set('title', title);
      data.set('summary', summary);
      data.set('content', content);
      data.set('category', category);

      if (files?.[0]) {
        data.set('file', files[0]);
      }

      const response = await fetch(`${API_URL}/post`, {
        method: 'PUT',
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
          'Failed to update post.'
        );
      }

      setRedirect(true);

    } catch (error) {
      console.error('Update post error:', error);

      setError(
        error.message ||
        'Unable to update post. Please try again.'
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

  if (loadingPost) {
    return <p>Loading post...</p>;
  }

  if (error && !title) {
    return <p className="error-message">{error}</p>;
  }

  if (redirect) {
    return <Navigate to={`/post/${id}`} />;
  }

  return (
    <form onSubmit={updatePost}>
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
          className="update-post-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating...' : 'Update Post'}
        </button>
      </div>
    </form>
  );
}