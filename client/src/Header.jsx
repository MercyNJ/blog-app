import { Link } from "react-router-dom";
import { useEffect, useContext } from "react";
import { UserContext } from "./UserContext";
import inLightOfEternityLogo from './assets/inlightofeternitylogo.png';

export default function Header() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { setUserInfo, userInfo } = useContext(UserContext);

  useEffect(() => {
    fetch(`${API_URL}/profile`, {
      credentials: 'include',
    })
      .then(response => {
        if (!response.ok) {
          return null;
        }
        return response.json();
      })
      .then(userInfo => {
        if (userInfo) {
          setUserInfo(userInfo);
        }
      })
      .catch(error => {
        console.error('Profile fetch error:', error);
      });
  }, [API_URL, setUserInfo]);

  function logout() {
    fetch(`${API_URL}/logout`, {
      credentials: 'include',
      method: 'POST',
    });

    setUserInfo(null);
  }

  const username = userInfo?.username;
  const role = userInfo?.role;

  return (
    <header>
      <Link to="/" className="logo">
        <img
          src={inLightOfEternityLogo}
          alt="In Light of Eternity Logo"
          className="imglogo"
        />
        <span className="logo-text">IN LIGHT OF ETERNITY</span>
      </Link>

      <nav className="nav-links">
        {username && (
          <>
            {role === 'admin' && (
              <Link to="/create">CREATE A NEW POST</Link>
            )}

            <a onClick={logout}>LOGOUT ({username})</a>
          </>
        )}

        {!username && (
          <>
            <Link to="/login">LOGIN</Link>
            <Link to="/register">REGISTER</Link>
          </>
        )}
      </nav>
    </header>
  );
}