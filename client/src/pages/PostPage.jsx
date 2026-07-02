import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { formatISO9075 } from "date-fns";
import { FaBookOpen, FaCalendarAlt, FaUser } from "react-icons/fa";
import { UserContext } from "../UserContext";
import placeholderImage from '../assets/bannerimage.webp';

export default function PostPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [postInfo, setPostInfo] = useState(null);
  const [comments, setComments] = useState([]);

  const [commentContent, setCommentContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentContent, setEditedCommentContent] = useState('');

  const [loadingPost, setLoadingPost] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [error, setError] = useState('');

  const { userInfo } = useContext(UserContext);

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [id]);

  async function fetchPost() {
    try {
      setLoadingPost(true);

      const response = await fetch(`${API_URL}/post/${id}`);

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
          'Failed to load post.'
        );
      }

      setPostInfo(data);

    } catch (error) {
      console.error('Error fetching post:', error);

      setError(
        error.message ||
        'Unable to load post.'
      );
    } finally {
      setLoadingPost(false);
    }
  }

  async function fetchComments() {
    try {
      setLoadingComments(true);

      const response = await fetch(`${API_URL}/comments/${id}`);

      let data = [];

      try {
        data = await response.json();
      } catch {
        data = [];
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          'Failed to load comments.'
        );
      }

      setComments(data);

    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Are you sure you want to delete this post?'
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/post/${id}`, {
        method: 'DELETE',
        credentials: 'include',
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
          'Failed to delete post.'
        );
      }

      navigate('/');

    } catch (error) {
      console.error('Delete post error:', error);
      alert(error.message);
    }
  }

  async function handleCommentSubmit() {
    const content = commentContent.trim();

    if (!content) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/comment`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: id,
          content,
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
          'Failed to submit comment.'
        );
      }

      setCommentContent('');
      fetchComments();

    } catch (error) {
      console.error('Comment submit error:', error);
      alert(error.message);
    }
  }

  async function handleEditComment(comment) {
    const content = editedCommentContent.trim();

    if (!content) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/comment/${comment.id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
          }),
        }
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
          'Failed to edit comment.'
        );
      }

      setComments(
        comments.map(c =>
          c.id === comment.id
            ? { ...c, content }
            : c
        )
      );

      setEditingCommentId(null);
      setEditedCommentContent('');

    } catch (error) {
      console.error('Edit comment error:', error);
      alert(error.message);
    }
  }

  async function handleDeleteComment(commentId) {
    const confirmed = window.confirm(
      'Delete this comment?'
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/comment/${commentId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
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
          'Failed to delete comment.'
        );
      }

      setComments(
        comments.filter(
          comment => comment.id !== commentId
        )
      );

    } catch (error) {
      console.error('Delete comment error:', error);
      alert(error.message);
    }
  }

  if (loadingPost) {
    return <p>Loading post...</p>;
  }

  if (error) {
    return (
      <p className="error-message">
        {error}
      </p>
    );
  }

  return (
    <div className="post-page">
      {postInfo && (
        <>
          <h2 className="post-page-h">
            <FaBookOpen className="meta-icon" />
            {postInfo.title}
          </h2>

          <time>
            <FaCalendarAlt className="meta-icon" />
            {postInfo.createdAt
              ? formatISO9075(
                  new Date(postInfo.createdAt),
                  { representation: 'date' }
                )
              : ''}
          </time>

          <div className="author">
            <FaUser className="meta-icon" />
            by @{postInfo.author?.username}
          </div>

          {userInfo?.role === 'admin' && (
            <div className="edit-row">
              <Link
                className="edit-btn"
                to={`/edit/${postInfo.id}`}
              >
                Edit this post
              </Link>

              <button
                onClick={handleDelete}
                className="delete-btn"
              >
                Delete this post
              </button>
            </div>
          )}

          <div className="image">
            <img
              src={postInfo.cover ? `${API_URL}/${postInfo.cover}` : placeholderImage}
              alt={postInfo.title}
              style={{ borderRadius: '15px' }}
            />
          </div>

          <div
            className="post-content"
            dangerouslySetInnerHTML={{
              __html: postInfo.content,
            }}
          />
        </>
      )}

      {userInfo?.id ? (
        <div className="comment-section">
          <h2>Leave a Comment</h2>

          <textarea
            rows="4"
            placeholder="Write your comment here..."
            value={commentContent}
            onChange={(e) =>
              setCommentContent(e.target.value)
            }
          />

          <button
            onClick={handleCommentSubmit}
          >
            Submit
          </button>
        </div>
      ) : (
        <div className="comment-section">
          <h2>Leave a Reply</h2>

          <p>
            You must be{' '}
            <Link to="/login">
              <span className="logged-in-text">
                logged in
              </span>
            </Link>{' '}
            to post a comment.
          </p>
        </div>
      )}

      <div className="comments">
        <h2>Comments</h2>

        {loadingComments && (
          <p>Loading comments...</p>
        )}

        {!loadingComments &&
          comments.map(comment => (
            <div
              key={comment.id}
              className="comment"
            >
              <div className="post-author">
                by @{comment.author?.username}
              </div>

              {editingCommentId === comment.id ? (
                <div className="post-text-area">
                  <textarea
                    value={editedCommentContent}
                    onChange={(e) =>
                      setEditedCommentContent(
                        e.target.value
                      )
                    }
                  />

                  <button
                    onClick={() =>
                      handleEditComment(comment)
                    }
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="content">
                  {comment.content}
                </div>
              )}

              {(userInfo?.id === comment.author?.id ||
                userInfo?.role === 'admin') && (
                <div className="comment-buttons">
                  {editingCommentId !== comment.id && (
                    <button
                      onClick={() => {
                        setEditingCommentId(
                          comment.id
                        );
                        setEditedCommentContent(
                          comment.content
                        );
                      }}
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                  )}

                  <button
                    onClick={() =>
                      handleDeleteComment(
                        comment.id
                      )
                    }
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}