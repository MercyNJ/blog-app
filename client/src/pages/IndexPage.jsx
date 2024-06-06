import Post from "../Post";
import {useEffect, useState} from "react";
import { Link } from "react-router-dom";
import myimg from '../assets/picS.png';

export default function IndexPage() {
  const [posts,setPosts] = useState([]);
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
          <h2>I'm Mercy Njuguna</h2>
          <p>A follower of Christ, Mom of 2, Wife & Software Engineer.I created this space to encourage and spur you on your journey to living a life that is meaningful in Christ.Join me as we explore how we can live a life with an eternal perspective.</p>
          <Link to="/about" className="read-more-button">READ MORE</Link>
        </div>
      </div>

      <div className="must-reads">MUST READS</div>
      {posts.length > 0 && posts.map(post => (
        <Post {...post} />
      ))}
    </>
  );
}
