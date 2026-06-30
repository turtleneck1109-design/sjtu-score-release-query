const endpoint = "https://i.sjtu.edu.cn/cjlrjg/cjlrjg_cxCjlrjg.html";

const state = {
  rawItems: [],
  columns: [],
  filtered: [],
  page: 1,
  statusField: "",
  groupField: "",
};

const fieldAliases = {
  kcmc: "课程名称",
  kch: "课程号",
  kh: "教学班号",
  jxbmc: "教学班",
  xm: "教师",
  jsxm: "教师",
  jgmc: "学院/机构",
  kkxy: "开课学院",
  kkxymc: "开课学院",
  xymc: "学院",
  nj: "年级",
  kknj: "开课年级",
  zt: "状态",
  tjzt: "提交状态",
  lrzt: "录入状态",
  sfwc: "是否完成",
  tjsj: "提交时间",
  lrsj: "录入时间",
  jxb_id: "教学班ID",
  row_id: "序号",
  totalresult: "总记录数",
  totalResult: "总记录数",
};

const preferredColumns = [
  "kcmc",
  "kch",
  "kh",
  "jxbmc",
  "xm",
  "jsxm",
  "jgmc",
  "kkxy",
  "kkxymc",
  "xymc",
  "kknj",
  "tjzt",
  "lrzt",
  "zt",
  "sfwc",
  "tjsj",
  "lrsj",
  "jxb_id",
  "row_id",
  "totalresult",
];

const demoData = {
  items: [
    {
      kcmc: "高等数学II",
      jsxm: "杨雄锋/10012",
      jgmc: "数学科学学院",
      jxb_id: "43A311EFD4532D9CE065F8163EE1DCCC",
      kh: "(2025-2026-2)-MATH1202-12(教学班) MATH1202",
      kknj: "2025",
      row_id: 1,
      totalresult: 3,
    },
    {
      kcmc: "组织设计与发展",
      jsxm: "刘丽莎/15788",
      jgmc: "安泰经济与管理学院",
      jxb_id: "51D705C4B4F63E5FE065F8163EE1DCCC",
      kh: "(2025-2026-2)-BUSS3526-01(教学班) BUSS3526",
      kknj: "2025",
      row_id: 2,
      totalresult: 3,
    },
    {
      kcmc: "应用心理学",
      jsxm: "陈老师/10240",
      jgmc: "学生创新中心",
      jxb_id: "4C316E0CA112494FE065F8163EE1DCCC",
      kh: "(2025-2026-2)-PSYC1101-01(教学班) PSYC1101",
      kknj: "2025",
      row_id: 3,
      totalresult: 3,
    },
  ],
};

const els = {
  yearInput: document.querySelector("#yearInput"),
  termSelect: document.querySelector("#termSelect"),
  countInput: document.querySelector("#countInput"),
  urlInput: document.querySelector("#urlInput"),
  fetchButton: document.querySelector("#fetchButton"),
  demoButton: document.querySelector("#demoButton"),
  copyUrlButton: document.querySelector("#copyUrlButton"),
  openJsonButton: document.querySelector("#openJsonButton"),
  jsonInput: document.querySelector("#jsonInput"),
  parseButton: document.querySelector("#parseButton"),
  clearButton: document.querySelector("#clearButton"),
  statusText: document.querySelector("#statusText"),
  totalCount: document.querySelector("#totalCount"),
  submittedCount: document.querySelector("#submittedCount"),
  pendingCount: document.querySelector("#pendingCount"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  pageSizeSelect: document.querySelector("#pageSizeSelect"),
  resultInfo: document.querySelector("#resultInfo"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody"),
  prevPage: document.querySelector("#prevPage"),
  nextPage: document.querySelector("#nextPage"),
  pageInfo: document.querySelector("#pageInfo"),
};

function getCurrentAcademicDefaults(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month === 1) return { xnm: year - 1, xqm: "3" };
  if (month >= 2 && month <= 6) return { xnm: year - 1, xqm: "12" };
  if (month >= 7 && month <= 8) return { xnm: year - 1, xqm: "16" };
  return { xnm: year, xqm: "3" };
}

function applyCurrentAcademicDefaults() {
  const defaults = getCurrentAcademicDefaults();
  els.yearInput.value = defaults.xnm;
  els.termSelect.value = defaults.xqm;
}

function buildUrl() {
  const params = new URLSearchParams({
    doType: "query",
    xnm: els.yearInput.value.trim() || String(getCurrentAcademicDefaults().xnm),
    xqm: els.termSelect.value,
    "queryModel.showCount": els.countInput.value.trim() || "5000",
  });
  return `${endpoint}?${params.toString()}`;
}

function updateUrl() {
  els.urlInput.value = buildUrl();
}

function labelFor(field) {
  return fieldAliases[field] || field;
}

function normalizeItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  if (payload && Array.isArray(payload.rows)) return payload.rows;
  throw new Error("没有找到 items 数组，请确认粘贴的是接口返回的完整 JSON。");
}

function flattenValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getColumns(items) {
  const seen = new Set();
  items.forEach((item) => Object.keys(item || {}).forEach((key) => seen.add(key)));
  const all = Array.from(seen);
  const preferred = preferredColumns.filter((key) => seen.has(key));
  const rest = all.filter((key) => !preferred.includes(key)).sort((a, b) => a.localeCompare(b, "zh-CN"));
  return [...preferred, ...rest];
}

function pickField(columns, patterns, fallback = "") {
  return columns.find((field) => patterns.some((pattern) => pattern.test(field) || pattern.test(labelFor(field)))) || fallback;
}

function loadPayload(payload, source = "JSON") {
  const items = normalizeItems(payload).filter((item) => item && typeof item === "object");
  state.rawItems = items;
  state.columns = getColumns(items);
  state.statusField = pickField(state.columns, [/发布状态/, /公布状态/, /提交状态/, /录入状态/, /成绩状态/, /^fbzt$/i, /^fbbj$/i, /^tjzt$/i, /^lrzt$/i, /^zt$/i, /sfwc/i, /release/i, /submit/i], "");
  state.groupField = pickField(state.columns, [/开课学院/, /学院/, /单位/, /部门/, /^kkxy/i, /^xymc$/i], state.columns[0] || "");
  state.page = 1;
  applyFilters();
  setStatus(`${source} 已载入 ${items.length} 门未提交成绩课程。`);
}




function statusLabel() {
  return "未提交";
}

function isSubmitted() {
  return false;
}

function applyFilters() {
  const query = els.searchInput.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  state.filtered = state.rawItems.filter((item) => {
    const matchesStatus = !status || statusLabel(item) === status;
    const matchesQuery = !query || state.columns.some((field) => flattenValue(item[field]).toLowerCase().includes(query));
    return matchesStatus && matchesQuery;
  });
  renderAll();
}

function renderAll() {
  renderStats();
  renderStatusFilter();
  renderTable();
}

function renderStats() {
  const total = state.rawItems.length;
  const submitted = state.rawItems.filter(isSubmitted).length;
  els.totalCount.textContent = total;
  els.submittedCount.textContent = submitted;
  els.pendingCount.textContent = total - submitted;
}


function renderStatusFilter() {
  const current = els.statusFilter.value;
  els.statusFilter.innerHTML = `<option value="">全部未提交课程</option><option value="未提交">未提交</option>`;
  els.statusFilter.disabled = !state.rawItems.length;
  if (current === "未提交") els.statusFilter.value = current;
}

function renderTable() {
  const pageSize = Number(els.pageSizeSelect.value);
  const pageCount = Math.max(1, Math.ceil(state.filtered.length / pageSize));
  state.page = Math.min(Math.max(1, state.page), pageCount);
  const start = (state.page - 1) * pageSize;
  const rows = state.filtered.slice(start, start + pageSize);
  const visibleColumns = state.columns.slice(0, 12);

  els.tableHead.innerHTML = visibleColumns.length
    ? `<tr>${visibleColumns.map((field) => `<th>${escapeHtml(labelFor(field))}</th>`).join("")}</tr>`
    : "";

  els.tableBody.innerHTML = rows.map((item) => {
    return `<tr>${visibleColumns.map((field) => {
      const value = flattenValue(item[field]);
      return `<td>${escapeHtml(value)}</td>`;
    }).join("")}</tr>`;
  }).join("");

  const total = state.rawItems.length;
  els.resultInfo.textContent = total ? `当前显示 ${state.filtered.length} / ${total} 门未提交成绩课程，表格展示前 ${visibleColumns.length} 个字段。` : "尚未载入未提交成绩课程数据";
  els.pageInfo.textContent = `第 ${total ? state.page : 0} / ${total ? pageCount : 0} 页`;
  els.prevPage.disabled = !total || state.page <= 1;
  els.nextPage.disabled = !total || state.page >= pageCount;
}

function setStatus(text, isError = false) {
  els.statusText.textContent = text;
  els.statusText.style.color = isError ? "#b91c1c" : "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchJson() {
  updateUrl();
  setStatus("正在请求接口...");
  try {
    const response = await fetch(els.urlInput.value, {
      credentials: "include",
      headers: { Accept: "application/json, text/javascript, */*; q=0.01" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    els.jsonInput.value = text;
    loadPayload(JSON.parse(text), "接口");
  } catch (error) {
    setStatus(`直连失败：${error.message}。可手动打开 URL 后粘贴 JSON。`, true);
  }
}

function parseTextarea() {
  try {
    loadPayload(JSON.parse(els.jsonInput.value), "粘贴数据");
  } catch (error) {
    setStatus(error.message, true);
  }
}

els.yearInput.addEventListener("input", updateUrl);
els.termSelect.addEventListener("change", updateUrl);
els.countInput.addEventListener("input", updateUrl);
els.fetchButton.addEventListener("click", fetchJson);
els.demoButton.addEventListener("click", () => {
  els.jsonInput.value = JSON.stringify(demoData, null, 2);
  loadPayload(demoData, "示例数据");
});
els.copyUrlButton.addEventListener("click", async () => {
  updateUrl();
  await navigator.clipboard.writeText(els.urlInput.value);
  setStatus("URL 已复制。");
});

els.openJsonButton.addEventListener("click", () => {
  updateUrl();
  window.open(els.urlInput.value, "_blank", "noopener");
  setStatus("已打开 JSON 页面；复制返回内容后粘贴到下方解析。");
});
els.parseButton.addEventListener("click", parseTextarea);
els.clearButton.addEventListener("click", () => {
  state.rawItems = [];
  state.columns = [];
  state.filtered = [];
  state.page = 1;
  els.jsonInput.value = "";
  applyFilters();
  setStatus("已清空。");
});
els.searchInput.addEventListener("input", () => {
  state.page = 1;
  applyFilters();
});
els.statusFilter.addEventListener("change", () => {
  state.page = 1;
  applyFilters();
});
els.pageSizeSelect.addEventListener("change", () => {
  state.page = 1;
  renderTable();
});
els.prevPage.addEventListener("click", () => {
  state.page -= 1;
  renderTable();
});
els.nextPage.addEventListener("click", () => {
  state.page += 1;
  renderTable();
});

applyCurrentAcademicDefaults();
updateUrl();
renderAll();
