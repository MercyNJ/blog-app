import {useContext, useEffect, useState} from "react";
import {useParams, useNavigate} from "react-router-dom";
import {formatISO9075} from "date-fns";
import {UserContext} from "../UserContext";
import {Link} from 'react-router-dom';

export default function PostPage() {
  const [postInfo,setPostInfo] = useState(null);
  const {userInfo} = useContext(UserContext);
  const {id} = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    fetch(`http://localhost:3000/post/${id}`)
      .then(response => {
        response.json().then(postInfo => {
          setPostInfo(postInfo);
        });
      });
  }, []);

  if (!postInfo) return '';

  // Function to handle the delete request
  const handleDelete = async () => {
    const response = await fetch(`http://localhost:3000/post/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      navigate('/'); // Redirect to the home page after deletion
    } else {
      console.error('Failed to delete the post');
    }
  };

  return (
    <div className="post-page">
      <h1>{postInfo.title}</h1>
      <time>{formatISO9075(new Date(postInfo.createdAt))}</time>
      <div className="author">by @{postInfo.author.username}</div>
      {userInfo.id === postInfo.author._id && (
        <div className="edit-row">
          <Link className="edit-btn" to={`/edit/${postInfo._id}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit this post
          </Link>

	  <button onClick={handleDelete} className="delete-btn">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 6L4.5 6M6 6v13.25A2.25 2.25 0 008.25 21.5h7.5A2.25 2.25 0 0018 19.25V6m-9 9v4m3-4v4m3-4v4m3-6V5.25A2.25 2.25 0 0014.75 3H9.25A2.25 2.25 0 007 5.25V6m6 0V3.75A.75.75 0 0012.75 3h-1.5a.75.75 0 00-.75.75V6m-3 0V5.25A.75.75 0 019 4.5h6a.75.75 0 01.75.75V6z" />
            </svg>
            Delete this post
          </button>

        </div>
      )}
      <div className="image">
        <img src={`http://localhost:3000/${postInfo.cover}`} alt=""/>
      </div>
      <div className="content" dangerouslySetInnerHTML={{__html:postInfo.content}} />
    </div>
  );
}
