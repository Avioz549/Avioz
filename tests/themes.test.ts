import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveTheme, themes } from "../lib/themes";
import { dataSchema, emptyData } from "../lib/finance";
test("existing dark and light preferences remain valid; new themes round trip", () => {
  for (const theme of themes) {
    const data = emptyData();
    data.profile.theme = theme.id;
    assert.equal(
      dataSchema.parse(JSON.parse(JSON.stringify(data))).profile.theme,
      theme.id,
    );
  }
  assert.equal(emptyData().profile.theme, "dark");
});
test("system preference follows the device without changing explicit themes", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("midnight", false), "midnight");
  assert.equal(resolveTheme("purple", true), "purple");
});
