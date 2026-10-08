import React, { useEffect, useRef, useState } from "react";
import {
  api,
  CLINICS,
  currentMonth,
  dateKey,
  downloadCalendar,
  fullDate,
  json,
  shortDate,
  timeLabel,
} from "./lib.js";
import {
  Calendar,
  ClinicArt,
  ErrorMessage,
  Icon,
  StepHeading,
} from "./components.jsx";

const EMPTY = { name: "", email: "", phone: "" };
export default function Booking({ config }) {
  const [step, setStep] = useState(0);
  const [clinic, setClinic] = useState(null);
  const [month, setMonth] = useState(currentMonth);
  const [date, setDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [details, setDetails] = useState(EMPTY);
  const [saved, setSaved] = useState(null);
  const [remember, setRemember] = useState(false);
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState(null);
  const [storageNotice, setStorageNotice] = useState("");
  const panelRef = useRef();
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("forma-details"));
      if (
        data &&
        ["name", "email", "phone"].every((key) => typeof data[key] === "string")
      )
        setSaved(data);
    } catch {
      /* Storage is optional. */
    }
  }, []);
  useEffect(() => {
    if (!clinic || step !== 1) return;
    let active = true;
    setLoading(true);
    setError("");
    api(`availability?clinic=${clinic}&month=${month}`)
      .then((data) => {
        if (active) {
          setSlots(data.slots);
          setDate((prev) =>
            data.slots.some((s) => dateKey(s.startsAt) === prev) ? prev : null,
          );
          setSlot((prev) =>
            data.slots.some((s) => s.id === prev?.id) ? prev : null,
          );
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setSlots([]);
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [clinic, month, step, refresh]);
  const changeStep = (next) => {
    setStep(next);
    setError("");
    if (window.innerWidth < 800)
      panelRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  };
  const chooseClinic = (value) => {
    if (value !== clinic) {
      setClinic(value);
      setSlot(null);
      setDate(null);
      setSlots([]);
    }
  };
  const availableDates = new Set(slots.map((s) => dateKey(s.startsAt)));
  const daySlots = slots.filter((s) => dateKey(s.startsAt) === date);
  const forgetDetails = () => {
    try {
      localStorage.removeItem("forma-details");
      setSaved(null);
      setRemember(false);
      setStorageNotice("Saved details removed from this browser.");
    } catch {
      setStorageNotice("Browser storage is unavailable.");
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    if (saving || !slot) return;
    setSaving(true);
    setError("");
    try {
      const result = await api(
        "bookings",
        json("POST", { ...details, slotId: slot.id }),
      );
      if (remember) {
        try {
          localStorage.setItem("forma-details", JSON.stringify(details));
          setSaved(details);
        } catch {
          setStorageNotice(
            "Your appointment is booked, but this browser couldn’t save your details.",
          );
        }
      }
      setBooking(result.booking);
      changeStep(3);
    } catch (e) {
      setError(e.message);
      if (e.status === 409) {
        setSlot(null);
        setRefresh((n) => n + 1);
        setStep(1);
      }
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="booking-shell">
      <aside className="booking-aside">
        <div>
          <h1>
            A little time.
            <br />
            <em>All for you.</em>
          </h1>
          <p className="aside-intro">
            Make room for yourself. Find your clinic,
            <br className="desktop-break" /> choose a time, and we’ll take it
            from there.
          </p>
        </div>
        <ol className="aside-steps" aria-label="Booking progress">
          {["Choose your clinic", "Find your moment", "A few details"].map(
            (label, i) => (
              <li
                key={label}
                className={`${step === i ? "current" : ""} ${step > i ? "complete" : ""}`}
                aria-current={step === i ? "step" : undefined}
              >
                <span className="step-number">
                  {step > i ? <Icon name="check" size={14} /> : `0${i + 1}`}
                </span>
                <span>{label}</span>
                {step > i && step < 3 && (
                  <button
                    type="button"
                    className="edit-step"
                    onClick={() => changeStep(i)}
                    aria-label={`Edit ${label}`}
                  >
                    Edit
                  </button>
                )}
              </li>
            ),
          )}
        </ol>
        {clinic ? (
          <div className="appointment-summary">
            <p className="eyebrow">YOUR APPOINTMENT</p>
            <p className="summary-clinic">{CLINICS[clinic].name}</p>
            <div className="summary-line">
              <Icon name="clock" size={17} />
              <span>30-minute consultation</span>
            </div>
            {slot && (
              <>
                <div className="summary-line">
                  <Icon name="calendar" size={17} />
                  <span>{fullDate(slot.startsAt)}</span>
                </div>
                <p className="summary-time">
                  {timeLabel(slot.startsAt)} <span>· Pakistan time</span>
                </p>
              </>
            )}
            <span className="summary-decoration" aria-hidden="true">
              <Icon name="leaf" size={56} />
            </span>
          </div>
        ) : (
          <div className="aside-bottom">
            <span className="aside-flower" aria-hidden="true">
              ✳
            </span>
            <p>
              Two specialties.
              <br />
              One thoughtful experience.
            </p>
          </div>
        )}
        <p className="aside-footnote">
          <Icon name="lock" size={13} /> Your details are kept private.
        </p>
      </aside>
      <section className="booking-panel" ref={panelRef}>
        <div className="panel-progress">
          <span>
            {step === 3 ? "APPOINTMENT CONFIRMED" : `STEP 0${step + 1} OF 03`}
          </span>
          <div className="progress-segments" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={step >= i ? "filled" : ""} />
            ))}
          </div>
        </div>
        <div className="step-content" key={step}>
          {step === 0 && (
            <>
              <StepHeading title="Which clinic is right for you?">
                Choose where you’d like to begin.
              </StepHeading>
              <div
                className="clinic-options"
                role="group"
                aria-label="Choose a clinic"
              >
                {Object.entries(CLINICS).map(([key, item], i) => (
                  <button
                    type="button"
                    className={`clinic-option ${clinic === key ? "chosen" : ""}`}
                    key={key}
                    aria-pressed={clinic === key}
                    onClick={() => chooseClinic(key)}
                  >
                    <div className="clinic-option-copy">
                      <span className="clinic-number">
                        0{i + 1} / {item.tag}
                      </span>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <span className="clinic-duration">
                        <Icon name="clock" size={14} /> 30-minute consultation
                      </span>
                    </div>
                    <ClinicArt clinic={key} />
                    <span className="choice-indicator">
                      {clinic === key && <Icon name="check" size={13} />}
                    </span>
                  </button>
                ))}
              </div>
              <div className="panel-actions">
                <span className="muted action-note">
                  A good place to start.
                </span>
                <button
                  className="primary-button"
                  disabled={!clinic}
                  onClick={() => changeStep(1)}
                >
                  Find a time <Icon name="arrow" size={18} />
                </button>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <StepHeading title="When works for you?">
                A little space in your day, just for you.
              </StepHeading>
              <ErrorMessage>{error}</ErrorMessage>
              {error && (
                <button
                  className="text-button"
                  onClick={() => setRefresh((n) => n + 1)}
                >
                  Retry availability
                </button>
              )}
              <div className="scheduling-layout" aria-busy={loading}>
                <Calendar
                  month={month}
                  onMonth={(value) => {
                    setMonth(value);
                    setSlots([]);
                    setDate(null);
                    setSlot(null);
                  }}
                  selected={date}
                  onSelect={(value) => {
                    setDate(value);
                    setSlot(null);
                  }}
                  availableDates={availableDates}
                  loading={loading}
                />
                <div className="time-picker">
                  <div className="time-picker-heading">
                    <h3>
                      {date
                        ? new Date(`${date}T12:00:00Z`).toLocaleDateString(
                            "en-GB",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            },
                          )
                        : "Available times"}
                    </h3>
                    <p>30 min · Pakistan time (UTC+5)</p>
                  </div>
                  {loading ? (
                    <div
                      className="time-skeleton"
                      role="status"
                      aria-label="Loading appointments"
                    >
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <span key={i} />
                      ))}
                    </div>
                  ) : date ? (
                    <div
                      className="time-slots"
                      role="group"
                      aria-label="Available appointment times"
                    >
                      {daySlots.map((s) => (
                        <button
                          type="button"
                          className={`time-slot ${slot?.id === s.id ? "selected" : ""}`}
                          aria-pressed={slot?.id === s.id}
                          key={s.id}
                          onClick={() => setSlot(s)}
                        >
                          {timeLabel(s.startsAt)}
                          {slot?.id === s.id && <Icon name="check" size={13} />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="time-empty">
                      <Icon name="calendar" size={32} />
                      <p>
                        {slots.length
                          ? "Choose an available date to see your times."
                          : error
                            ? "Availability couldn’t be loaded."
                            : "No appointments this month. Try the next month."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="panel-actions">
                <button className="text-button" onClick={() => changeStep(0)}>
                  <Icon name="back" size={16} /> Back
                </button>
                <button
                  className="primary-button"
                  disabled={!slot || loading}
                  onClick={() => changeStep(2)}
                >
                  Continue <Icon name="arrow" size={18} />
                </button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <StepHeading title="Let’s make it yours.">
                Just the essentials, so we know who to expect.
              </StepHeading>
              <div
                className="mobile-appointment"
                aria-label="Selected appointment"
              >
                <Icon name="calendar" size={18} />
                <div>
                  <strong>{CLINICS[clinic].name}</strong>
                  <span>
                    {shortDate(slot.startsAt)} · {timeLabel(slot.startsAt)} · 30
                    min
                  </span>
                </div>
              </div>
              {saved && (
                <div className="saved-details">
                  <Icon name="person" size={19} />
                  <div>
                    <strong>Welcome back, {saved.name.split(" ")[0]}.</strong>
                    <span>Your details are saved in this browser.</span>
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setDetails({
                        name: saved.name,
                        email: saved.email,
                        phone: saved.phone,
                      });
                      setRemember(true);
                      setStorageNotice("Saved details filled in.");
                    }}
                  >
                    Use my details
                  </button>
                </div>
              )}
              <form onSubmit={submit} autoComplete="on">
                <div className="details-fields">
                  <label>
                    Full name
                    <input
                      required
                      name="name"
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      placeholder="Your first and last name"
                      value={details.name}
                      onChange={(e) =>
                        setDetails({ ...details, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Email address
                    <input
                      required
                      type="email"
                      name="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder="you@example.com"
                      value={details.email}
                      onChange={(e) =>
                        setDetails({ ...details, email: e.target.value })
                      }
                    />
                    <span className="field-hint">
                      Included in your booking record.
                    </span>
                  </label>
                  <label>
                    Phone number
                    <input
                      required
                      type="tel"
                      name="tel"
                      autoComplete="tel"
                      minLength={7}
                      maxLength={25}
                      placeholder="+92 300 1234567"
                      value={details.phone}
                      onChange={(e) =>
                        setDetails({ ...details, phone: e.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="remember-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>
                      Remember my details on this device
                      <span className="field-hint">
                        Optional. Best on a personal device.
                      </span>
                    </span>
                  </label>
                  {saved && (
                    <button
                      type="button"
                      className="text-button small"
                      onClick={forgetDetails}
                    >
                      Forget details
                    </button>
                  )}
                </div>
                {storageNotice && (
                  <p className="muted" role="status">
                    {storageNotice}
                  </p>
                )}
                <ErrorMessage>{error}</ErrorMessage>
                <p className="booking-disclosure">
                  {config?.demo
                    ? "This is a demo booking. No clinic will be contacted."
                    : "Booking reserves this time for you. Your contact details will be visible to the clinic team."}
                </p>
                <div className="panel-actions">
                  <button
                    type="button"
                    className="text-button"
                    disabled={saving}
                    onClick={() => changeStep(1)}
                  >
                    <Icon name="back" size={16} /> Back
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={saving}
                  >
                    {saving
                      ? "Booking your time…"
                      : config?.demo
                        ? "Confirm demo booking"
                        : "Confirm appointment"}
                    {!saving && <Icon name="arrow" size={18} />}
                  </button>
                </div>
              </form>
            </>
          )}
          {step === 3 && (
            <div className="confirmation">
              <span className="success-mark">
                <Icon name="check" size={30} />
              </span>
              <StepHeading title="Your time is reserved.">
                {details.name.split(" ")[0]}, your appointment is all set.
              </StepHeading>
              <div className="confirmation-details">
                <span>{CLINICS[clinic].name}</span>
                <h3>{fullDate(slot.startsAt)}</h3>
                <p>{timeLabel(slot.startsAt)} · 30 minutes · Pakistan time</p>
                <div className="booking-reference">
                  BOOKING REFERENCE{" "}
                  <strong>{booking.id.slice(0, 8).toUpperCase()}</strong>
                </div>
              </div>
              <p className="muted confirmation-note">
                {config?.demo
                  ? "Saved to this local demo. No appointment or email has been sent to a clinic."
                  : "Your reservation is saved. Keep this reference for the clinic team. No email notification is sent by this version."}
              </p>
              {storageNotice && (
                <p className="muted" role="status">
                  {storageNotice}
                </p>
              )}
              <button
                className="primary-button"
                onClick={() => downloadCalendar(slot, clinic)}
              >
                <Icon name="calendar" size={18} /> Add to my calendar
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setBooking(null);
                  setSlot(null);
                  setDate(null);
                  setDetails(EMPTY);
                  setRemember(false);
                  setStorageNotice("");
                  changeStep(0);
                }}
              >
                Book another appointment <Icon name="arrow" size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="panel-bottom">
          <span className="tiny-flower" aria-hidden="true">
            ✳
          </span>
          <span>A simple booking. A thoughtful beginning.</span>
        </div>
      </section>
    </main>
  );
}
