/* batch152 · 深浅主题切换（app.html / kb.html / local.html 三页共用）
   用法：<head> 里 <script src="theme-toggle.js"></script>（同步执行，切页不闪白）
        + 页内一个 id="themeToggle" 的按钮（里面放 .tp-sun/.tp-moon/.tp-on/.tp-alt 四块）
   存 localStorage.geo_theme = "dark" | "light"；没存过 = 浅色（附图默认态）。
   切完顺带把 <meta name="theme-color"> 改成对应的底色调。 */
(function () {
  var KEY = "geo_theme";
  var root = document.documentElement;
  function saved() {
    try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; }
  }
  function apply(t) {
    root.setAttribute("data-theme", t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) { m.setAttribute("content", t === "dark" ? "#0f1319" : "#eef1f7"); }
  }
  function current() { return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function paint() {
    var b = document.getElementById("themeToggle");
    if (!b) { return; }
    var dark = current() === "dark";
    b.setAttribute("aria-pressed", dark ? "true" : "false");
    b.setAttribute("aria-label", dark ? "当前深色主题，点击切回浅色" : "当前浅色主题，点击切到深色");
    b.setAttribute("title", dark ? "切回浅色主题" : "切到深色主题");
    var on = b.querySelector(".tp-on"), alt = b.querySelector(".tp-alt");
    if (on) { on.textContent = dark ? "浅色" : "深色主题"; }
    if (alt) { alt.textContent = dark ? "深色主题" : "浅色"; }
  }
  function boot() {
    paint();
    var b = document.getElementById("themeToggle");
    if (!b) { return; }
    b.addEventListener("click", function () {
      var n = current() === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, n); } catch (e) {}
      apply(n);
      paint();
    });
  }
  apply(saved() === "dark" ? "dark" : "light");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("storage", function (e) {
    if (e.key === KEY) { apply(saved() === "dark" ? "dark" : "light"); paint(); }
  });
})();
