import React, { useEffect, useRef } from "react";
import { dateKey, monthLabel, moveMonth } from "./lib.js";

export function Icon({ name, size = 20, ...props }) {
  const paths = {
    arrow: (
      <>
        <path d="M4 12h15M13 6l6 6-6 6" />
      </>
    ),
    back: (
      <>
        <path d="M20 12H5M11 6l-6 6 6 6" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    check: <path d="m5 12 4 4L19 6" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    leaf: (
      <>
        <path d="M20 3C9 2 3 6 4 13c1 6 8 8 12 3 3-4 3-8 4-13Z" />
        <path d="M3 21 15 9" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H5v16h5M13 8l5 4-5 4M9 12h11" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    person: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.leaf}
    </svg>
  );
}
export function Brand() {
  return (
    <a className="brand" href="/" aria-label="Clinical Appointment Demo home">
      <span className="brand-symbol">
        <Icon name="leaf" size={23} />
      </span>
      <span>
        Clinical Appointment<span className="brand-sub">DEMO</span>
      </span>
    </a>
  );
}
export function ErrorMessage({ children }) {
  return children ? (
    <div className="error-message" role="alert">
      {children}
    </div>
  ) : null;
}
export function StepHeading({ title, children }) {
  const ref = useRef();
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [title]);
  return (
    <div className="step-heading">
      <h2 tabIndex="-1" ref={ref}>
        {title}
      </h2>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}
export function Calendar({
  month,
  onMonth,
  selected,
  onSelect,
  availableDates,
  loading,
  allowPast = false,
}) {
  const [y, m] = month.split("-").map(Number);
  const firstDay = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = dateKey(new Date());
  const minimumMonth = today.slice(0, 7);
  const maximumMonth = moveMonth(minimumMonth, 12);
  return (
    <div className="calendar">
      <div className="calendar-toolbar">
        <h3 aria-live="polite">{monthLabel(month)}</h3>
        <div className="month-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Previous month"
            disabled={loading || (!allowPast && month <= minimumMonth)}
            onClick={() => onMonth(moveMonth(month, -1))}
          >
            <Icon name="chevron" className="rotate" size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Next month"
            disabled={loading || month >= maximumMonth}
            onClick={() => onMonth(moveMonth(month, 1))}
          >
            <Icon name="chevron" size={17} />
          </button>
        </div>
      </div>
      <div className="calendar-grid" aria-label="Choose an appointment date">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
          <span
            className="weekday"
            key={`week${i}`}
            aria-label={
              [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ][i]
            }
          >
            {day}
          </span>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <span key={`empty${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, "0")}`;
          const available = availableDates ? availableDates.has(key) : true;
          const disabled = loading || !available || (!allowPast && key < today);
          return (
            <button
              type="button"
              key={key}
              className={`calendar-day ${selected === key ? "selected" : ""} ${key === today ? "today" : ""}`}
              disabled={disabled}
              aria-pressed={selected === key}
              aria-label={`${new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${!available ? ", no available appointments" : ""}`}
              onClick={() => onSelect(key)}
            >
              {i + 1}
              {available && !disabled && <span className="availability-dot" />}
            </button>
          );
        })}
      </div>
      <p className="calendar-legend">
        <span className="availability-dot" /> Available appointments
      </p>
    </div>
  );
}
export function ClinicArt({ clinic }) {
  return (
    <svg
      className={`clinic-art ${clinic}`}
      viewBox="0 0 170 180"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="83"
        cy="92"
        rx="65"
        ry="76"
        fill="currentColor"
        opacity=".09"
      />
      {clinic === "aesthetic" ? (
        <>
          <path
            d="M100 27c-35 0-54 25-50 54l-9 22 16 5c1 24 11 34 30 34v21M87 142c24-5 36-31 34-56-1-33-11-59-21-59Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M57 80c8-4 14-3 19 1M57 108l13 2-6 5M87 60c-1 20 8 35 23 42"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle
            cx="123"
            cy="41"
            r="14"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M123 33v16M115 41h16"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </>
      ) : (
        <>
          <path
            d="M80 160V92M80 122c-28 0-43-16-43-43 26 0 43 14 43 43ZM80 101c0-29 16-47 45-50 2 28-14 47-45 50ZM79 143c19 0 35-12 38-32-22-1-36 13-38 32Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="m79 122-29-28M80 101l32-34M80 142l24-18"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle
            cx="51"
            cy="43"
            r="9"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M115 154h19M124 145v18"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </>
      )}
    </svg>
  );
}
