import React, { useEffect, useState } from "react";
import { api, BRAND } from "./lib.js";
import { Brand } from "./components.jsx";
import Booking from "./Booking.jsx";
import Admin from "./Admin.jsx";

export default function App() {
  const admin = window.location.pathname.startsWith("/admin");
  const [config, setConfig] = useState(null);
  useEffect(() => {
    api("config")
      .then(setConfig)
      .catch(() => setConfig({ demo: false }));
    document.title = `${BRAND} · ${admin ? "Clinic management" : "Appointments"}`;
  }, [admin]);
  return (
    <>
      <header className="site-header">
        <Brand />
        <div className="header-right">
          <span className="header-note">Care begins with a little time.</span>
          <a href={admin ? "/" : "/admin"} className="text-link">
            {admin ? "Book an appointment" : "Clinic team"}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      {config?.demo && (
        <div className="demo-banner">
          <span className="demo-dot" />
          <strong>Local demo</strong>
          <span>
            Appointments are saved on this computer. No clinic is contacted.
          </span>
        </div>
      )}
      {admin ? <Admin config={config} /> : <Booking config={config} />}
      <footer className="site-footer">
        <span>
          © {new Date().getFullYear()} {BRAND}
        </span>
        <span>Considered care. Simply booked.</span>
        <span>Appointments in Pakistan time · UTC+5</span>
      </footer>
    </>
  );
}
