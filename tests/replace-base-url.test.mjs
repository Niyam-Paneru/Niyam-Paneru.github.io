import assert from "node:assert/strict";
import test from "node:test";

import { activatePagesTrigger } from "../scripts/replace-base-url.mjs";

for (const newline of ["\n", "\r\n"]) {
  test(`activates the Pages push trigger with ${JSON.stringify(newline)}`, () => {
    const source = [
      "on:",
      "  workflow_dispatch:",
      "  # SECOND_ACCOUNT_PUSH_TRIGGER",
      "",
    ].join(newline);

    const result = activatePagesTrigger(source);

    assert.equal(result.activated, true);
    assert.match(result.content, /push:/);
    assert.equal(result.content.includes(newline), true);
    assert.equal(result.content.includes("SECOND_ACCOUNT_PUSH_TRIGGER"), false);
  });
}
