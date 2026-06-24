import {UserContext} from "./UserContext";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer>
      <h5>&copy; {currentYear} In Light of Eternity</h5>
      <h5>Created and maintained by the author of In Light of Eternity.</h5>
    </footer>
  );
}
