import { NavLink } from "react-router-dom";

// Switch between the admin pages; NavLink marks the current one with the "active" class.
export default function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Admin pages">
      <NavLink to="/admin/posts">Posts</NavLink>
      <NavLink to="/admin/comments">Comments</NavLink>
      <NavLink to="/admin/users">Users</NavLink>
      <NavLink to="/admin/activity">Activity</NavLink>
    </nav>
  );
}
