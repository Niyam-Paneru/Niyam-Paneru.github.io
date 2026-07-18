import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateBackoff,
  parseStatusSequence,
  registerEventId,
  simulateWebhook,
  validateEvent,
} from "../assets/webhook-lab.js";

test("validates JSON and required string fields", () => {
  const result = validateEvent('{"id":"evt_1042","event":"invoice.paid","amount":4200}');

  assert.equal(result.valid, true);
  assert.equal(result.event.id, "evt_1042");
  assert.deepEqual(result.errors, []);
});

test("reports invalid JSON without inventing an event", () => {
  const result = validateEvent('{"id":');

  assert.equal(result.valid, false);
  assert.equal(result.event, null);
  assert.match(result.errors[0], /JSON could not be parsed/i);
});

for (const payload of [
  ["missing id", '{"event":"invoice.paid"}', /id.*required/i],
  ["non-string id", '{"id":42,"event":"invoice.paid"}', /id.*text/i],
  ["missing event", '{"id":"evt_1"}', /event.*required/i],
  ["non-string event", '{"id":"evt_1","event":42}', /event.*text/i],
]) {
  test(`rejects ${payload[0]}`, () => {
    const result = validateEvent(payload[1]);
    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), payload[2]);
  });
}

test("detects duplicate event IDs within the supplied session", () => {
  const seen = new Set();

  assert.deepEqual(registerEventId("evt_1042", seen), { duplicate: false, id: "evt_1042" });
  assert.deepEqual(registerEventId("evt_1042", seen), { duplicate: true, id: "evt_1042" });
});

test("accepts only the documented simulation statuses", () => {
  assert.deepEqual(parseStatusSequence("429, 500, 503, 200"), [429, 500, 503, 200]);
  assert.throws(() => parseStatusSequence("418, 200"), /418 is unsupported/);
  assert.throws(() => parseStatusSequence(""), /Enter at least one status/);
});

test("calculates exponential backoff with a maximum delay", () => {
  assert.equal(calculateBackoff(1, 1000, 8000), 1000);
  assert.equal(calculateBackoff(2, 1000, 8000), 2000);
  assert.equal(calculateBackoff(4, 1000, 8000), 8000);
  assert.equal(calculateBackoff(8, 1000, 8000), 8000);
});

test("delivers after deterministic temporary failures", () => {
  const simulation = simulateWebhook({
    statuses: [429, 500, 200],
    maxAttempts: 4,
    baseDelayMs: 1000,
    maxDelayMs: 8000,
  });

  assert.deepEqual(simulation.attempts.map((item) => item.waitMs), [1000, 2000, 0]);
  assert.equal(simulation.outcome, "Delivered");
  assert.equal(simulation.attempts.at(-1).decision, "Accepted");
});

test("ends in Needs attention when retry attempts are exhausted", () => {
  const simulation = simulateWebhook({
    statuses: [500, 503, 503],
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 8000,
  });

  assert.equal(simulation.outcome, "Needs attention");
  assert.equal(simulation.attempts.length, 3);
  assert.equal(simulation.attempts.at(-1).decision, "Retry limit reached");
  assert.equal(simulation.attempts.at(-1).waitMs, 0);
});
