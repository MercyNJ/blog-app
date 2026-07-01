import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Post from '../Post';
import PostSkeleton from '../PostSkeleton';

const SKELETON_COUNT = 5;

export default function CategoryPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { category } = useParams();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPosts(category);
  }, [category]);

  const fetchPosts = async (category) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/category/${category}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || 'Unable to load posts.'
        );
      }

      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
      setError(error.message || 'Unable to load posts.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1 className="category-heading">
        {category.replace('-', ' ')}
      </h1>

      {loading && (
        <div className="category-posts">
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <PostSkeleton key={index} />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="info-paragraph">{error}</p>
      )}

      {!loading && !error && posts.length === 0 && (
        <p className="info-paragraph">
          No posts found in this category.
        </p>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="category-posts">
          {posts.map(post => (
            <Post key={post.id} {...post} />
          ))}
        </div>
      )}
    </main>
  );
}