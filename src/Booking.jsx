import React, { useEffect, useRef, useState } from 'react';
import { api, CLINICS, currentMonth, dateKey, downloadCalendar, fullDate, json, monthLabel, moveMonth, shortDate, timeLabel } from './lib.js';
import { Calendar, Icon } from './components.jsx';
import { clinicFromReply, dateFromReply, slotFromReply } from './chat.js';

const welcome = 'Hello. Which clinic would you like an appointment with: Aesthetic or Skin care?';
const help = 'You can type “change clinic”, “change date”, “change time”, “change details”, or “start over”. Dates can be written as 2026-10-15, 15 October, today, or tomorrow. Times can be written as 10 AM or 14:30.';
export default function Booking({ config }) {
  const [messages, setMessages] = useState([{role:'assistant', text:welcome}]);
  const [stage, setStage] = useState('clinic');
  const [clinic, setClinic] = useState(null);
  const [month, setMonth] = useState(currentMonth);
  const [slots, setSlots] = useState([]);
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [details, setDetails] = useState({name:'',email:'',phone:''});
  const [saved, setSaved] = useState(null);
  const [remember, setRemember] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState(null);
  const [calendarId, setCalendarId] = useState(null);
  const calendarSequence = useRef(0);
  const log = useRef(null);
  const composer = useRef(null);
  const lock = useRef(false);
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('forma-details'));
      if (data && ['name','email','phone'].every(key => typeof data[key] === 'string')) setSaved(data);
    } catch { /* Saving is optional. */ }
  }, []);
  useEffect(() => {
    const element = log.current;
    if (!element) return;
    const calendar = element.querySelector(`[data-calendar-id="${calendarId}"]`);
    const target = calendar && ['date','time'].includes(stage)
      ? (stage === 'time' && window.innerWidth <= 800 ? calendar.querySelector('.chat-calendar-times') : calendar)
      : null;
    const top = target ? element.scrollTop + target.getBoundingClientRect().top - element.getBoundingClientRect().top - 12 : element.scrollHeight;
    element.scrollTo({top, behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }, [messages, busy, stage, calendarId]);
  const say = text => setMessages(previous => [...previous, {role:'assistant',text}]);
  const datesMessage = (available, targetMonth) => {
    const days = [...new Set(available.map(item => dateKey(item.startsAt)))];
    return days.length
      ? `For ${monthLabel(targetMonth)}, these dates have openings:\n${days.map(date => shortDate(`${date}T12:00:00+05:00`)).join(' · ')}\nWhich date works for you? Type a date, or “next month” to look ahead.`
      : `There are no open appointments for ${monthLabel(targetMonth)}. Type “next month”, another date, or “change clinic” to check other availability.`;
  };
  const updateCalendar = (id, changes) => setMessages(previous => previous.map(message => message.calendarId === id ? {...message,...changes} : message));
  const loadDates = async (targetClinic, targetMonth, existingId = null) => {
    setStage('date'); setMonth(targetMonth); setDay(null); setSlot(null); setSlots([]);
    const id = existingId ?? ++calendarSequence.current;
    setCalendarId(id);
    const message = {role:'assistant',kind:'calendar',calendarId:id,text:'Choose a date below, then select an available time.',month:targetMonth,slots:[],day:null,selectedSlot:null,loading:true,error:''};
    if (existingId === null) setMessages(previous => [...previous,message]);
    else updateCalendar(id,message);
    try {
      const data = await api(`availability?clinic=${targetClinic}&month=${targetMonth}`);
      setSlots(data.slots);
      updateCalendar(id,{slots:data.slots,loading:false});
      return data.slots;
    } catch (error) {
      updateCalendar(id,{loading:false,error:error.message});
      throw error;
    }
  };
  const browseMonth = async targetMonth => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await loadDates(clinic,targetMonth,calendarId); }
    catch { /* The calendar displays an inline retry. */ }
    finally { lock.current = false; setBusy(false); }
  };
  const selectDay = chosen => {
    if (lock.current || !['date','time'].includes(stage)) return;
    setDay(chosen); setSlot(null); setStage('time');
    updateCalendar(calendarId,{day:chosen,selectedSlot:null});
  };
  const askName = () => {
    setStage('name');
    say(`A few details next. What is your full name?${saved ? ' You can also type “use saved details” to reuse your contact information on this browser.' : ''}`);
  };
  const review = (contact = details) => {
    setStage('confirm');
    say(`Please check your appointment:\n${CLINICS[clinic].name}\n${fullDate(slot.startsAt)} at ${timeLabel(slot.startsAt)}\n30 minutes · Pakistan time (UTC+5)\n\n${contact.name}\n${contact.email}\n${contact.phone}\n\n${config?.demo ? 'This is a local demo appointment. No clinic will be contacted.\n' : ''}Type “confirm” to book, or use a change command to edit.`);
  };
  const send = async (event, reply = input, selectedByCalendar = false) => {
    event.preventDefault();
    const answer = reply.trim();
    if (!answer || lock.current || stage === 'done') return;
    lock.current = true; setBusy(true); setInput('');
    setMessages(previous => [...previous, {role:'user',text:selectedByCalendar ? `${fullDate(`${day}T12:00:00+05:00`)} at ${answer}` : answer}]);
    const command = answer.toLowerCase().replace(/[.!?]+$/, '').trim();
    try {
      if (command === 'help') { say(help); return; }
      if (command === 'start over' || command === 'change clinic') {
        setClinic(null); setDay(null); setSlot(null); setSlots([]); setBooking(null); setRemember(false); setDetails({name:'',email:'',phone:''}); setStage('clinic'); say(welcome); return;
      }
      if (command === 'forget saved details') {
        try { localStorage.removeItem('forma-details'); setSaved(null); setRemember(false); say('Saved details removed from this browser. You can continue with your current answer.'); }
        catch { say('This browser could not remove saved details. Check its storage settings.'); }
        return;
      }
      if (command === 'change date' && clinic) { await loadDates(clinic,month); return; }
      if (command === 'change time' && day) {
        const chosen = day;
        const available = await loadDates(clinic,month);
        if (available.some(item => dateKey(item.startsAt) === chosen)) {
          setDay(chosen); setStage('time');
          updateCalendar(calendarSequence.current,{day:chosen});
        }
        return;
      }
      if (command === 'change details' && slot) { askName(); return; }
      if (stage === 'clinic') {
        const selected = clinicFromReply(answer);
        if (!selected) { say('Please type “Aesthetic” or “Skin care” so I can find the right clinic.'); return; }
        setClinic(selected); say(`${CLINICS[selected].name}, of course. Let’s find a time for your 30-minute consultation.`);
        await loadDates(selected,currentMonth());
      } else if (stage === 'date') {
        if (command === 'next month' || command === 'previous month' || command === 'retry') {
          const target = command === 'retry' ? month : moveMonth(month,command === 'next month' ? 1 : -1);
          if (target < currentMonth() || target > '2100-12') { say('Please choose this month or a future month before 2101.'); return; }
          await loadDates(clinic,target,calendarId); return;
        }
        const chosen = dateFromReply(answer,month);
        if (!chosen) { say('Please write a date like “15 October” or “2026-10-15”. You can also type a day number for the displayed month.'); return; }
        if (chosen < dateKey(new Date()) || chosen > '2100-12-31') { say('Please choose today or a future date before 2101.'); return; }
        const targetMonth = chosen.slice(0,7);
        let available = slots;
        if (targetMonth !== month) {
          const data = await api(`availability?clinic=${clinic}&month=${targetMonth}`);
          available = data.slots; setSlots(available); setMonth(targetMonth);
          updateCalendar(calendarId,{month:targetMonth,slots:available,day:null});
        }
        const times = available.filter(item => dateKey(item.startsAt) === chosen);
        if (!times.length) { say(`There are no open times on ${fullDate(`${chosen}T12:00:00+05:00`)}. ${datesMessage(available,targetMonth)}`); return; }
        setDay(chosen); setStage('time');
        updateCalendar(calendarId,{day:chosen});
      } else if (stage === 'time') {
        const selected = slotFromReply(answer,slots.filter(item => dateKey(item.startsAt) === day));
        if (!selected || new Date(selected.startsAt) <= new Date()) { say('Please type one of the available times above, including AM or PM, or use 24-hour time. Type “change date” to choose another day.'); return; }
        setSlot(selected); updateCalendar(calendarId,{selectedSlot:selected.id}); say(`${timeLabel(selected.startsAt)} works. Your appointment is not booked until you confirm.`); askName();
      } else if (stage === 'name') {
        if (command === 'use saved details' && saved) {
          setDetails(saved); setStage('remember'); say(`Using saved details for ${saved.name}. Would you like to keep these details saved on this browser? Type “yes” or “no”.`); return;
        }
        if (answer.length < 2 || answer.length > 100) { say('Please enter your full name, between 2 and 100 characters.'); return; }
        setDetails(previous => ({...previous,name:answer})); setStage('email'); say('What is your email address?');
      } else if (stage === 'email') {
        if (answer.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) { say('That email address doesn’t look complete. Please try again, for example name@example.com.'); return; }
        setDetails(previous => ({...previous,email:answer.toLowerCase()})); setStage('phone'); say('And your phone number? Include the country code if you can.');
      } else if (stage === 'phone') {
        if (!/^\+?[\d\s().-]{7,25}$/.test(answer) || answer.replace(/\D/g,'').length < 7) { say('Please enter a valid phone number, for example +92 300 1234567.'); return; }
        setDetails(previous => ({...previous,phone:answer})); setStage('remember'); say('Would you like to save your contact details on this browser for next time? Type “yes” or “no”.');
      } else if (stage === 'remember') {
        if (!['yes','no'].includes(command)) { say('Please type “yes” to save details on this browser, or “no” to continue without saving.'); return; }
        setRemember(command === 'yes');
        if (command === 'no') {
          try { localStorage.removeItem('forma-details'); setSaved(null); }
          catch { say('Browser storage could not be cleared. You can remove saved details in your browser settings.'); }
        }
        review();
      } else if (stage === 'confirm') {
        if (command !== 'confirm') { say('Type “confirm” to book this appointment, or “change details”, “change date”, or “change clinic” to edit it.'); return; }
        const result = await api('bookings',json('POST',{...details,slotId:slot.id}));
        setBooking(result.booking); setStage('done');
        say(`${config?.demo ? 'Your demo appointment is saved. No clinic has been contacted.' : 'Your appointment is booked.'}\nReference: ${result.booking.id.slice(0, 8).toUpperCase()}\n${CLINICS[clinic].name} · ${fullDate(slot.startsAt)} at ${timeLabel(slot.startsAt)}\nThank you, ${details.name}.`);
        if (remember) {
          try { localStorage.setItem('forma-details',JSON.stringify(details)); setSaved(details); }
          catch { say('Your appointment is booked, but your browser could not save your details.'); }
        }
      }
    } catch (error) {
      say(error.status === 409 ? 'That time was just taken. Let’s find another available appointment.' : `${error.message} Please try your answer again.`);
      if (error.status === 409) {
        try { await loadDates(clinic,month); } catch { setStage('date'); say('Availability could not be loaded. Type “retry” to try again.'); }
      }
    } finally {
      lock.current = false; setBusy(false);
      requestAnimationFrame(() => composer.current?.focus());
    }
  };
  const placeholders = {clinic:'Aesthetic or Skin care',date:'Choose a date above',time:'Choose a time above',name:'Your full name',email:'Your email address',phone:'Your phone number',remember:'Yes or no',confirm:'Type confirm to book'};
  const complete = ['clinic','date','time'].includes(stage) ? 0 : stage === 'done' ? 3 : 2;
  return <main className="booking-shell chat-shell">
    <aside className="booking-aside chat-aside">
      <div><p className="eyebrow">A CONVERSATION, A LITTLE CARE</p><h1>A little time.<br/><em>All for you.</em></h1><p className="aside-intro">Tell us what works for you. We’ll take care of the booking, one reply at a time.</p></div>
      <div className="chat-summary"><p className="eyebrow">YOUR APPOINTMENT</p><p>{clinic ? CLINICS[clinic].name : 'Let’s find your clinic'}</p>{slot && <p>{fullDate(slot.startsAt)}<br/>{timeLabel(slot.startsAt)}</p>}<span className="muted">30-minute consultation · UTC+5</span></div>
      <p className="chat-aside-note"><Icon name="lock" size={14}/> Your details are kept private.</p>
    </aside>
    <section className="chat-panel" aria-labelledby="chat-heading">
      <header className="chat-header"><div><p className="eyebrow">APPOINTMENTS</p><h2 id="chat-heading">Let’s make a little space.</h2></div><span className="chat-status">{stage === 'done' ? 'Booked' : 'Booking assistant'}</span></header>
      <div className="chat-log" ref={log} role="log" aria-label="Booking conversation" aria-live="polite" aria-relevant="additions" tabIndex={0}>
        {messages.map((message,index) => {
          const active = message.calendarId === calendarId && ['date','time'].includes(stage);
          const available = message.slots?.filter(item => dateKey(item.startsAt) === message.day) || [];
          return <div key={index} className={`chat-message chat-${message.role} ${message.kind === 'calendar' ? 'chat-calendar-message' : ''}`}>
            <span className="chat-speaker">{message.role === 'assistant' ? 'Clinic assistant' : 'You'}</span><p>{message.text}</p>
            {message.kind === 'calendar' && <div className="chat-calendar" data-calendar-id={message.calendarId} aria-label="Appointment date and time" aria-busy={message.loading}>
              <Calendar month={message.month} onMonth={browseMonth} selected={message.day} onSelect={selectDay} availableDates={new Set(message.slots.map(item => dateKey(item.startsAt)))} loading={!active || busy || message.loading}/>
              <div className="chat-calendar-times">
                <h3>{message.day ? fullDate(`${message.day}T12:00:00+05:00`) : 'Available times'}</h3>
                <p className="muted">30 min · Pakistan time (UTC+5)</p>
                {message.error ? <div className="chat-calendar-empty"><p role="alert">{message.error}</p>{active && <button className="text-button" disabled={busy} onClick={() => browseMonth(message.month)}>Retry availability</button>}</div>
                  : message.loading ? <p className="chat-calendar-empty" role="status">Loading availability…</p>
                  : !message.slots.length ? <p className="chat-calendar-empty">No appointments this month. Browse the next month or type “change clinic”.</p>
                  : !message.day ? <p className="chat-calendar-empty">Choose an available date to see its times.</p>
                  : <div className="chat-calendar-time-grid">{available.map(item => <button key={item.id} type="button" className={`time-slot ${message.selectedSlot === item.id ? 'selected' : ''}`} aria-pressed={message.selectedSlot === item.id} disabled={!active || busy || new Date(item.startsAt) <= new Date()} onClick={event => send(event,timeLabel(item.startsAt),true)}>{timeLabel(item.startsAt)}</button>)}</div>}
                {!active && <p className="chat-calendar-history">Earlier availability. Type “change date” to choose again.</p>}
              </div>
            </div>}
          </div>;
        })}
        {busy && <p className="chat-working" role="status">Checking your appointment…</p>}
      </div>
      {booking ? <div className="chat-complete"><button className="primary-button" onClick={() => downloadCalendar(slot,clinic)}><Icon name="calendar" size={18}/> Add to my calendar</button><button className="text-button" onClick={() => {setMessages([{role:'assistant',text:welcome}]);setStage('clinic');setClinic(null);setSlot(null);setDay(null);setSlots([]);setDetails({name:'',email:'',phone:''});setRemember(false);setBooking(null);}}>Book another appointment</button></div> : <form className="chat-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="chat-reply">{placeholders[stage] || 'Your reply'}</label>
        <input id="chat-reply" ref={composer} name={['name','email','phone'].includes(stage) ? stage : 'reply'} value={input} onChange={event => setInput(event.target.value)} placeholder={placeholders[stage]} maxLength={500} autoComplete={{name:'name',email:'email',phone:'tel'}[stage] || 'off'} inputMode={{email:'email',phone:'tel'}[stage] || 'text'} disabled={busy} aria-describedby="chat-hint"/>
        <button className="chat-send" type="submit" disabled={busy || !input.trim()} aria-label="Send reply"><Icon name="arrow" size={20}/></button>
        <p id="chat-hint">{['date','time'].includes(stage) ? 'Select a date and time in the calendar, or type your choice.' : 'Type your reply and press Enter.'} <span>Type “help” for changes and date formats.</span></p>
      </form>}
      <div className="chat-footer"><span>{complete === 3 ? 'Appointment confirmed' : 'Clinic · Date & time · Your details'}</span><span>Simply booked.</span></div>
    </section>
  </main>;
}

