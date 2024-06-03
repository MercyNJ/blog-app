import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Post from '../Post';

export default function CategoryPage() {
  const { category } = useParams();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:3000/category/${category}`)
      .then(response => response.json())
      .then(data => setPosts(data));
  }, [category]);

  return (
    <main>
      <h1>{category.replace('-', ' ')}</h1>
      <div className="posts">
        {posts.map(post => (
          <Post key={post._id} post={post} />
        ))}
      </div>
    </main>
  );
}

