import test from 'node:test';
import assert from 'node:assert/strict';
import { clinicFromReply, dateFromReply, minutesFromReply, slotFromReply } from '../src/chat.js';
test('chat accepts clinic names but rejects ambiguous clinic requests', () => {
  assert.equal(clinicFromReply('I want skin care'), 'skin');
  assert.equal(clinicFromReply('Aesthetics please'), 'aesthetic');
  assert.equal(clinicFromReply('skin or aesthetic'), null);
  assert.equal(clinicFromReply('something else'), null);
});
test('chat interprets explicit and relative dates in clinic timezone', () => {
  const now = new Date('2026-10-31T20:00:00Z');
  assert.equal(dateFromReply('today','2026-10',now), '2026-11-01');
  assert.equal(dateFromReply('tomorrow','2026-10',now), '2026-11-02');
  assert.equal(dateFromReply('15 October','2026-10',now), '2026-10-15');
  assert.equal(dateFromReply('9','2026-10',now), '2026-10-09');
  assert.equal(dateFromReply('2026-02-30','2026-10',now), null);
});
test('chat resolves only actual available times and handles noon/midnight', () => {
  const slots = [{id:'one', startsAt:'2026-10-15T09:30:00Z'}];
  assert.equal(slotFromReply('2:30 PM',slots)?.id,'one');
  assert.equal(slotFromReply('14:30',slots)?.id,'one');
  assert.equal(slotFromReply('2:30 AM',slots),null);
  assert.equal(minutesFromReply('12 AM'),0);
  assert.equal(minutesFromReply('12 PM'),720);
  assert.equal(minutesFromReply('24:00'),null);
  assert.equal(minutesFromReply('13 PM'),null);
});
