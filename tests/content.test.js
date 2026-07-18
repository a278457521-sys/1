const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

const pdfCoreTitles = [
  "KISS原则", "第二帝国风格", "新艺术运动的平面设计", "亚瑟·马克穆多", "让·杜南", "雷蒙德·罗维",
  "乌尔姆设计学院", "系统设计原则", "布劳恩公司", "迪特·拉姆斯", "人体工程学", "国际主义风格", "设计伦理观念", "战后平面设计的发展", "纽约平面设计派",
  "后现代主义", "罗伯特·文丘里", "波普设计运动", "意大利激进设计运动", "孟菲斯集团", "阿基米亚工作室", "新德国设计", "高科技风格", "过渡高科技风格", "绿色设计",
  "概念车", "新能源汽车", "宝马汽车公司", "克里斯·班戈", "沃尔特·德·席尔瓦", "平尼法里纳设计事务所",
  "美国当代设计发展趋势", "IDEO设计事务所", "全设计", "德国设计特点", "青蛙设计公司与哈特穆特·艾斯林格", "薇薇安·韦斯特伍德", "欧内斯特·雷斯", "特伦斯·科兰", "意大利设计", "吉奥·庞蒂",
  "日本设计特点", "柳宗理", "剑持勇", "喜多俊之", "深泽直人", "片山正通", "龟仓雄策", "福田繁雄", "田中一光", "横尾忠则", "原研哉",
  "北欧设计", "阿纳·雅各布森", "汉斯·华格纳", "保罗·汉宁森", "维尔纳·潘顿", "梅嘉·伊索拉",
];

const pdfCoreChapters = [
  "第八章 战后现代设计与平面设计",
  "第九章 后现代主义设计",
  "第十章 战后汽车设计",
  "第十一章 当代各国设计",
];

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

function featurePoints(value) {
  const text = String(value || "").trim();
  const numbered = text.split(/[①②③④⑤⑥⑦⑧⑨⑩]/).map((part) => part.trim()).filter(Boolean);
  if (numbered.length >= 3) return numbered;
  return text.split(/[；;。]/).map((part) => part.trim()).filter((part) => part.length >= 8);
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

test("PDF核心扩展包含58个重点考点和四个新章节", () => {
  const data = loadData();
  const titles = new Set(data.items.map((item) => item.title));
  const missingTitles = pdfCoreTitles.filter((title) => !titles.has(title));
  const missingChapters = pdfCoreChapters.filter((chapter) => !data.chapters.includes(chapter));

  assert.equal(pdfCoreTitles.length, 58);
  assert.equal(missingTitles.length, 0, `缺少PDF核心考点：${missingTitles.join("、")}`);
  assert.equal(missingChapters.length, 0, `缺少PDF章节：${missingChapters.join("、")}`);
  assert.equal(data.items.length, 142, `题库总数应为142，实际为${data.items.length}`);
});

test("名词解释阅卷得分点展示全部核心特征", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const nounSource = functionSource(source, "nounAnswer", "essayAnswer");

  assert.equal(nounSource.includes("splitPoints(item.features).slice(0, 2)"), false, "核心特征仍只显示前两项");
  assert.equal(nounSource.includes("splitPoints(item.features).join"), true, "名词解释未合并展示全部核心特征");
});

test("所有考点至少包含三个明确且详细的核心特征", () => {
  const incomplete = loadData().items.filter((item) => {
    const length = String(item.features || "").replace(/\s/g, "").length;
    return length < 90 || featurePoints(item.features).length < 3;
  });

  assert.equal(incomplete.length, 0, `核心特征不完整：${incomplete.map((item) => item.title).join("、")}`);
});

test("德国工业同盟覆盖完整应试得分链条", () => {
  const item = loadData().items.find((entry) => entry.title === "德国工业同盟");
  assert.ok(item, "缺少德国工业同盟");
  assert.ok(featurePoints(item.features).length >= 5, "德国工业同盟核心特征少于5点");
  for (const keyword of ["政府", "艺术", "工业", "标准化", "企业", "科隆论战", "包豪斯"]) {
    assert.equal(item.features.includes(keyword), true, `德国工业同盟缺少关键词：${keyword}`);
  }
});
