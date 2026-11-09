// Runs only after the user invokes the saved bookmark on an SJTU JSON page.
function sendSjtuJson(targetOrigin) {
  if (location.origin !== "https://i.sjtu.edu.cn" ||
      location.pathname !== "/cjlrjg/cjlrjg_cxCjlrjg.html") {
    alert("请先在查询页点击“读取教务数据”，再在打开的教务 JSON 页面点击此书签。");
    return;
  }
  const requestId = new URLSearchParams(location.hash.slice(1)).get("sjtuReader");
  if (!requestId || !window.opener || window.opener.closed) {
    alert("查询页连接已失效。请回到查询页重新点击“读取教务数据”；也可以复制 JSON 手动导入。");
    return;
  }
  let payload;
  try {
    payload = JSON.parse((document.querySelector("pre") || document.body).textContent);
  } catch {
    alert("当前页面不是 JSON 数据。若出现登录页面，请完成登录后回到查询页重新读取。");
    return;
  }
  const opener = window.opener;
  const onReply = (event) => {
    if (event.source !== opener || event.origin !== targetOrigin ||
        event.data?.type !== "sjtu-reader-result" || event.data.requestId !== requestId) return;
    clearTimeout(timer);
    window.removeEventListener("message", onReply);
    alert(event.data.ok ? "数据已载入，请切回查询页查看。" : "导入失败，请回到查询页查看提示。");
  };
  const timer = setTimeout(() => {
    window.removeEventListener("message", onReply);
    alert("查询页没有响应。请重新打开读取页面；若切换了网站地址，请重新保存书签。也可手动复制 JSON 导入。");
  }, 5000);
  window.addEventListener("message", onReply);
  opener.postMessage({ type: "sjtu-reader-data", requestId, payload }, targetOrigin);
}

function createSjtuReader({ button, bookmark, help, getUrl, onPayload, onStatus,
  timeoutMs = 300000 }) {
  const sjtuOrigin = "https://i.sjtu.edu.cn";
  let pending = null;

  function cancel() {
    if (pending) clearInterval(pending.timer);
    pending = null;
    button.textContent = "读取教务数据";
  }

  const code = `(${sendSjtuJson.toString()})(${JSON.stringify(location.origin)});void(0)`;
  bookmark.href = `javascript:${encodeURIComponent(code)}`;
  bookmark.addEventListener("click", (event) => {
    event.preventDefault();
    help.open = true;
    onStatus("请先把“回传教务数据”拖到浏览器书签栏，再在打开的教务 JSON 页面点击该书签。");
  });

  window.addEventListener("message", (event) => {
    if (!pending || event.origin !== sjtuOrigin || event.source !== pending.popup ||
        event.data?.type !== "sjtu-reader-data" || event.data.requestId !== pending.id) return;
    let ok = false;
    try {
      onPayload(event.data.payload);
      ok = true;
    } catch (error) {
      onStatus(`教务数据无法导入：${error.message}`, true);
    }
    event.source.postMessage({ type: "sjtu-reader-result", requestId: pending.id, ok }, sjtuOrigin);
    cancel();
  });

  button.addEventListener("click", () => {
    cancel();
    help.open = true;
    if (!/^https?:$/.test(location.protocol)) {
      onStatus("书签回传需要通过网站地址访问本工具。本地文件请使用“打开 JSON”后手动粘贴。", true);
      return;
    }
    const id = Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, "0")).join("");
    const url = new URL(getUrl());
    url.hash = new URLSearchParams({ sjtuReader: id }).toString();
    // Keep the opener for the explicit, origin-checked bookmark handoff.
    const popup = window.open(url.href, "_blank");
    if (!popup) {
      onStatus("浏览器拦截了新窗口，请允许本站弹出窗口后重试，或使用“打开 JSON”手动导入。", true);
      return;
    }
    button.textContent = "重新打开教务页";
    onStatus("等待回传：请在新打开的教务 JSON 页面点击书签“回传教务数据”。如需登录，登录后回到此页重新读取。");
    const started = Date.now();
    pending = { id, popup, timer: setInterval(() => {
      if (popup.closed || Date.now() - started >= timeoutMs) {
        const closed = popup.closed;
        cancel();
        onStatus(closed ? "教务窗口已关闭，尚未导入数据。可重新读取或手动粘贴 JSON。" :
          "等待回传已超时，请重新读取；也可以手动粘贴 JSON。", true);
      }
    }, 1000) };
  });
  return { cancel };
}
