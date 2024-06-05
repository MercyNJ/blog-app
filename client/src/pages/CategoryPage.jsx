import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CategorySubheader from '../CategorySubheader';
import Post from '../Post';

export default function CategoryPage() {
  const { category } = useParams();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetchPosts(category);
  }, [category]);

  const fetchPosts = async (category) => {
    try {
      const response = await fetch(`http://localhost:3000/category/${category}`);
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  return (
    <main>
      <h1>{category.replace('-', ' ')}</h1>
      <CategorySubheader setCategory={fetchPosts} />
      <div className="posts">
        {posts.map(post => (
          <Post key={post._id} {...post} />
        ))}
      </div>
    </main>
  );
}
