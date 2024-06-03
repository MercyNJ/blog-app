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
	  <span className="logo-text">In Light of Eternity</span>
      </Link>
      <nav>
	  {username && (
		  <>
		    <Link to="/create">Create A new Post</Link>
		    <a onClick={logout}>Logout ({username})</a>
		  </>
	  )}
	  {!username && (
		  <>
		    <Link to="/login">Login</Link>
		    <Link to="/register">Register</Link>
		  </>
	  )}
      </nav>
    </header>
  );
}
