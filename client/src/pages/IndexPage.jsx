/*
import Post from "../Post";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import myimg from '../assets/picS.png';

export default function IndexPage() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    fetch('http://localhost:3000/post').then(response => {
      response.json().then(posts => {
        setPosts(posts);
      });
    });
  }, []);
  return (
    <>
      <div className="about-me">
        <img src={myimg} alt="Mercy Njuguna" className="about-me-image" />
        <div className="about-me-text">
          <h2 className="about-me-heading">I'M MERCY NJUGUNA</h2>
          <p>
            I am a follower of Christ, a mom of two, a wife, and a software engineer.<br /><br />
            I created this space to encourage and inspire you on your journey to living a meaningful life in Christ.<br /><br /><br />
            Join me as we explore how to live with an eternal perspective.
          </p><br />
          <Link to="/about" className="read-more-button">READ MORE</Link>
        </div>
      </div>

      <div className="must-reads">MUST READS</div>
      {posts.length > 0 && posts.map(post => (
        <Post key={post.id} {...post} />
      ))}
    </>
  );
}
*/

import Post from "../Post";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import myimg from '../assets/picS.png';

export default function IndexPage() {
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all posts initially
  useEffect(() => {
    fetch('http://localhost:3000/post')
      .then(response => response.json())
      .then(posts => {
        setPosts(posts);
      });
  }, []);

  const handleSearch = () => {
    if (searchTerm.trim() === '') {
      return;
    }
    
    fetch(`http://localhost:3000/search?q=${encodeURIComponent(searchTerm)}`)
      .then(response => response.json())
      .then(posts => {
        setPosts(posts);
      })
      .catch(error => {
        console.error('Error fetching search results:', error);
      });
  };

  return (
    <>
      <div className="about-me">
        <img src={myimg} alt="Mercy Njuguna" className="about-me-image" />
        <div className="about-me-text">
          <h2 className="about-me-heading">I'M MERCY NJUGUNA</h2>
          <p>
            I am a follower of Christ, a mom of two, a wife, and a software engineer.<br /><br />
            I created this space to encourage and inspire you on your journey to living a meaningful life in Christ.<br /><br /><br />
            Join me as we explore how to live with an eternal perspective.
          </p><br />
          <Link to="/about" className="read-more-button">READ MORE</Link>
        </div>
      </div>

      {/* Search Input and Button */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button onClick={handleSearch} className="search-button">Search</button>
      </div>

      <div className="must-reads">MUST READS</div>
      {posts.length > 0 ? (
        posts.map(post => (
          <Post key={post.id} {...post} />
        ))
      ) : (
        <p>No posts found.</p>
      )}
    </>
  );
}
