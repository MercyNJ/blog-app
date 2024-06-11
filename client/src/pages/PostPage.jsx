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

  const fetchPost = () => {
    fetch(`http://localhost:3000/post/${id}`)
      .then(response => response.json())
      .then(postInfo => {
        console.log("postInfo:", postInfo);
        setPostInfo(postInfo);
      })
      .catch(error => console.error('Error fetching post:', error));
  };

  const fetchComments = () => {
    fetch(`http://localhost:3000/comments/${id}`)
      .then(response => response.json())
      .then(comments => setComments(comments))
      .catch(error => console.error('Error fetching comments:', error));
  };

  const handleDelete = async () => {
    const response = await fetch(`http://localhost:3000/post/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      navigate('/');
    } else {
      console.error('Failed to delete the post');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(`http://localhost:3000/comment/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        const updatedComments = comments.filter(comment => comment._id !== commentId);
        setComments(updatedComments);
      } else {
        console.error('Failed to delete the comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleCommentSubmit = async (content) => {
    try {
      const response = await fetch('http://localhost:3000/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userInfo.token}`
        },
        body: JSON.stringify({
          postId: id,
          author: userInfo.id,
          content: content
        })
      });

      if (response.ok) {
        await fetchComments();
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
      const response = await fetch(`http://localhost:3000/comment/${comment._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userInfo.token}`
        },
        body: JSON.stringify({
          content: editedCommentContent
        })
      });
      if (response.ok) {
        const updatedComments = comments.map(c => {
          if (c._id === comment._id) {
            return {
              ...c,
              content: editedCommentContent
            };
          }
          return c;
        });
        setComments(updatedComments);
        setEditingCommentId(null);
        setEditedCommentContent('');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  return (
    <div className="post-page">
      <h2 className="post-page-h">{postInfo?.title}</h2>
      <time>{postInfo?.createdAt ? formatISO9075(new Date(postInfo.createdAt)) : ''}</time>
      <div className="author">by @{postInfo?.author?.username}</div>
      {userInfo.id === postInfo?.author?._id && (
        <div className="edit-row">
          <Link className="edit-btn" to={`/edit/${postInfo?._id}`}>
            Edit this post
          </Link>
          <button onClick={handleDelete} className="delete-btn">
            Delete this post
          </button>
        </div>
      )}
      <div className="image">
        <img src={`http://localhost:3000/${postInfo?.cover}`} alt="" style={{ borderRadius: '15px' }}/>
      </div>
      <div className="post-content" dangerouslySetInnerHTML={{__html:postInfo?.content}} />

      {userInfo.id ? (
        <div className="comment-section">
          <h2>Leave a Comment</h2>
          <textarea
            rows="4"
            placeholder="Write your comment here..."
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
          />
          <button onClick={() => handleCommentSubmit(commentContent)}>Submit</button>
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
          <div key={comment._id} className="comment">
            <div className="post-author">by @{comment.author.username}</div>
            {editingCommentId === comment._id ? (
              <div className="post-text-area">
                <textarea value={editedCommentContent} onChange={(e) => setEditedCommentContent(e.target.value)} />
                <button onClick={() => handleEditComment(comment)}>Save</button>
              </div>
            ) : (
              <div className="content">{comment.content}</div>
            )}
            {userInfo.id === postInfo.author._id && (
              <div className="comment-buttons">
                {editingCommentId !== comment._id && (
                  <button onClick={() => {setEditingCommentId(comment._id); setEditedCommentContent(comment.content)}}>Edit</button>
                )}
                <button onClick={() => handleDeleteComment(comment._id)}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
