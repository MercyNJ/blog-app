import { Link } from "react-router-dom";
import { usePageMeta } from "../utils/usePageMeta";

export default function NotFoundPage() {
  usePageMeta('Page not found');

  return (
    <div className="not-found-page">
      <h1>Page not found</h1>
      <p>Sorry, the page you&apos;re looking for doesn&apos;t exist or may have been moved.</p>
      <Link to="/" className="back-to-home">Back to Home</Link>
    </div>
  );
}
