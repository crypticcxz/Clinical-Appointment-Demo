import React, { useEffect, useState } from "react";
import {
  api,
  CLINICS,
  currentMonth,
  dateKey,
  fullDate,
  json,
  monthLabel,
  moveMonth,
  shortDate,
  timeLabel,
} from "./lib.js";
import { ErrorMessage, Icon } from "./components.jsx";

const TIMES = Array.from(
  { length: 26 },
  (_, i) =>
    `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
);
export default function Admin({ config }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(currentMonth);
  const [clinic, setClinic] = useState("");
  const [tab, setTab] = useState("bookings");
  const [slots, setSlots] = useState([]);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [reschedule, setReschedule] = useState("");
  const [moveDate, setMoveDate] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addClinic, setAddClinic] = useState("aesthetic");
  const [addDate, setAddDate] = useState(dateKey(new Date()));
  const [addTimes, setAddTimes] = useState([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    api("admin/session")
      .then((data) => active && setSession(data))
      .catch((e) => {
        if (active && e.status !== 401) setError(e.message);
      })
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoading(true);
    setError("");
    api(`admin/slots?month=${month}${clinic ? `&clinic=${clinic}` : ""}`)
      .then((data) => {
        if (active) setSlots(data.slots);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setSlots([]);
          if (e.status === 401) setSession(null);
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [session, month, clinic, revision]);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("admin/login", json("POST", { email, password }));
      setSession(await api("admin/session"));
      setPassword("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function action(path, data, message, method = "POST") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, json(method, data));
      setRevision((r) => r + 1);
      setNotice(message);
      setCancelling(null);
      setReschedule("");
      return true;
    } catch (e) {
      setError(e.message);
      if (e.status === 401) setSession(null);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    const ok = await action("admin/logout", {}, "");
    if (ok) {
      setSession(null);
      setSlots([]);
      setNotice("");
    }
  }
  async function add(e) {
    e.preventDefault();
    const ok = await action(
      "admin/slots",
      { clinic: addClinic, date: addDate, times: addTimes },
      "Availability updated. Existing slots were kept.",
    );
    if (ok) {
      setShowAdd(false);
      setAddTimes([]);
      setMonth(addDate.slice(0, 7));
      setClinic(addClinic);
      setSelectedDay(addDate);
      setTab("availability");
    }
  }
  const bookings = slots
    .filter((s) => s.booking)
    .filter((s) =>
      `${s.booking.name} ${s.booking.email} ${s.booking.phone}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  const future = slots.filter((s) => new Date(s.startsAt) > new Date());
  const openCount = future.filter((s) => s.available).length;
  const bookedCount = slots.filter((s) => s.booking).length;
  const blockedCount = future.filter((s) => !s.enabled && !s.booking).length;
  const days = [...new Set(slots.map((s) => dateKey(s.startsAt)))];
  const activeDay =
    selectedDay && days.includes(selectedDay)
      ? selectedDay
      : days.find((d) => d >= dateKey(new Date())) || days[0];
  const daySlots = slots.filter((s) => dateKey(s.startsAt) === activeDay);
  if (checking)
    return (
      <main className="login-shell">
        <p className="muted" role="status">
          Checking your session…
        </p>
      </main>
    );
  if (!session)
    return (
      <main className="login-shell">
        <section className="login-intro">
          <h1>
            A clear view
            <br />
            of your <em>day.</em>
          </h1>
          <p>
            Manage your clinics, make room for appointments, and keep every
            booking in view.
          </p>
          <div className="login-art" aria-hidden="true">
            <Icon name="calendar" size={72} />
            <span>Care, well organized.</span>
          </div>
        </section>
        <section className="login-panel">
          <span className="login-lock">
            <Icon name="lock" size={24} />
          </span>
          <h2>Welcome to your workspace.</h2>
          <p className="muted">Sign in to manage appointments.</p>
          {config?.demo && (
            <div className="demo-login">
              <strong>Try the local admin demo</strong>
              <span>Email: login@admin.com</span>
              <span>Password: admin123</span>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setEmail("login@admin.com");
                  setPassword("admin123");
                }}
              >
                Fill demo credentials <Icon name="arrow" size={15} />
              </button>
            </div>
          )}
          <form onSubmit={login}>
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="username"
                name="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourclinic.com"
                maxLength={254}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={200}
                placeholder="Enter your password"
              />
            </label>
            <ErrorMessage>{error}</ErrorMessage>
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "Signing in…" : "Sign in"}
              <Icon name="arrow" size={17} />
            </button>
          </form>
          <p className="login-note">
            <Icon name="lock" size={13} /> Access is limited to the clinic
            administrator.
          </p>
        </section>
      </main>
    );
  return (
    <main className="admin-shell">
      <div className="admin-heading">
        <div>
          <h1>
            Your appointments, <em>in order.</em>
          </h1>
          <p className="muted">
            A clear view of your bookings and the space between them.
          </p>
        </div>
        <button className="secondary-button" onClick={logout} disabled={busy}>
          <Icon name="logout" size={17} /> Sign out
        </button>
      </div>
      <div className="admin-overview">
        <div>
          <span className="overview-label">Booked appointments</span>
          <strong>
            {bookedCount}
            <span>this month</span>
          </strong>
        </div>
        <div>
          <span className="overview-label">Available slots</span>
          <strong>
            {openCount}
            <span>upcoming</span>
          </strong>
        </div>
        <div>
          <span className="overview-label">Blocked slots</span>
          <strong>
            {blockedCount}
            <span>upcoming</span>
          </strong>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setShowAdd(!showAdd);
            setError("");
          }}
          aria-expanded={showAdd}
        >
          <Icon name={showAdd ? "close" : "plus"} size={18} />
          {showAdd ? "Close editor" : "Open new slots"}
        </button>
      </div>
      {showAdd && (
        <section className="slot-editor">
          <div className="slot-editor-header">
            <div>
              <h2>Open appointment slots.</h2>
              <p className="muted">
                Choose a day and the times you’d like to offer. Each visit is 30
                minutes.
              </p>
            </div>
          </div>
          <form onSubmit={add}>
            <div className="editor-fields">
              <label>
                Clinic
                <select
                  value={addClinic}
                  onChange={(e) => setAddClinic(e.target.value)}
                >
                  {Object.entries(CLINICS).map(([id, c]) => (
                    <option key={id} value={id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  required
                  min={dateKey(new Date())}
                  max={dateKey(new Date(Date.now() + 365 * 86400000))}
                  value={addDate}
                  onChange={(e) => {
                    setAddDate(e.target.value);
                    setAddTimes([]);
                  }}
                />
              </label>
              <div className="time-presets">
                <span className="input-label">Quick selection</span>
                <div>
                  <button
                    type="button"
                    className="secondary-button small"
                    onClick={() =>
                      setAddTimes(
                        TIMES.filter(
                          (t) =>
                            t >= "09:00" &&
                            t < "12:00" &&
                            new Date(`${addDate}T${t}:00+05:00`) > new Date(),
                        ),
                      )
                    }
                  >
                    Morning
                  </button>
                  <button
                    type="button"
                    className="secondary-button small"
                    onClick={() =>
                      setAddTimes(
                        TIMES.filter(
                          (t) =>
                            t >= "14:00" &&
                            t < "17:00" &&
                            new Date(`${addDate}T${t}:00+05:00`) > new Date(),
                        ),
                      )
                    }
                  >
                    Afternoon
                  </button>
                  <button
                    type="button"
                    className="text-button small"
                    onClick={() => setAddTimes([])}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
            <div
              className="editor-times"
              role="group"
              aria-label="Choose times to open"
            >
              {TIMES.map((time) => (
                <button
                  type="button"
                  key={time}
                  className={`time-slot ${addTimes.includes(time) ? "selected" : ""}`}
                  aria-pressed={addTimes.includes(time)}
                  disabled={
                    !addDate ||
                    new Date(`${addDate}T${time}:00+05:00`) <= new Date()
                  }
                  onClick={() =>
                    setAddTimes((prev) =>
                      prev.includes(time)
                        ? prev.filter((t) => t !== time)
                        : [...prev, time],
                    )
                  }
                >
                  {time}
                </button>
              ))}
            </div>
            <div className="editor-actions">
              <p className="muted">
                {addTimes.length} {addTimes.length === 1 ? "slot" : "slots"}{" "}
                selected · Pakistan time (UTC+5)
              </p>
              <button
                className="primary-button"
                disabled={busy || !addTimes.length}
                type="submit"
              >
                {busy ? "Saving…" : "Save availability"}
                <Icon name="check" size={17} />
              </button>
            </div>
          </form>
        </section>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      {error && (
        <button
          className="text-button"
          onClick={() => setRevision((n) => n + 1)}
        >
          Retry
        </button>
      )}
      {notice && (
        <p className="admin-notice" role="status">
          <Icon name="check" size={16} />
          {notice}
        </p>
      )}
      <section className="admin-content">
        <h2 className="sr-only">Appointment management</h2>
        <div className="admin-toolbar">
          <div
            className="admin-tabs"
            role="tablist"
            aria-label="Workspace view"
          >
            {["bookings", "availability"].map((t) => (
              <button
                type="button"
                key={t}
                role="tab"
                aria-selected={tab === t}
                aria-controls={`panel-${t}`}
                id={`tab-${t}`}
                tabIndex={tab === t ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    e.preventDefault();
                    const next = t === "bookings" ? "availability" : "bookings";
                    setTab(next);
                    document.getElementById(`tab-${next}`)?.focus();
                  }
                }}
                className={tab === t ? "active" : ""}
                onClick={() => {
                  setTab(t);
                  setError("");
                }}
              >
                {t === "bookings" ? "Bookings" : "Availability"}
              </button>
            ))}
          </div>
          <div className="admin-filters">
            <label className="sr-only" htmlFor="clinic-filter">
              Filter by clinic
            </label>
            <select
              id="clinic-filter"
              value={clinic}
              onChange={(e) => {
                setClinic(e.target.value);
                setSelectedDay("");
              }}
            >
              <option value="">Both clinics</option>
              {Object.entries(CLINICS).map(([id, c]) => (
                <option key={id} value={id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="admin-month">
              <button
                className="icon-button"
                aria-label="Previous month"
                disabled={loading || month <= "2020-01"}
                onClick={() => setMonth(moveMonth(month, -1))}
              >
                <Icon name="chevron" className="rotate" size={16} />
              </button>
              <span>{monthLabel(month)}</span>
              <button
                className="icon-button"
                aria-label="Next month"
                disabled={loading || month >= "2100-12"}
                onClick={() => setMonth(moveMonth(month, 1))}
              >
                <Icon name="chevron" size={16} />
              </button>
            </div>
            <button
              className="text-button small"
              disabled={loading}
              onClick={() => setRevision((n) => n + 1)}
            >
              Refresh
            </button>
          </div>
        </div>
        {tab === "bookings" ? (
          <div
            id="panel-bookings"
            role="tabpanel"
            aria-labelledby="tab-bookings"
            aria-busy={loading}
          >
            <div className="table-heading">
              <span>
                {loading
                  ? "Loading bookings…"
                  : `${bookings.length} ${bookings.length === 1 ? "appointment" : "appointments"}`}
              </span>
              <label className="sr-only" htmlFor="booking-search">
                Search customers by name, email or phone
              </label>
              <input
                id="booking-search"
                type="search"
                placeholder="Search customers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {!loading && !bookings.length ? (
              <div className="admin-empty">
                <Icon name="calendar" size={34} />
                <h3>
                  {search
                    ? "No matching customers."
                    : "A little room in the calendar."}
                </h3>
                <p>
                  {search
                    ? "Try another name, email, or phone number."
                    : "Bookings will appear here as customers reserve your available slots."}
                </p>
                {!search && (
                  <button
                    className="secondary-button"
                    onClick={() => setTab("availability")}
                  >
                    View availability <Icon name="arrow" size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="bookings-table">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Clinic</th>
                      <th>Appointment</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Manage</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((s) => (
                      <React.Fragment key={s.id}>
                        <tr>
                          <td>
                            <strong>{s.booking.name}</strong>
                            <span className="customer-email">
                              {s.booking.email}
                            </span>
                          </td>
                          <td>
                            <span className={`clinic-badge ${s.clinic}`}>
                              {CLINICS[s.clinic].short}
                            </span>
                          </td>
                          <td>
                            <strong>{shortDate(s.startsAt)}</strong>
                            <span className="customer-email">
                              {timeLabel(s.startsAt)} · 30 min
                            </span>
                          </td>
                          <td>
                            <span className="status-pill">
                              <span />
                              {new Date(s.startsAt) > new Date()
                                ? "Confirmed"
                                : "Past visit"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="text-button small"
                              aria-expanded={expanded === s.id}
                              aria-label={`Manage booking for ${s.booking.name}`}
                              onClick={() => {
                                setExpanded(expanded === s.id ? null : s.id);
                                setCancelling(null);
                                setReschedule("");
                                setMoveDate("");
                              }}
                            >
                              Manage <Icon name="chevron" size={14} />
                            </button>
                          </td>
                        </tr>
                        {expanded === s.id && (
                          <tr className="booking-detail-row">
                            <td colSpan={5}>
                              <div className="booking-detail">
                                <div>
                                  <span className="eyebrow">
                                    CONTACT DETAILS
                                  </span>
                                  <p>
                                    <a href={`mailto:${s.booking.email}`}>
                                      {s.booking.email}
                                    </a>
                                    <br />
                                    <a
                                      href={`tel:${s.booking.phone.replace(/[^+\d]/g, "")}`}
                                    >
                                      {s.booking.phone}
                                    </a>
                                  </p>
                                  <span className="muted small">
                                    Reference:{" "}
                                    {s.booking.id.slice(0, 8).toUpperCase()}
                                  </span>
                                </div>
                                <div className="reschedule-control">
                                  <label>
                                    New appointment date
                                    <select
                                      value={moveDate}
                                      onChange={(e) => {
                                        setMoveDate(e.target.value);
                                        setReschedule("");
                                      }}
                                    >
                                      <option value="">Choose a date</option>
                                      {[
                                        ...new Set(
                                          slots
                                            .filter(
                                              (next) =>
                                                next.clinic === s.clinic &&
                                                next.available,
                                            )
                                            .map((next) =>
                                              dateKey(next.startsAt),
                                            ),
                                        ),
                                      ].map((day) => (
                                        <option key={day} value={day}>
                                          {fullDate(`${day}T12:00:00Z`)}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label>
                                    New appointment time
                                    <select
                                      aria-label={`New appointment time for ${s.booking.name}`}
                                      value={reschedule}
                                      disabled={!moveDate}
                                      onChange={(e) =>
                                        setReschedule(e.target.value)
                                      }
                                    >
                                      <option value="">
                                        Choose an available slot
                                      </option>
                                      {slots
                                        .filter(
                                          (next) =>
                                            next.clinic === s.clinic &&
                                            next.available &&
                                            dateKey(next.startsAt) === moveDate,
                                        )
                                        .map((next) => (
                                          <option key={next.id} value={next.id}>
                                            {shortDate(next.startsAt)} ·{" "}
                                            {timeLabel(next.startsAt)}
                                          </option>
                                        ))}
                                    </select>
                                  </label>
                                  <span className="field-hint">
                                    Available slots in the selected month.
                                  </span>
                                  <button
                                    className="secondary-button small"
                                    disabled={busy || !reschedule}
                                    onClick={() =>
                                      action(
                                        `admin/bookings/${s.booking.id}/reschedule`,
                                        { slotId: reschedule },
                                        "Appointment moved. The previous slot is available again.",
                                      )
                                    }
                                  >
                                    Reschedule
                                  </button>
                                </div>
                                <div className="cancel-control">
                                  {cancelling === s.booking.id ? (
                                    <>
                                      <p>
                                        Cancel this appointment?
                                        <br />
                                        <span className="muted">
                                          The slot will become available again.
                                        </span>
                                      </p>
                                      <div>
                                        <button
                                          className="danger-button small"
                                          disabled={busy}
                                          onClick={() =>
                                            action(
                                              `admin/bookings/${s.booking.id}/cancel`,
                                              {},
                                              "Appointment cancelled. The slot is open again unless blocked.",
                                            )
                                          }
                                        >
                                          Yes, cancel
                                        </button>
                                        <button
                                          className="text-button small"
                                          onClick={() => setCancelling(null)}
                                          disabled={busy}
                                        >
                                          Keep booking
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <button
                                      className="text-button danger"
                                      disabled={busy}
                                      onClick={() =>
                                        setCancelling(s.booking.id)
                                      }
                                    >
                                      Cancel appointment
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div
            id="panel-availability"
            role="tabpanel"
            aria-labelledby="tab-availability"
            aria-busy={loading}
          >
            <div className="availability-heading">
              <p className="muted">
                Open or block individual slots. Booked slots stay reserved until
                cancelled or moved.
              </p>
              <label>
                Day
                <select
                  value={activeDay || ""}
                  onChange={(e) => setSelectedDay(e.target.value)}
                >
                  {days.length ? (
                    days.map((d) => (
                      <option value={d} key={d}>
                        {fullDate(`${d}T12:00:00Z`)}
                      </option>
                    ))
                  ) : (
                    <option value="">No slots this month</option>
                  )}
                </select>
              </label>
            </div>
            {loading ? (
              <div className="admin-empty" role="status">
                Loading availability…
              </div>
            ) : !daySlots.length ? (
              <div className="admin-empty">
                <Icon name="calendar" size={34} />
                <h3>No slots opened yet.</h3>
                <p>Open some appointment times to begin accepting bookings.</p>
                <button
                  className="primary-button"
                  onClick={() => setShowAdd(true)}
                >
                  <Icon name="plus" size={17} />
                  Open new slots
                </button>
              </div>
            ) : (
              <div className="availability-list">
                {daySlots.map((s) => (
                  <div className="availability-row" key={s.id}>
                    <div>
                      <strong>{timeLabel(s.startsAt)}</strong>
                      <span>30 min</span>
                    </div>
                    <span className={`clinic-badge ${s.clinic}`}>
                      {CLINICS[s.clinic].short}
                    </span>
                    <div className="slot-status">
                      {s.booking ? (
                        <>
                          <strong>{s.booking.name}</strong>
                          <span>Booked</span>
                        </>
                      ) : (
                        <>
                          <strong>
                            {!s.enabled
                              ? "Blocked"
                              : new Date(s.startsAt) <= new Date()
                                ? "Past slot"
                                : "Available"}
                          </strong>
                          <span>
                            {s.enabled
                              ? "Open for booking"
                              : "Hidden from customers"}
                          </span>
                        </>
                      )}
                    </div>
                    {s.booking ? (
                      <button
                        className="text-button small"
                        onClick={() => {
                          setTab("bookings");
                          setSearch("");
                          setExpanded(s.id);
                        }}
                      >
                        View booking <Icon name="arrow" size={15} />
                      </button>
                    ) : (
                      <button
                        className="secondary-button small"
                        disabled={busy || new Date(s.startsAt) <= new Date()}
                        onClick={() =>
                          action(
                            `admin/slots/${s.id}`,
                            { enabled: !s.enabled },
                            s.enabled
                              ? "Slot blocked. Customers can no longer book it."
                              : "Slot opened for booking.",
                            "PATCH",
                          )
                        }
                      >
                        {s.enabled ? "Block slot" : "Open slot"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
      <p className="admin-security">
        <Icon name="lock" size={13} />
        Signed in as {session.email} · Customer information is visible only to
        the clinic team.
      </p>
    </main>
  );
}
