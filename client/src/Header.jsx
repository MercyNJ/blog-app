import {Link} from "react-router-dom";
import {useEffect, useState, useContext} from "react";
import {UserContext} from "./UserContext";
import inLightOfEternityLogo from './assets/inlightofeternitylogo.png';

export default function Header() {
	const {setUserInfo,userInfo} = useContext(UserContext);
	useEffect(() => {
		fetch('http://localhost:3000/profile', {
			credentials: 'include',
		}).then(response => {
			response.json().then(userInfo => {
				setUserInfo(userInfo);
			});
		});
	}, []);

        function logout() {
		fetch('http://localhost:3000/logout', {
			credentials: 'include',
			method: 'POST',
		});
		setUserInfo(null)
	}

	const username = userInfo?.username;

  return (
    <header>
      <Link to="/" className="logo">
          <img src={inLightOfEternityLogo} alt="In Light of Eternity Logo" className="imglogo" />
	  <span className="logo-text">IN LIGHT OF ETERNITY</span>
      </Link>
      <nav className="nav-links">
	  {username && (
		  <>
		    <Link to="/create">CREATE A NEW POST</Link>
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
