import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { formatISO9075 } from "date-fns";
import { UserContext } from "../UserContext";

export default function PostPage() {
  const [postInfo, setPostInfo] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentContent, setEditedCommentContent] = useState('');
  const { userInfo } = useContext(UserContext);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, []);

  const fetchPost = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BASE_URL}/post/${id}`);
      const data = await response.json();
      setPostInfo(data);
    } catch (error) {
      console.error('Error fetching post:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BASE_URL}/comments/${id}`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BASE_URL}/post/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        navigate('/');
      } else {
        console.error('Failed to delete the post');
      }
    } catch (error) {
      console.error('Error deleting the post:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BASE_URL}/comment/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setComments(comments.filter(comment => comment.id !== commentId));
      } else {
        console.error('Failed to delete the comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleCommentSubmit = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BASE_URL}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userInfo.token}`
        },
        body: JSON.stringify({
          postId: id,
          authorId: userInfo.id,
          content: commentContent
        })
      });

      if (response.ok) {
        fetchComments();
        setCommentContent('');
      } else {
        const errorData = await response.json();
        console.error('Failed to submit comment:', errorData.message || errorData);
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    }
  };

  const handleEditComment = async (comment) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BASE_URL}/comment/${comment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userInfo.token}`
        },
        body: JSON.stringify({ content: editedCommentContent })
      });

      if (response.ok) {
        setComments(comments.map(c => (c.id === comment.id ? { ...c, content: editedCommentContent } : c)));
        setEditingCommentId(null);
        setEditedCommentContent('');
      } else {
        console.error('Failed to edit the comment');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  return (
    <div className="post-page">
      {postInfo && (
        <>
          <h2 className="post-page-h">{postInfo.title}</h2>
          <time>{postInfo.createdAt ? formatISO9075(new Date(postInfo.createdAt)) : ''}</time>
          <div className="author">by @{postInfo.author.username}</div>
	  {userInfo?.id === postInfo.authorId && userInfo?.id && (
            <div className="edit-row">
              <Link className="edit-btn" to={`/edit/${postInfo.id}`}>Edit this post</Link>
              <button onClick={handleDelete} className="delete-btn">Delete this post</button>
            </div>
          )}
          <div className="image">
	    <img src={`${process.env.REACT_APP_BASE_URL}/${postInfo.cover}`} alt="" style={{ borderRadius: '15px' }}/>
          </div>
          <div className="post-content" dangerouslySetInnerHTML={{__html: postInfo.content}} />
        </>
      )}

      {userInfo?.id ? (
        <div className="comment-section">
          <h2>Leave a Comment</h2>
          <textarea
            rows="4"
            placeholder="Write your comment here..."
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
          />
          <button onClick={handleCommentSubmit}>Submit</button>
        </div>
      ) : (
        <div className="comment-section">
          <h2>Leave a Reply</h2>
          <p>You must be <Link to="/login"><span className="logged-in-text">logged in</span></Link> to post a comment.</p>
        </div>
      )}

      <div className="comments">
        <h2>Comments</h2>
        {comments.map(comment => (
          <div key={comment.id} className="comment">
            <div className="post-author">by @{comment.author.username}</div>
            {editingCommentId === comment.id ? (
              <div className="post-text-area">
                <textarea value={editedCommentContent} onChange={(e) => setEditedCommentContent(e.target.value)} />
                <button onClick={() => handleEditComment(comment)}>Save</button>
              </div>
            ) : (
              <div className="content">{comment.content}</div>
            )}
            {(userInfo?.id === comment.authorId || userInfo?.id === postInfo.authorId) && (
              <div className="comment-buttons">
                {editingCommentId !== comment.id && (
                  <button onClick={() => { setEditingCommentId(comment.id); setEditedCommentContent(comment.content); }}>
                    <i className="fas fa-edit"></i>
                  </button>
                )}
                <button onClick={() => handleDeleteComment(comment.id)}><i className="fas fa-trash-alt"></i></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

