(function () {
  "use strict";

  var ALLOWED_CTA = {
    home_plan_consult: true,
    home_consult_submit: true,
    audit_lead_submit: true
  };
  var ALLOWED_SURFACE = {
    homepage_consult: true,
    readiness_audit: true
  };

  function pagePath() {
    var path = String((window.location && window.location.pathname) || "/");
    if (path === "/index.html") path = "/";
    return path.split("?")[0].split("#")[0].slice(0, 120) || "/";
  }

  window.gxTrack = function (cta, surface) {
    if (!ALLOWED_CTA[cta] || !ALLOWED_SURFACE[surface]) return false;
    var body = JSON.stringify({
      event: "cta_lead_click",
      page: pagePath(),
      props: { cta: cta, surface: surface }
    });
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon("/api/track", blob)) return true;
      }
    } catch (_) {}
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        credentials: "omit",
        keepalive: true
      }).catch(function () {});
    } catch (_) {}
    return true;
  };
})();
