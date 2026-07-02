import { formatISO9075 } from "date-fns";
import { Link } from "react-router-dom";
import { FaUser, FaCalendarAlt, FaTag, FaClock } from "react-icons/fa";
import { CATEGORIES } from "./constants/categories";
import { getReadingTime } from "./utils/readingTime";
import placeholderImage from './assets/bannerimage.webp';

export default function Post({
  id,
  title,
  summary,
  cover,
  category,
  content,
  createdAt,
  author,
}) {
  const API_URL = import.meta.env.VITE_API_URL;

  return (
    <div className="post">
      <div className="image">
        <Link to={`/post/${id}`}>
          <img
            src={cover ? `${API_URL}/${cover}` : placeholderImage}
            alt={title}
            style={{ borderRadius: '10px' }}
          />
        </Link>
      </div>

      <div className="texts">
        <div className="title-container">
          <Link to={`/post/${id}`}>
            <h2>{title}</h2>
          </Link>
        </div>

        <div className="info-paragraph">
          <p className="info">
            <span className="author">
              <FaUser className="meta-icon" />
              {author?.username}
            </span>

            <time>
              <FaCalendarAlt className="meta-icon" />
              {formatISO9075(new Date(createdAt), { representation: 'date' })}
            </time>

            <span className="reading-time">
              <FaClock className="meta-icon" />
              {getReadingTime(content)} min read
            </span>

            {category && (
              <span className="category-tag">
                <FaTag className="meta-icon" />
                {CATEGORIES.find(c => c.value === category)?.label || category}
              </span>
            )}
          </p>
        </div>

        <p className="summary">{summary}</p>

        <div className="continue-reading">
          <Link
            to={`/post/${id}`}
            className="read-more-button"
          >
            CONTINUE READING
          </Link>
        </div>
      </div>
    </div>
  );
}