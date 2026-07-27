import assert from "node:assert/strict";
import test from "node:test";
import { csvCell, maskAuditValue, maskIpAddress } from "./sanitizer";

test("recursively masks sensitive audit fields", () => {
  assert.deepEqual(
    maskAuditValue({
      amount: 100,
      profile: { email: "student@example.test", token: "secret" },
    }),
    {
      amount: 100,
      profile: { email: "[MASKED]", token: "[MASKED]" },
    },
  );
  assert.equal(maskIpAddress("192.168.10.44"), "192.168.10.0/24");
});

test("CSV cells neutralize spreadsheet formulas", () => {
  assert.equal(csvCell("=HYPERLINK(\"https://evil\")"), "\"'=HYPERLINK(\"\"https://evil\"\")\"");
});
