import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Post from '../Post';
import PostSkeleton from '../PostSkeleton';

const SKELETON_COUNT = 5;

export default function CategoryPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { category } = useParams();
  const headingRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPosts(category, 1);
    headingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [category]);

  const fetchPosts = async (category, pageToFetch = 1) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_URL}/category/${category}?page=${pageToFetch}&limit=10`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load posts.');
      }

      setPosts(data.posts || []);
      setPage(data.page || pageToFetch);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
      setError(error.message || 'Unable to load posts.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    fetchPosts(category, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main>
      <h1 className="category-heading" ref={headingRef}>
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

      {!loading && !error && totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="pagination-button"
          >
            Previous
          </button>

          <span className="pagination-status">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}