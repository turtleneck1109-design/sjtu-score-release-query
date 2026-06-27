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
  jxbmc: "教学班",
  xm: "教师",
  jsxm: "教师",
  kkxy: "开课学院",
  kkxymc: "开课学院",
  xymc: "学院",
  nj: "年级",
  zt: "状态",
  tjzt: "提交状态",
  lrzt: "录入状态",
  sfwc: "是否完成",
  tjsj: "提交时间",
  lrsj: "录入时间",
};

const preferredColumns = [
  "kcmc",
  "kch",
  "jxbmc",
  "xm",
  "jsxm",
  "kkxy",
  "kkxymc",
  "xymc",
  "tjzt",
  "lrzt",
  "zt",
  "sfwc",
  "tjsj",
  "lrsj",
];

const demoData = {
  items: [
    { kcmc: "高等数学", kch: "MATH1201", jxbmc: "高数-01", jsxm: "张老师", kkxymc: "数学科学学院", tjzt: "已提交", tjsj: "2025-07-01 10:20" },
    { kcmc: "大学物理", kch: "PHYS1201", jxbmc: "物理-03", jsxm: "李老师", kkxymc: "物理与天文学院", tjzt: "未提交", tjsj: "" },
    { kcmc: "程序设计", kch: "CS1501", jxbmc: "程序-02", jsxm: "王老师", kkxymc: "电子信息与电气工程学院", tjzt: "已提交", tjsj: "2025-06-29 16:10" },
    { kcmc: "工程制图", kch: "ME1102", jxbmc: "制图-01", jsxm: "陈老师", kkxymc: "机械与动力工程学院", tjzt: "处理中", tjsj: "" },
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
  statusFieldSelect: document.querySelector("#statusFieldSelect"),
  groupFieldSelect: document.querySelector("#groupFieldSelect"),
  statusChart: document.querySelector("#statusChart"),
  groupChart: document.querySelector("#groupChart"),
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

function buildUrl() {
  const params = new URLSearchParams({
    doType: "query",
    xnm: els.yearInput.value.trim() || "2024",
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
  state.statusField = pickField(state.columns, [/提交状态/, /录入状态/, /^tjzt$/i, /^lrzt$/i, /^zt$/i, /sfwc/i], state.columns[0] || "");
  state.groupField = pickField(state.columns, [/开课学院/, /学院/, /单位/, /部门/, /^kkxy/i, /^xymc$/i], state.columns[0] || "");
  state.page = 1;
  hydrateFieldSelects();
  applyFilters();
  setStatus(`${source} 已载入 ${items.length} 条。`);
}

function hydrateFieldSelects() {
  const options = state.columns.map((field) => `<option value="${escapeHtml(field)}">${escapeHtml(labelFor(field))}</option>`).join("");
  els.statusFieldSelect.innerHTML = options;
  els.groupFieldSelect.innerHTML = options;
  els.statusFieldSelect.value = state.statusField;
  els.groupFieldSelect.value = state.groupField;
}

function statusKind(value) {
  const text = flattenValue(value).trim();
  if (!text) return "warn";
  if (/未|否|不|待|退回|失败|0|false/i.test(text)) return "bad";
  if (/已提交|已录入|已完成|完成|通过|^是$|^1$|^true$/i.test(text)) return "good";
  return "warn";
}

function statusLabel(item) {
  return flattenValue(item[state.statusField]).trim() || "空/未知";
}

function isSubmitted(item) {
  return statusKind(item[state.statusField]) === "good";
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
  renderCharts();
  renderTable();
}

function renderStats() {
  const total = state.rawItems.length;
  const submitted = state.rawItems.filter(isSubmitted).length;
  els.totalCount.textContent = total;
  els.submittedCount.textContent = submitted;
  els.pendingCount.textContent = total - submitted;
}

function countBy(field, limit = Infinity) {
  const counts = new Map();
  state.rawItems.forEach((item) => {
    const key = flattenValue(item[field]).trim() || "空/未知";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, limit);
}

function renderBarChart(container, rows) {
  const max = Math.max(1, ...rows.map((row) => row[1]));
  if (!rows.length) {
    container.innerHTML = `<p class="hint">暂无数据</p>`;
    return;
  }
  container.innerHTML = rows.map(([label, count]) => {
    const width = Math.max(3, Math.round((count / max) * 100));
    return `
      <div class="bar-row" title="${escapeHtml(label)}: ${count}">
        <span class="bar-label">${escapeHtml(label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${width}%"></span></span>
        <span class="bar-value">${count}</span>
      </div>
    `;
  }).join("");
}

function renderCharts() {
  renderBarChart(els.statusChart, countBy(state.statusField));
  renderBarChart(els.groupChart, countBy(state.groupField, 10));
}

function renderStatusFilter() {
  const current = els.statusFilter.value;
  const statuses = countBy(state.statusField).map(([label]) => label);
  els.statusFilter.innerHTML = `<option value="">全部状态</option>${statuses.map((label) => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`).join("")}`;
  if (statuses.includes(current)) els.statusFilter.value = current;
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
      if (field === state.statusField) {
        return `<td><span class="badge ${statusKind(value)}">${escapeHtml(value || "空/未知")}</span></td>`;
      }
      return `<td>${escapeHtml(value)}</td>`;
    }).join("")}</tr>`;
  }).join("");

  const total = state.rawItems.length;
  els.resultInfo.textContent = total ? `当前显示 ${state.filtered.length} / ${total} 条，表格展示前 ${visibleColumns.length} 个字段。` : "尚未载入数据";
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
  hydrateFieldSelects();
  applyFilters();
  setStatus("已清空。");
});
els.statusFieldSelect.addEventListener("change", () => {
  state.statusField = els.statusFieldSelect.value;
  state.page = 1;
  applyFilters();
});
els.groupFieldSelect.addEventListener("change", () => {
  state.groupField = els.groupFieldSelect.value;
  renderCharts();
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

updateUrl();
hydrateFieldSelects();
renderAll();
