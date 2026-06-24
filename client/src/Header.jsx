import { Link } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "./UserContext";
import inLightOfEternityLogo from './assets/inlightofeternitylogo.png';

export default function Header() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { setUserInfo, userInfo } = useContext(UserContext);

  async function logout() {
    try {
      await fetch(`${API_URL}/logout`, {
        credentials: 'include',
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUserInfo(null);
    }
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

            <a onClick={logout}>
              LOGOUT ({username})
            </a>
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