import Logo from '/inlightofeternitylogo.png';
export default function Post() {
  return (
    <div className="post">
      <div className="image">
        <img src={Logo} />
      </div>
      <div className="texts">
        <h2>Wisdom to Number Our Days</h2>
        <p className="info">
          <a className="author">Mercy Njuguna</a>
          <time>2024-05-24 15:39</time>
        </p>
        <p className="summary">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Donec fermentum odio nec lectus faucibus, id rutrum elit ullamcorper.</p>
      </div>
    </div>
  );
}
