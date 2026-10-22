import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <h1>Page not found</h1>
      <p>Sorry, the page you&apos;re looking for doesn&apos;t exist or may have been moved.</p>
      <Link to="/" className="back-to-home">Back to Home</Link>
    </div>
  );
}
