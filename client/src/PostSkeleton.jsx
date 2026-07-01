export default function PostSkeleton() {
  return (
    <div className="post post-skeleton">
      <div className="image">
        <div className="skeleton skeleton-image" />
      </div>

      <div className="texts">
        <div className="skeleton skeleton-line skeleton-title" />
        <div className="skeleton skeleton-line skeleton-meta" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line skeleton-short" />
      </div>
    </div>
  );
}
