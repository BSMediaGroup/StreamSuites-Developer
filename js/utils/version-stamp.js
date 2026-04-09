(() => {
  "use strict";

  if (!window.Versioning) return;

  function ensureElement(parent, selector, tagName, className) {
    const existing = selector ? parent.querySelector(selector) : null;
    if (existing) return existing;

    const el = document.createElement(tagName);
    if (className) el.className = className;
    parent.appendChild(el);
    return el;
  }

  function stampAppFooter(meta) {
    const footer = document.getElementById("app-footer");
    if (!footer) return;

    const metaGroup =
      footer.querySelector("[data-footer-meta]") ||
      footer.querySelector(".footer-left") ||
      footer;

    const versionEl = ensureElement(metaGroup, "#footer-version", "span", "footer-version");
    versionEl.id = "footer-version";
    versionEl.textContent = meta.versionText;

    const copyrightEl = ensureElement(metaGroup, "#footer-copyright", "a", "footer-copyright");
    copyrightEl.id = "footer-copyright";
    if (meta.copyrightText) {
      copyrightEl.textContent = meta.copyrightText;
    }
    if (!copyrightEl.getAttribute("href")) {
      copyrightEl.href = "https://brainstream.media";
      copyrightEl.target = "_blank";
      copyrightEl.rel = "noopener noreferrer";
    }
  }

  async function stampFooters() {
    const info = await window.Versioning.loadVersion();
    const meta = {
      versionText: window.Versioning.formatDisplayVersion(info),
      copyrightText: ""
    };

    stampAppFooter(meta);
  }

  window.Versioning.stampFooters = stampFooters;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", stampFooters, { once: true });
  } else {
    stampFooters();
  }
})();
