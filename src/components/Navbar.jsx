import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Navbar() {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar__brand">
        <span className="navbar__brand-icon">◆</span>
        Trading Alerts
      </NavLink>

      <div className="navbar__right">
        <div className="navbar__links">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `navbar__link ${isActive ? "navbar__link--active" : ""}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/alerts"
            className={({ isActive }) =>
              `navbar__link ${isActive ? "navbar__link--active" : ""}`
            }
          >
            Alerts
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `navbar__link ${isActive ? "navbar__link--active" : ""}`
            }
          >
            Dashboard
          </NavLink>
        </div>

        {/* User profile */}
        <div className="navbar__user">
          <div className="navbar__avatar">{initials}</div>
          <div className="navbar__user-info">
            <span className="navbar__user-name">{user?.name || "User"}</span>
            <span className="navbar__user-email">{user?.email || ""}</span>
          </div>
          <button className="navbar__logout" onClick={logout} title="Sign out">
            ⏻
          </button>
        </div>
      </div>
    </nav>
  );
}
