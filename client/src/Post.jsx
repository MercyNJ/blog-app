import {formatISO9075} from "date-fns";
import {Link} from "react-router-dom";

/*
export default function Post({_id,title,summary,resizedCover,content,createdAt,author}) {

  return (
    <div className="post">
      <div className="image">
        <Link to={`/post/${_id}`}>
          <img src={'http://localhost:3000/'+resizedCover} alt="" style={{ borderRadius: '15px' }}/>
        </Link>
      </div>
      <div className="texts">
        <Link to={`/post/${_id}`}>
        <h2>{title}</h2>
        </Link>
        <p className="info">
          <a className="author">{author?.username}</a>
          <time>{formatISO9075(new Date(createdAt))}</time>
        </p>
        <p className="summary">{summary}</p>
	<Link to={`/post/${_id}`} className="continue-reading">
          CONTINUE READING
        </Link>
      </div>
    </div>
  );
}
*/

export default function Post({id, title, summary, resizedCover, content, createdAt, author}) {
    return (
        <div className="post">
            <div className="image">
                <Link to={`/post/${id}`}>
                    <img src={'http://localhost:3000/' + resizedCover} alt="" style={{ borderRadius: '10px' }} />
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
                        <a className="author">{author?.username}</a>
                        <time>{formatISO9075(new Date(createdAt))}</time>
                    </p>
	        </div>
                <p className="summary">{summary}</p>
	        <div className="continue-reading">
                    <Link to={`/post/${id}`} className="read-more-button">
                        CONTINUE READING
                    </Link>
	        </div>
            </div>
        </div>
    );
}
