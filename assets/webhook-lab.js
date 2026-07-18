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
