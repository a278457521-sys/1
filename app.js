(function () {
  "use strict";

  const data = window.DESIGN_HISTORY_DATA;
  if (!data || !Array.isArray(data.items)) {
    document.getElementById("answerSheet").innerHTML = '<div class="no-result"><h2>题库没有加载成功</h2><p>请确认 data.js 与 index.html 位于同一文件夹。</p></div>';
    return;
  }

  const items = data.items;
  const byId = new Map(items.map((item) => [item.id, item]));
  const state = {
    mode: "auto",
    currentItems: [],
    currentType: "noun",
    currentRubric: [],
    currentMaxScore: 5,
    currentAnswerTitle: "包豪斯",
    memory: false,
    mastered: new Set(readStorage("design-history-mastered", [])),
    recent: readStorage("design-history-recent", []),
  };

  const refs = {
    form: document.getElementById("searchForm"),
    input: document.getElementById("questionInput"),
    answer: document.getElementById("answerSheet"),
    chapterNav: document.getElementById("chapterNav"),
    exampleList: document.getElementById("exampleList"),
    masteredCount: document.getElementById("masteredCount"),
    progressTotal: document.getElementById("progressTotal"),
    progressBar: document.getElementById("progressBar"),
    masterButton: document.getElementById("masterButton"),
    memoryButton: document.getElementById("memoryButton"),
    randomButton: document.getElementById("randomButton"),
    recentList: document.getElementById("recentList"),
    toast: document.getElementById("toast"),
    dialog: document.getElementById("sourceDialog"),
    graderDialog: document.getElementById("graderDialog"),
    graderQuestionTitle: document.getElementById("graderQuestionTitle"),
    graderMaxScore: document.getElementById("graderMaxScore"),
    answerImageInput: document.getElementById("answerImageInput"),
    answerPreview: document.getElementById("answerPreview"),
    answerPreviewImage: document.getElementById("answerPreviewImage"),
    answerFileName: document.getElementById("answerFileName"),
    recognizeAnswerButton: document.getElementById("recognizeAnswerButton"),
    ocrProgress: document.getElementById("ocrProgress"),
    ocrStatus: document.getElementById("ocrStatus"),
    ocrProgressBar: document.getElementById("ocrProgressBar"),
    recognizedAnswerText: document.getElementById("recognizedAnswerText"),
    recognizedCharCount: document.getElementById("recognizedCharCount"),
    gradeAnswerButton: document.getElementById("gradeAnswerButton"),
    gradingResult: document.getElementById("gradingResult"),
    gradingScore: document.getElementById("gradingScore"),
    gradingScoreMax: document.getElementById("gradingScoreMax"),
    gradingVerdict: document.getElementById("gradingVerdict"),
    gradingBreakdown: document.getElementById("gradingBreakdown"),
    gradingFinalComment: document.getElementById("gradingFinalComment"),
  };

  const keywordList = [
    "艺术与技术统一", "形式服从功能", "形式追随功能", "设计为大众服务", "标准化", "批量生产",
    "机械化", "功能主义", "理性主义", "民主化", "新材料", "新技术", "手工艺", "自然主义",
    "几何", "装饰", "材料本质", "环境协调", "整体统一", "少即是多", "有机建筑", "现代主义",
  ];

  const examples = [
    "名词解释：包豪斯",
    "简述装饰艺术运动",
    "比较新艺术运动与工艺美术运动",
  ];

  function readStorage(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* local files may disable storage */ }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeBasic(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[·•\s（）()《》“”"'：:，,。！？!?、—\-]/g, "");
  }

  function normalize(value) {
    return normalizeBasic(value)
      .replace(/请|试|名词解释|简述|简答题|论述|分析|谈谈|说明|比较|对比|异同|区别|联系|特征|特点|影响|意义|历史作用|如何理解|什么是/g, "");
  }

  function bigrams(value) {
    if (value.length < 2) return value ? [value] : [];
    const result = [];
    for (let index = 0; index < value.length - 1; index += 1) result.push(value.slice(index, index + 2));
    return result;
  }

  function dice(left, right) {
    const a = bigrams(left);
    const b = bigrams(right);
    if (!a.length || !b.length) return left === right ? 1 : 0;
    const counts = new Map();
    a.forEach((gram) => counts.set(gram, (counts.get(gram) || 0) + 1));
    let overlap = 0;
    b.forEach((gram) => {
      const count = counts.get(gram) || 0;
      if (count > 0) { overlap += 1; counts.set(gram, count - 1); }
    });
    return (2 * overlap) / (a.length + b.length);
  }

  function itemNames(item) {
    return [item.title].concat(item.aliases || []).map(normalizeBasic).filter(Boolean);
  }

  function rankItems(question) {
    const raw = normalize(question);
    const rawBasic = normalizeBasic(question);
    return items.map((item) => {
      const names = itemNames(item);
      let score = Math.max(...names.map((name) => dice(raw, normalize(name))), 0);
      let direct = false;
      names.forEach((name) => {
        if (rawBasic === name) { score += 10; direct = true; }
        else if (rawBasic.includes(name)) { score += 5; direct = true; }
        else if (raw === normalize(name)) { score += 2; }
      });
      if (item.frequency === "high") score += 0.03;
      return { item, score, direct };
    }).sort((a, b) => b.score - a.score);
  }

  function mentionedItems(question) {
    const raw = normalizeBasic(question);
    const found = [];
    items.forEach((item) => {
      if (/(比较|对比|异同|区别)/.test(question) && /对比|比较/.test(item.title)) return;
      const matchedName = itemNames(item).sort((a, b) => b.length - a.length).find((name) => name.length >= 2 && raw.includes(name));
      if (matchedName) found.push({ item, length: matchedName.length, index: raw.indexOf(matchedName) });
    });
    found.sort((a, b) => a.index - b.index || b.length - a.length);
    const unique = [];
    found.forEach((entry) => {
      if (!unique.some((existing) => existing.id === entry.item.id || normalizeBasic(existing.title).includes(normalizeBasic(entry.item.title)))) unique.push(entry.item);
    });
    return unique;
  }

  function detectType(question, matches) {
    if (state.mode !== "auto") return state.mode;
    if (/(比较|对比|异同|区别|联系|与.+(?:运动|风格|主义|学派|设计|包豪斯))/.test(question) && matches.length >= 2) return "compare";
    if (/(简述|简答|论述|分析|特点|特征|影响|意义|历史作用)/.test(question)) return "essay";
    return "noun";
  }

  function highlight(value) {
    let html = escapeHtml(value);
    keywordList.sort((a, b) => b.length - a.length).forEach((keyword) => {
      html = html.replaceAll(keyword, `<mark>${keyword}</mark>`);
    });
    return html;
  }

  function splitPoints(value) {
    const text = String(value || "").trim();
    const numberedStart = text.search(/[①②③④⑤⑥⑦⑧⑨⑩]/);
    const pointSource = numberedStart >= 0 ? text.slice(numberedStart) : text;
    let parts = pointSource.split(/[①②③④⑤⑥⑦⑧⑨⑩]/).map((part) => part.replace(/^[；;。]\s*/, "").replace(/[；;。]\s*$/, "").trim()).filter(Boolean);
    if (parts.length <= 1) {
      parts = text.split(/[；;]/).map((part) => part.trim()).filter(Boolean);
    }
    if (parts.length <= 1) {
      parts = text.split(/。/).map((part) => part.trim()).filter((part) => part.length > 5);
    }
    return parts.length ? parts : [text];
  }

  function wordsCount(text) {
    return String(text || "").replace(/\s/g, "").length;
  }

  function compact(value, limit) {
    const text = String(value || "").trim();
    if (text.length <= limit) return text;
    const slice = text.slice(0, limit);
    const punctuation = Math.max(slice.lastIndexOf("。"), slice.lastIndexOf("；"));
    return `${slice.slice(0, punctuation > limit * .58 ? punctuation + 1 : limit)}…`;
  }

  function worksLine(item) {
    if (!item.works || !item.works.length) return "";
    return `<p class="work-line memory-target"><b>代表作：</b>${item.works.map(escapeHtml).join("、")}</p>`;
  }

  function headHtml(title, typeLabel, item, question, count) {
    const matchText = normalize(question) !== normalize(title) ? `<p class="match-note">题目“${escapeHtml(question)}”已匹配考点：<b>${escapeHtml(title)}</b></p>` : "";
    const frequency = item ? item.frequency : "normal";
    const frequencyLabel = frequency === "high" ? "高频考点" : frequency === "medium" ? "中频考点" : "基础考点";
    return `<header class="answer-head">
      <div class="answer-meta">
        <span>${escapeHtml(typeLabel)}</span><span>${typeLabel === "名词解释" ? "建议 5 分钟" : "建议 15 分钟"}</span>
        ${item ? `<span class="frequency-tag ${frequency}">${frequencyLabel}</span>` : ""}
        <span>${escapeHtml(item ? item.chapter : "跨章节比较")}</span><span>约 ${count} 字</span>
      </div>
      <div class="answer-title-row">
        <h2 class="frequency-title ${frequency}">${escapeHtml(title)}</h2>
        <div class="answer-actions"><button type="button" data-action="copy">复制答案</button><button type="button" data-action="print">打印</button></div>
      </div>${matchText}
    </header>`;
  }

  function sectionHtml(index, title, subtitle, body) {
    return `<section class="answer-section memory-target"><div class="section-heading"><span>${index}</span><h3>${escapeHtml(title)}</h3>${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ""}</div>${body}</section>`;
  }

  function scoreHtml(points) {
    return sectionHtml("✓", "阅卷得分点", "分值为按 5 分/15 分题型拆解的参考赋分", `<div class="score-list">${points.map((point, index) => `<div class="score-item"><b>0${index + 1}</b><span>${highlight(point.text)}</span><em>${escapeHtml(point.score)}分</em></div>`).join("")}</div>`);
  }

  function memoryMapHtml(title, branches, total) {
    const accessible = branches.map((branch) => `${branch.label}${branch.score}分：${branch.text}`).join("；");
    return sectionHtml("图", "记忆点思维导图", `先记三条主干，再把关键词扩成完整句；参考总分 ${total} 分`, `<div class="memory-map" role="img" aria-label="${escapeHtml(`${title}记忆导图。${accessible}`)}">
      <div class="memory-root"><b>${escapeHtml(title)}</b><small>${total} 分结构</small></div>
      <div class="memory-branches">${branches.map((branch) => `<article class="memory-node ${escapeHtml(branch.kind)}"><div><strong>${escapeHtml(branch.label)}</strong><span>${escapeHtml(branch.score)} 分</span></div><p>${highlight(compact(branch.text, 62))}</p></article>`).join("")}</div>
    </div>`);
  }

  function visualHtml(item) {
    if (!item.image) return "";
    return `<figure class="work-visual memory-target">
      <img src="${escapeHtml(item.image.url)}" alt="${escapeHtml(item.title)}相关代表作品" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'">
      <figcaption class="work-caption"><small>代表作品 · 形式分析</small><h3>${escapeHtml((item.works && item.works[0]) || item.title)}</h3><p>${escapeHtml(item.image.caption)}</p><a href="${escapeHtml(item.image.url.split("?width")[0])}" target="_blank" rel="noreferrer">查看图像来源</a></figcaption>
    </figure>`;
  }

  function reflectionHtml(item, compareWith) {
    const questions = compareWith
      ? [`如果把两者放进“手工艺—工业化”的坐标中，它们分别位于什么位置？`, `两者对当代视觉传达设计最值得保留的启示分别是什么？`]
      : [`${item.title}如何处理功能、技术与审美之间的关系？`, `如果用一个当代视觉传达案例解释${item.title}，你会选择什么，为什么？`];
    const answers = compareWith
      ? [
          {
            analysis: `判断两者是否接受机器生产，再比较其材料、形式与服务对象。${item.title}强调${compact(item.features, 55)}；${compareWith.title}强调${compact(compareWith.features, 55)}。`,
            answer: `${item.title}与${compareWith.title}处在现代设计转型的不同位置：前者体现${compact(item.features, 48)}，后者体现${compact(compareWith.features, 48)}。二者共同推动设计回应新的社会需求，但对手工和工业生产的态度及实现路径并不相同。`,
          },
          {
            analysis: `从“可继承原则”和“应避免局限”两方面回答，并联系视觉传达中的媒介、受众与生产效率。`,
            answer: `当代视觉传达可从${item.title}吸收${compact(item.impact, 45)}，从${compareWith.title}吸收${compact(compareWith.impact, 45)}。实践中应兼顾文化表达、媒介技术与大众传播，避免只追求形式或脱离真实使用场景。`,
          },
        ]
      : [
          {
            analysis: `先从背景确认它面对的问题，再用核心特征说明方法，最后以影响评价功能、技术与审美是否统一。`,
            answer: `${item.title}产生于${compact(item.background, 52)}。它通过${compact(item.features, 72)}来协调功能、技术和审美，并以${compact(item.impact, 55)}确立其设计史意义。`,
          },
          {
            analysis: `选择一个品牌视觉系统、公共信息设计或数字界面，从功能、形式、媒介和受众四方面对应考点。`,
            answer: `可选择当代公共信息视觉系统作为案例：先以清晰层级满足识别功能，再利用数字媒介和标准化组件提高传播效率，同时保留符合文化语境的视觉特征。这与${item.title}所体现的${compact(item.features, 55)}形成对应。`,
          },
        ];
    return sectionHtml("?", "扩展思考", "先独立口述，再展开参考分析核对", `<ol class="reflection-list">${questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ol><button class="reflection-toggle" type="button" data-reflection-toggle aria-expanded="false">查看答案</button><div class="reflection-answers" hidden>${answers.map((answer, index) => `<article><h4>思考 ${index + 1}</h4><p><b>分析：</b>${highlight(answer.analysis)}</p><p><b>参考解答：</b>${highlight(answer.answer)}</p></article>`).join("")}</div>`);
  }

  function nounAnswer(item, question) {
    const paragraph = `${item.background}${item.features}${item.impact}`;
    const count = wordsCount(paragraph) + wordsCount((item.works || []).join(""));
    const points = [
      { text: `背景定位：${item.background}`, score: "1.5" },
      { text: `核心特征：${splitPoints(item.features).slice(0, 2).join("；")}`, score: "2" },
      { text: `影响与地位：${item.impact}`, score: item.works && item.works.length ? "1" : "1.5" },
    ];
    if (item.works && item.works.length) points.push({ text: `代表作：${item.works.join("、")}`, score: "0.5" });
    const mapBranches = [
      { kind: "background", label: "背景", score: "1.5", text: item.background },
      { kind: "features", label: "核心特征", score: "2", text: item.features },
      { kind: "impact", label: "影响", score: item.works && item.works.length ? "1 + 作品0.5" : "1.5", text: `${item.impact}${item.works && item.works.length ? ` 代表作：${item.works.join("、")}` : ""}` },
    ];
    state.currentRubric = points;
    state.currentMaxScore = 5;
    state.currentAnswerTitle = item.title;
    refs.answer.innerHTML = headHtml(item.title, "名词解释", item, question, count)
      + sectionHtml("01", "考场成稿", "总—分—总，正文保持为一个完整段落", `<p class="exam-paragraph">${highlight(paragraph)}</p>${worksLine(item)}`)
      + visualHtml(item)
      + scoreHtml(points)
      + memoryMapHtml(item.title, mapBranches, 5)
      + reflectionHtml(item);
  }

  function essayAnswer(item, question) {
    const features = splitPoints(item.features);
    const combined = `${item.background}${item.features}${item.impact}`;
    const points = [
      { text: `概念与背景：${item.background}`, score: "3" },
      { text: `核心主张：${features.slice(0, 2).join("；")}`, score: "4" },
      { text: `形式与方法：${features.slice(2).join("；") || item.features}`, score: "3" },
      { text: `影响与地位：${item.impact}`, score: item.works && item.works.length ? "3" : "5" },
    ];
    if (item.works && item.works.length) points.push({ text: `代表作与总结：${item.works.join("、")}`, score: "2" });
    const mapBranches = [
      { kind: "background", label: "背景与定性", score: "3", text: item.background },
      { kind: "features", label: "核心特征", score: "7", text: item.features },
      { kind: "impact", label: "影响与作品", score: "5", text: `${item.impact}${item.works && item.works.length ? ` 代表作：${item.works.join("、")}` : ""}` },
    ];
    state.currentRubric = points;
    state.currentMaxScore = 15;
    state.currentAnswerTitle = `简述${item.title}`;
    refs.answer.innerHTML = headHtml(`简述${item.title}`, "简答题 · 单一考点", item, question, wordsCount(combined) + 120)
      + sectionHtml("01", "概念与背景", "先用名词解释完成定性", `<p class="exam-paragraph">${highlight(item.background)}</p>${worksLine(item)}`)
      + sectionHtml("02", "主要特征", "按序号展开，每一点先写关键词", `<ol class="point-list">${features.map((point) => `<li>${highlight(point)}</li>`).join("")}</ol>`)
      + sectionHtml("03", "影响与设计史地位", "回到工业化、现代设计体系或视觉语言评价", `<p class="exam-paragraph">${highlight(item.impact)}由此可见，${escapeHtml(item.title)}不仅形成了鲜明的形式语言，也在现代设计由观念转向制度、生产与生活方式的进程中占有重要位置。</p>`)
      + visualHtml(item)
      + scoreHtml(points)
      + memoryMapHtml(item.title, mapBranches, 15)
      + reflectionHtml(item);
  }

  function comparisonAnswer(left, right, question) {
    const leftFeatures = splitPoints(left.features);
    const rightFeatures = splitPoints(right.features);
    const title = `比较${left.title}与${right.title}`;
    const leftBackground = compact(left.background, 68);
    const rightBackground = compact(right.background, 68);
    const commonPoints = [
      `两者都处在现代设计形成与转型的历史链条中，回应了各自时代的社会、技术与审美问题。`,
      `两者都试图重建艺术、设计与日常生活的关系，并通过人物、作品或组织影响后续实践。`,
    ];
    const differences = [
      ["核心主张", compact(leftFeatures.slice(0, 2).join("；"), 48), compact(rightFeatures.slice(0, 2).join("；"), 48)],
      ["形式方法", compact(leftFeatures.slice(2).join("；") || left.features, 48), compact(rightFeatures.slice(2).join("；") || right.features, 48)],
      ["影响地位", compact(left.impact, 48), compact(right.impact, 48)],
    ];
    const conclusion = `${left.title}方面，${compact(left.impact, 42)}${right.title}方面，${compact(right.impact, 42)}二者说明现代设计始终在功能与装饰、手工与机器、个性与社会服务之间调整。对当代视觉传达而言，既要尊重媒介生产，也要回应使用者与文化语境。`;
    const count = wordsCount(leftBackground + rightBackground + commonPoints.join("") + differences.flat().join("") + conclusion);
    const scorePoints = [
      { text: `双方背景：${left.title}——${leftBackground}；${right.title}——${rightBackground}`, score: "3" },
      { text: `代表作：${left.title}——${(left.works || []).join("、") || "相关代表作品"}；${right.title}——${(right.works || []).join("、") || "相关代表作品"}`, score: "1" },
      { text: `相同点：${commonPoints.join("；")}`, score: "3" },
      { text: `不同点：${differences.map((row) => `${row[0]}方面，${left.title}${row[1]}；${right.title}${row[2]}`).join("；")}`, score: "5" },
      { text: `影响、联系与启示：${conclusion}`, score: "3" },
    ];
    const compareMeta = {
      chapter: "跨章节比较",
      frequency: left.frequency === "high" || right.frequency === "high" ? "high" : left.frequency === "medium" || right.frequency === "medium" ? "medium" : "normal",
    };
    const mapBranches = [
      { kind: "background", label: "双方背景与作品", score: "4", text: `${left.title}：${leftBackground}；${right.title}：${rightBackground}` },
      { kind: "features", label: "同异点", score: "8", text: `相同点抓共同历史回应；不同点比较核心主张、形式方法与生产态度。` },
      { kind: "impact", label: "影响与启示", score: "3", text: conclusion },
    ];
    state.currentRubric = scorePoints;
    state.currentMaxScore = 15;
    state.currentAnswerTitle = title;
    refs.answer.innerHTML = headHtml(title, "简答题 · 比较题", compareMeta, question, count)
      + sectionHtml("01", "分别解释背景", "先各自定性，再进入比较", `<div class="compare-intros"><article><h4>A · ${escapeHtml(left.title)}</h4><p>${highlight(leftBackground)}</p>${left.works && left.works.length ? `<span class="mini-work">代表作：${left.works.map(escapeHtml).join("、")}</span>` : ""}</article><article><h4>B · ${escapeHtml(right.title)}</h4><p>${highlight(rightBackground)}</p>${right.works && right.works.length ? `<span class="mini-work">代表作：${right.works.map(escapeHtml).join("、")}</span>` : ""}</article></div>`)
      + sectionHtml("02", "相同点", "先求同，建立共同的设计史坐标", `<ol class="point-list">${commonPoints.map((point) => `<li>${highlight(point)}</li>`).join("")}</ol>`)
      + sectionHtml("03", "不同点", "从主张、形式方法和影响三个维度对照", `<div class="difference-table">${differences.map((row) => `<div class="difference-row"><b>${escapeHtml(row[0])}</b><span>${highlight(row[1])}</span><span>${highlight(row[2])}</span></div>`).join("")}</div>`)
      + sectionHtml("04", "影响、联系与总结启示", "最后回扣现代设计的发展逻辑", `<p class="exam-paragraph">${highlight(conclusion)}</p>`)
      + visualHtml(left.image ? left : right)
      + scoreHtml(scorePoints)
      + memoryMapHtml(title, mapBranches, 15)
      + reflectionHtml(left, right);
  }

  function noResult(question, ranked) {
    refs.answer.innerHTML = `<div class="no-result"><p class="dialog-eyebrow">OUTSIDE LOCAL NOTES</p><h2>本地资料暂未直接收录这道题</h2><p>“${escapeHtml(question)}”没有达到可靠匹配阈值。为避免虚构答案，请从下列相近考点进入，或换用人物、运动、风格、作品的准确名称。</p><div class="suggestions">${ranked.slice(0, 4).map(({ item }) => `<button class="suggestion-button" type="button" data-topic="${item.id}"><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.chapter)}</small></button>`).join("")}</div></div>`;
    state.currentItems = [];
    bindAnswerActions();
  }

  function answerQuestion(question, forcedItem) {
    const cleanQuestion = String(question || "").trim();
    if (!cleanQuestion && !forcedItem) { showToast("请先输入一道题目"); refs.input.focus(); return; }
    const mentions = mentionedItems(cleanQuestion);
    const ranked = rankItems(cleanQuestion);
    const type = detectType(cleanQuestion, mentions);

    if (type === "compare") {
      const candidates = mentions.length >= 2 ? mentions.slice(0, 2) : ranked.slice(0, 2).map((entry) => entry.item);
      if (candidates.length >= 2 && (mentions.length >= 2 || ranked[0].score > 0.42)) {
        state.currentItems = candidates;
        state.currentType = "compare";
        comparisonAnswer(candidates[0], candidates[1], cleanQuestion);
        recordRecent(candidates);
      } else {
        noResult(cleanQuestion, ranked);
        return;
      }
    } else {
      const result = forcedItem ? { item: forcedItem, score: 9, direct: true } : ranked[0];
      if (!result || (!result.direct && result.score < 0.42)) { noResult(cleanQuestion, ranked); return; }
      state.currentItems = [result.item];
      state.currentType = type;
      if (type === "essay") essayAnswer(result.item, cleanQuestion);
      else nounAnswer(result.item, cleanQuestion);
      recordRecent([result.item]);
    }

    state.memory = false;
    refs.answer.classList.remove("memory-mode");
    refs.memoryButton.classList.remove("active");
    refs.memoryButton.querySelector("span").textContent = "背诵遮挡";
    bindAnswerActions();
    syncMasterButton();
    setActiveChapter(state.currentItems[0] && state.currentItems[0].chapter);
    if (refs.graderDialog.open) syncGraderContext();
    refs.answer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function recordRecent(current) {
    current.forEach((item) => {
      state.recent = [item.id].concat(state.recent.filter((id) => id !== item.id)).slice(0, 5);
    });
    saveStorage("design-history-recent", state.recent);
    renderRecent();
  }

  function bindAnswerActions() {
    refs.answer.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (button.dataset.action === "print") { window.print(); return; }
        const text = refs.answer.innerText.replace(/复制答案\s*打印/, "").trim();
        try { await navigator.clipboard.writeText(text); showToast("答案已复制"); }
        catch (error) { showToast("当前浏览器未开放复制权限"); }
      });
    });
    refs.answer.querySelectorAll("[data-topic]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = byId.get(button.dataset.topic);
        if (!item) return;
        refs.input.value = `名词解释：${item.title}`;
        answerQuestion(refs.input.value, item);
      });
    });
    refs.answer.querySelectorAll("[data-reflection-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const answers = button.nextElementSibling;
        if (!answers) return;
        const willOpen = answers.hidden;
        answers.hidden = !willOpen;
        button.setAttribute("aria-expanded", String(willOpen));
        button.textContent = willOpen ? "收起答案" : "查看答案";
      });
    });
  }

  function renderChapters() {
    refs.chapterNav.innerHTML = data.chapters.map((chapter, index) => {
      const count = items.filter((item) => item.chapter === chapter).length;
      const name = chapter.replace(/^第[一二三四五六七八九十]+章\s*/, "");
      return `<button class="chapter-button" type="button" data-chapter="${escapeHtml(chapter)}"><span class="chapter-number">${String(index + 1).padStart(2, "0")}</span><span class="chapter-name">${escapeHtml(name)}</span><span class="chapter-count">${count}</span></button>`;
    }).join("");
    refs.chapterNav.querySelectorAll(".chapter-button").forEach((button) => {
      button.addEventListener("click", () => {
        const chapterItems = items.filter((item) => item.chapter === button.dataset.chapter);
        const item = chapterItems.find((entry) => entry.frequency === "high") || chapterItems[0];
        refs.input.value = `名词解释：${item.title}`;
        answerQuestion(refs.input.value, item);
      });
    });
  }

  function setActiveChapter(chapter) {
    refs.chapterNav.querySelectorAll(".chapter-button").forEach((button) => button.classList.toggle("active", button.dataset.chapter === chapter));
  }

  function renderExamples() {
    refs.exampleList.innerHTML = examples.map((example) => `<button class="example-chip" type="button">${escapeHtml(example)}</button>`).join("");
    refs.exampleList.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      refs.input.value = button.textContent;
      answerQuestion(refs.input.value);
    }));
  }

  function renderRecent() {
    const recentItems = state.recent.map((id) => byId.get(id)).filter(Boolean);
    refs.recentList.innerHTML = recentItems.length ? recentItems.map((item) => `<button class="recent-button" type="button" data-topic="${item.id}">${escapeHtml(item.title)}</button>`).join("") : '<span class="muted">尚无记录</span>';
    refs.recentList.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      const item = byId.get(button.dataset.topic);
      refs.input.value = `名词解释：${item.title}`;
      answerQuestion(refs.input.value, item);
    }));
  }

  function renderProgress() {
    refs.masteredCount.textContent = state.mastered.size;
    refs.progressTotal.textContent = items.length;
    refs.progressBar.style.width = `${Math.min(100, (state.mastered.size / items.length) * 100)}%`;
  }

  function syncMasterButton() {
    const ids = state.currentItems.map((item) => item.id);
    const mastered = ids.length > 0 && ids.every((id) => state.mastered.has(id));
    refs.masterButton.classList.toggle("active", mastered);
    refs.masterButton.querySelector("span").textContent = mastered ? "已掌握" : "标记已掌握";
  }

  function showToast(message) {
    refs.toast.textContent = message;
    refs.toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => refs.toast.classList.remove("show"), 1800);
  }

  function syncGraderContext() {
    refs.graderQuestionTitle.textContent = state.currentAnswerTitle;
    refs.graderMaxScore.textContent = `${state.currentMaxScore === 5 ? "名词解释" : "简答题"} · 满分 ${state.currentMaxScore} 分`;
    refs.gradingScoreMax.textContent = `/ ${state.currentMaxScore}`;
    refs.gradingResult.hidden = true;
  }

  function graderNormalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/阅卷得分点|背景定位|概念与背景|核心特征|核心主张|形式与方法|影响与地位|影响、联系与启示|双方背景|相同点|不同点|代表作与总结|代表作/g, "")
      .replace(/[\s\n\r\t·•（）()《》“”"'：:，,。！？!?、；;—\-]/g, "");
  }

  function bigramCoverage(answer, expected) {
    const ignored = new Set(["设计", "艺术", "运动", "影响", "特征", "方面", "作品", "代表", "进行", "主要"]);
    const expectedGrams = Array.from(new Set(bigrams(expected).filter((gram) => !ignored.has(gram))));
    if (!expectedGrams.length) return answer.includes(expected) ? 1 : 0;
    const answerGrams = new Set(bigrams(answer));
    return expectedGrams.filter((gram) => answerGrams.has(gram)).length / expectedGrams.length;
  }

  function expectedTerms(pointText) {
    const vocabulary = keywordList.concat([
      "德国", "英国", "法国", "美国", "意大利", "欧洲", "工业革命", "社会服务", "大众服务",
      "功能优先", "艺术与工艺", "历史风格", "新材料", "钢铁", "玻璃", "几何造型", "自然曲线",
      "教学体系", "初步课程", "形式服从功能", "整体设计", "机器美学", "国际风格", "视觉传达",
    ]);
    const isWorkPoint = /代表作/.test(pointText);
    state.currentItems.forEach((item) => {
      if (!isWorkPoint) vocabulary.push(item.title, ...(item.aliases || []));
      vocabulary.push(...(item.works || []));
    });
    const dates = String(pointText).match(/(?:\d{4}(?:—|-|至)?\d{0,4}年|\d{1,2}世纪|[一二三四五六七八九十]+世纪)/g) || [];
    return Array.from(new Set(vocabulary.concat(dates).filter((term) => term && term.length >= 2 && pointText.includes(term)))).slice(0, 10);
  }

  function roundToHalf(value) {
    return Math.round(value * 2) / 2;
  }

  function gradeRubricPoint(answerText, point) {
    const expected = graderNormalize(point.text);
    const answer = graderNormalize(answerText);
    const maxScore = Number(point.score);
    const terms = expectedTerms(point.text);
    const hitTerms = terms.filter((term) => answer.includes(graderNormalize(term)));
    const missingTerms = terms.filter((term) => !answer.includes(graderNormalize(term)));
    const phraseCoverage = bigramCoverage(answer, expected);
    const termCoverage = terms.length ? hitTerms.length / terms.length : phraseCoverage;
    const combined = phraseCoverage * .68 + termCoverage * .32;

    let factor = 0;
    if (combined >= .72) factor = 1;
    else if (combined >= .52) factor = .8;
    else if (combined >= .35) factor = .6;
    else if (combined >= .2) factor = .4;
    else if (combined >= .1) factor = .2;

    let awarded = maxScore <= .5 ? (combined >= .28 ? maxScore : 0) : roundToHalf(maxScore * factor);
    awarded = Math.min(maxScore, awarded);
    const ratio = maxScore ? awarded / maxScore : 0;
    const label = point.text.split(/[：:]/)[0] || "本项要点";
    let reason = "";
    if (ratio >= .99) {
      reason = `本项关键信息完整，概念与史实表述能够支撑满分。`;
    } else if (ratio >= .55) {
      reason = `已写到${hitTerms.length ? `“${hitTerms.slice(0, 4).join("、")}”` : "部分核心内容"}，但${missingTerms.length ? `“${missingTerms.slice(0, 4).join("、")}”` : "论述完整度和准确性"}不足。`;
    } else if (ratio > 0) {
      reason = `仅有零散相关表述，尚未形成完整得分点；应补写：${compact(point.text.replace(/^.*?[：:]/, ""), 70)}`;
    } else {
      reason = `答卷中未识别到本项有效内容。缺失要点：${compact(point.text.replace(/^.*?[：:]/, ""), 70)}`;
    }
    return { label, maxScore, awarded, hitTerms, missingTerms, reason, ratio, combined };
  }

  function gradeCurrentAnswer() {
    const answerText = refs.recognizedAnswerText.value.trim();
    if (!answerText) { showToast("请先识别或输入答卷内容"); refs.recognizedAnswerText.focus(); return; }
    if (!state.currentRubric.length) { showToast("当前题目没有可用评分表"); return; }

    const results = state.currentRubric.map((point) => gradeRubricPoint(answerText, point));
    const total = Math.min(state.currentMaxScore, results.reduce((sum, result) => sum + result.awarded, 0));
    const lost = Math.max(0, state.currentMaxScore - total);
    const ratio = total / state.currentMaxScore;
    const weakPoints = results.filter((result) => result.awarded < result.maxScore).map((result) => result.label);
    let verdict = "";
    if (ratio >= .9) verdict = "史实和结构较完整，答题意识清楚，已达到高分档。";
    else if (ratio >= .75) verdict = "主体内容准确，但个别给分点展开不足，属于中上档答案。";
    else if (ratio >= .6) verdict = "基本概念能够成立，但要点覆盖不全，仍有明显提分空间。";
    else verdict = "有效得分点较少，需要先补齐背景、核心特征和影响三条主干。";

    refs.gradingScore.textContent = Number.isInteger(total) ? String(total) : total.toFixed(1);
    refs.gradingScoreMax.textContent = `/ ${state.currentMaxScore}`;
    refs.gradingVerdict.textContent = verdict;
    refs.gradingBreakdown.innerHTML = results.map((result, index) => {
      const status = result.ratio >= .99 ? "full" : result.ratio > 0 ? "partial" : "missing";
      const hits = result.hitTerms.length ? `命中：${result.hitTerms.slice(0, 5).join("、")}` : "未形成可确认的关键词命中";
      return `<article class="grading-point ${status}"><h4>得分点 ${index + 1} · ${escapeHtml(result.label)}</h4><div class="grading-point-score">${result.awarded}<small>/ ${result.maxScore} 分</small></div><p><b>${escapeHtml(hits)}</b><br>${escapeHtml(result.reason)}</p></article>`;
    }).join("");
    refs.gradingFinalComment.innerHTML = `<h3>阅卷总评</h3><p>本题失分 <b>${lost}</b> 分。${weakPoints.length ? `主要缺失在“${escapeHtml(weakPoints.join("、"))}”。` : "各项得分点均已覆盖。"}${answerText.length < (state.currentMaxScore === 5 ? 140 : 420) ? " 当前答案篇幅偏短，容易导致背景或影响论证不充分。" : " 篇幅基本符合题型要求。"}建议对照记忆点思维导图，优先补齐缺失分值最高的一项。</p>`;
    refs.gradingResult.hidden = false;
    refs.gradingResult.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function recognizeAnswerImage() {
    const file = refs.answerImageInput.files && refs.answerImageInput.files[0];
    if (!file) { showToast("请先选择答卷照片"); return; }
    if (!window.Tesseract) {
      refs.ocrProgress.hidden = false;
      refs.ocrStatus.textContent = "OCR 组件未能加载，请直接输入或粘贴答卷文字";
      return;
    }
    refs.recognizeAnswerButton.disabled = true;
    refs.ocrProgress.hidden = false;
    refs.ocrProgressBar.style.width = "0%";
    const statusText = {
      "loading tesseract core": "加载识别核心",
      "initializing tesseract": "初始化识别器",
      "loading language traineddata": "加载中文语言包",
      "initializing api": "初始化中文识别",
      "recognizing text": "识别手写内容",
    };
    try {
      const result = await window.Tesseract.recognize(file, "chi_sim+eng", {
        workerPath: "vendor/tesseract-worker.min.js",
        langPath: "https://tessdata.projectnaptha.com/4.0.0",
        corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1",
        logger(message) {
          const percent = Math.round((message.progress || 0) * 100);
          refs.ocrStatus.textContent = `${statusText[message.status] || "处理中"}${percent ? ` · ${percent}%` : ""}`;
          refs.ocrProgressBar.style.width = `${percent}%`;
        },
      });
      refs.recognizedAnswerText.value = (result.data && result.data.text ? result.data.text : "").trim();
      refs.recognizedCharCount.textContent = `${refs.recognizedAnswerText.value.replace(/\s/g, "").length} 字`;
      refs.ocrStatus.textContent = "识别完成，请先校对文字再阅卷";
      refs.ocrProgressBar.style.width = "100%";
      showToast("答卷识别完成");
    } catch (error) {
      refs.ocrStatus.textContent = "识别失败，请换一张清晰照片或直接输入文字";
      refs.ocrProgressBar.style.width = "0%";
    } finally {
      refs.recognizeAnswerButton.disabled = false;
    }
  }

  refs.form.addEventListener("submit", (event) => {
    event.preventDefault();
    answerQuestion(refs.input.value);
  });

  document.querySelectorAll(".mode").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      document.querySelectorAll(".mode").forEach((entry) => entry.classList.toggle("active", entry === button));
      if (refs.input.value.trim()) answerQuestion(refs.input.value);
    });
  });

  refs.memoryButton.addEventListener("click", () => {
    if (!state.currentItems.length) { showToast("请先生成一道答案"); return; }
    state.memory = !state.memory;
    refs.answer.classList.toggle("memory-mode", state.memory);
    refs.memoryButton.classList.toggle("active", state.memory);
    refs.memoryButton.querySelector("span").textContent = state.memory ? "显示关键词" : "背诵遮挡";
  });

  refs.masterButton.addEventListener("click", () => {
    if (!state.currentItems.length) { showToast("请先生成一道答案"); return; }
    const ids = state.currentItems.map((item) => item.id);
    const allMastered = ids.every((id) => state.mastered.has(id));
    ids.forEach((id) => allMastered ? state.mastered.delete(id) : state.mastered.add(id));
    saveStorage("design-history-mastered", Array.from(state.mastered));
    renderProgress();
    syncMasterButton();
    showToast(allMastered ? "已移出掌握清单" : "已记录为掌握");
  });

  refs.randomButton.addEventListener("click", () => {
    const pool = items.filter((item) => item.frequency === "high" && !state.currentItems.some((current) => current.id === item.id));
    const item = pool[Math.floor(Math.random() * pool.length)] || items[Math.floor(Math.random() * items.length)];
    refs.input.value = `名词解释：${item.title}`;
    state.mode = "auto";
    document.querySelectorAll(".mode").forEach((button) => button.classList.toggle("active", button.dataset.mode === "auto"));
    answerQuestion(refs.input.value, item);
  });

  document.getElementById("openGraderButton").addEventListener("click", () => {
    syncGraderContext();
    refs.graderDialog.showModal();
  });
  document.getElementById("closeGraderDialog").addEventListener("click", () => refs.graderDialog.close());
  refs.graderDialog.addEventListener("click", (event) => { if (event.target === refs.graderDialog) refs.graderDialog.close(); });

  refs.answerImageInput.addEventListener("change", () => {
    const file = refs.answerImageInput.files && refs.answerImageInput.files[0];
    if (state.answerPreviewUrl) URL.revokeObjectURL(state.answerPreviewUrl);
    if (!file) {
      refs.answerPreview.hidden = true;
      refs.recognizeAnswerButton.disabled = true;
      return;
    }
    state.answerPreviewUrl = URL.createObjectURL(file);
    refs.answerPreviewImage.src = state.answerPreviewUrl;
    refs.answerFileName.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    refs.answerPreview.hidden = false;
    refs.recognizeAnswerButton.disabled = false;
    refs.ocrProgress.hidden = true;
    refs.gradingResult.hidden = true;
  });
  refs.recognizedAnswerText.addEventListener("input", () => {
    refs.recognizedCharCount.textContent = `${refs.recognizedAnswerText.value.replace(/\s/g, "").length} 字`;
    refs.gradingResult.hidden = true;
  });
  refs.recognizeAnswerButton.addEventListener("click", recognizeAnswerImage);
  refs.gradeAnswerButton.addEventListener("click", gradeCurrentAnswer);

  document.getElementById("sourceButton").addEventListener("click", () => refs.dialog.showModal());
  document.getElementById("closeDialog").addEventListener("click", () => refs.dialog.close());
  refs.dialog.addEventListener("click", (event) => { if (event.target === refs.dialog) refs.dialog.close(); });

  document.getElementById("topicTotal").textContent = `${items.length} 题`;
  document.getElementById("sourceList").innerHTML = data.generatedFrom.map((source) => `<li>${escapeHtml(source)}</li>`).join("");
  renderChapters();
  renderExamples();
  renderRecent();
  renderProgress();
  answerQuestion(refs.input.value);
})();
