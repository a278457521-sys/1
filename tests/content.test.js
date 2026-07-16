const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadData() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "data.js"), "utf8"), context);
  return context.window.DESIGN_HISTORY_DATA;
}

function functionSource(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start);
  assert.notEqual(start, -1, `找不到 ${name}()`);
  assert.notEqual(end, -1, `找不到 ${nextName}()`);
  return source.slice(start, end);
}

test("每个题库条目都配置真实代表作品", () => {
  const missing = loadData().items
    .filter((item) => !Array.isArray(item.works) || item.works.length === 0)
    .map((item) => item.title);

  assert.equal(missing.length, 0, `缺少代表作品：${missing.join("、")}`);
});

test("扩展思考使用完整原文而不是 compact 截断", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const reflectionSource = functionSource(source, "reflectionHtml", "nounAnswer");

  assert.equal(reflectionSource.includes("compact("), false, "扩展思考仍调用 compact()，答案会被省略");
  for (const field of ["item.background", "item.features", "item.impact", "compareWith.features", "compareWith.impact"]) {
    assert.equal(reflectionSource.includes(field), true, `扩展思考未使用完整字段：${field}`);
  }
});
