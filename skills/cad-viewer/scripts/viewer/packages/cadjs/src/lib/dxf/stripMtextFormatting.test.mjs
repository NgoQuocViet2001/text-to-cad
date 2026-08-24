import test from "node:test";
import assert from "node:assert/strict";

import { stripMtextFormatting } from "./parseDxf.js";

const BS = String.fromCharCode(92);

// \p is paragraph PROPERTIES; \P is a paragraph BREAK. Matching \P
// case-insensitively consumed only the two characters of \p and left its
// payload in the engraved text.
test("paragraph properties are removed whole", () => {
  assert.equal(stripMtextFormatting(`${BS}pxqc;PART A`), "PART A");
  assert.equal(stripMtextFormatting(`${BS}pxi-2,l2,t2;Item`), "Item");
});

test("a paragraph break is still a newline", () => {
  assert.equal(stripMtextFormatting(`Line1${BS}PLine2`), "Line1\nLine2");
});

test("other inline property runs are unaffected", () => {
  assert.equal(stripMtextFormatting(`${BS}H2.5x;BIG`), "BIG");
  assert.equal(stripMtextFormatting(`${BS}C1;RED`), "RED");
});

test("plain text passes through", () => {
  assert.equal(stripMtextFormatting("plain"), "plain");
});
