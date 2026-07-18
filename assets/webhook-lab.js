function fieldError(field, value) {
  if (value === undefined || value === null || value === "") return `${field} is required.`;
  if (typeof value !== "string") return `${field} must be text.`;
  return "";
}

export function validateEvent(input) {
  let event;
  try {
    event = typeof input === "string" ? JSON.parse(input) : input;
  } catch (error) {
    return {
      valid: false,
      event: null,
      errors: [`JSON could not be parsed: ${error.message}`],
    };
  }

  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return { valid: false, event: null, errors: ["Payload must be a JSON object."] };
  }

  const errors = [fieldError("id", event.id), fieldError("event", event.event)].filter(Boolean);
  return { valid: errors.length === 0, event, errors };
}

export function registerEventId(id, seenIds) {
  const duplicate = seenIds.has(id);
  if (!duplicate) seenIds.add(id);
  return { duplicate, id };
}

function supportedStatus(status) {
  return status === 200 || status === 429 || (status >= 500 && status <= 599);
}

export function parseStatusSequence(input) {
  const tokens = String(input)
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) throw new Error("Enter at least one status: 200, 429, or 500–599.");

  return tokens.map((token) => {
    const status = Number(token);
    if (!Number.isInteger(status) || !supportedStatus(status)) {
      throw new Error(`${token} is unsupported. Use 200, 429, or a 500–599 status.`);
    }
    return status;
  });
}

export function calculateBackoff(attempt, baseDelayMs = 1000, maxDelayMs = 8000) {
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error("Attempt must be a positive integer.");
  return Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
}

export function simulateWebhook({
  statuses,
  maxAttempts = 4,
  baseDelayMs = 1000,
  maxDelayMs = 8000,
}) {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    throw new Error("Enter at least one status before running the simulation.");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("Maximum attempts must be a positive integer.");
  }
  for (const status of statuses) {
    if (!supportedStatus(status)) {
      throw new Error(`${status} is unsupported. Use 200, 429, or a 500–599 status.`);
    }
  }

  const attempts = [];
  const attemptCount = Math.min(statuses.length, maxAttempts);

  for (let index = 0; index < attemptCount; index += 1) {
    const attempt = index + 1;
    const status = statuses[index];
    if (status === 200) {
      attempts.push({ attempt, status, decision: "Accepted", waitMs: 0 });
      return { attempts, outcome: "Delivered" };
    }

    const canRetry = attempt < maxAttempts && index + 1 < statuses.length;
    attempts.push({
      attempt,
      status,
      decision: canRetry ? "Retry scheduled" : "Retry limit reached",
      waitMs: canRetry ? calculateBackoff(attempt, baseDelayMs, maxDelayMs) : 0,
    });

    if (!canRetry) return { attempts, outcome: "Needs attention" };
  }

  return { attempts, outcome: "Needs attention" };
}

const SAMPLE_EVENT = JSON.stringify(
  {
    id: "evt_1042",
    event: "invoice.paid",
    created_at: "2026-07-18T09:42:00Z",
    data: { invoice_id: "inv_884", amount: 4200, currency: "USD" },
  },
  null,
  2,
);

function setStatus(target, message, tone = "neutral") {
  target.textContent = message;
  target.dataset.tone = tone;
}

export function initWebhookLab(root = document) {
  const app = root.querySelector("[data-webhook-lab]");
  if (!app) return null;

  const payloadInput = app.querySelector("[data-payload-input]");
  const statusInput = app.querySelector("[data-status-input]");
  const maxAttemptsInput = app.querySelector("[data-max-attempts]");
  const loadSample = app.querySelector('[data-action="load-sample"]');
  const run = app.querySelector('[data-action="simulate"]');
  const status = app.querySelector("[data-status]");
  const results = app.querySelector("[data-results]");
  const validation = app.querySelector("[data-validation]");
  const eventId = app.querySelector("[data-event-id]");
  const eventName = app.querySelector("[data-event-name]");
  const payloadSize = app.querySelector("[data-payload-size]");
  const duplicateState = app.querySelector("[data-duplicate-state]");
  const timeline = app.querySelector("[data-timeline]");
  const outcome = app.querySelector("[data-outcome]");
  const seenIds = new Set();

  const runSimulation = () => {
    results.hidden = true;
    validation.replaceChildren();

    const checked = validateEvent(payloadInput.value);
    if (!checked.valid) {
      for (const error of checked.errors) {
        const item = root.createElement("li");
        item.textContent = error;
        validation.append(item);
      }
      setStatus(status, checked.errors.join(" "), "error");
      payloadInput.focus();
      return;
    }

    try {
      const statuses = parseStatusSequence(statusInput.value);
      const maxAttempts = Number(maxAttemptsInput.value);
      if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 8) {
        throw new Error("Maximum attempts must be a whole number from 1 to 8.");
      }

      const registration = registerEventId(checked.event.id, seenIds);
      const simulation = simulateWebhook({ statuses, maxAttempts });
      const success = root.createElement("li");
      success.textContent = "JSON syntax and required fields are valid.";
      validation.append(success);
      eventId.textContent = checked.event.id;
      eventName.textContent = checked.event.event;
      payloadSize.textContent = `${new TextEncoder().encode(payloadInput.value).byteLength} bytes`;
      duplicateState.textContent = registration.duplicate
        ? "Duplicate ID detected in this session"
        : "First delivery in this session";
      duplicateState.dataset.duplicate = String(registration.duplicate);

      timeline.replaceChildren();
      for (const item of simulation.attempts) {
        const entry = root.createElement("li");
        const heading = root.createElement("strong");
        const detail = root.createElement("span");
        heading.textContent = `Attempt ${item.attempt} · HTTP ${item.status}`;
        detail.textContent = item.waitMs
          ? `${item.decision}. Wait ${item.waitMs / 1000} seconds.`
          : item.decision;
        entry.append(heading, detail);
        timeline.append(entry);
      }

      outcome.textContent = simulation.outcome;
      outcome.dataset.outcome = simulation.outcome === "Delivered" ? "success" : "attention";
      results.hidden = false;
      setStatus(
        status,
        registration.duplicate
          ? `${simulation.outcome}. The event ID was already seen in this browser session.`
          : `${simulation.outcome}. The event ID is new in this browser session.`,
        simulation.outcome === "Delivered" ? (registration.duplicate ? "warning" : "success") : "warning",
      );
    } catch (error) {
      const item = root.createElement("li");
      item.textContent = error.message;
      validation.append(item);
      setStatus(status, error.message, "error");
      statusInput.focus();
    }
  };

  loadSample.addEventListener("click", () => {
    payloadInput.value = SAMPLE_EVENT;
    statusInput.value = "429, 500, 200";
    maxAttemptsInput.value = "4";
    setStatus(status, "Synthetic event loaded. Run it to inspect the retry path.");
    payloadInput.focus();
  });
  run.addEventListener("click", runSimulation);

  return { runSimulation, seenIds };
}

if (typeof document !== "undefined") initWebhookLab(document);
