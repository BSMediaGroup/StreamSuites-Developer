(() => {
  const API_URL = "https://v0hwlmly3pd2.statuspage.io/api/v2/summary.json";
  const DIAGNOSTICS_URL = "https://api.streamsuites.app/api/public/status/diagnostics";
  const STATUS_URL = "https://streamsuites.statuspage.io";
  const ROOT_ID = "ss-status-indicator";
  const DETAILS_ID = "ss-status-details";
  const POLL_INTERVAL_MS = 60000;

  const INDICATOR_LABELS = {
    none: "OPERATIONAL",
    minor: "DEGRADED",
    major: "OUTAGE",
    critical: "CRITICAL",
  };

  const INDICATOR_STATES = {
    none: "operational",
    minor: "degraded",
    major: "outage",
    critical: "critical",
  };

  const COMPONENT_LABELS = {
    operational: "Operational",
    degraded_performance: "Degraded",
    partial_outage: "Partial Outage",
    major_outage: "Major Outage",
    under_maintenance: "Maintenance",
  };

  const COMPONENT_STATES = {
    operational: "operational",
    degraded_performance: "degraded",
    partial_outage: "outage",
    major_outage: "critical",
    under_maintenance: "maintenance",
  };

  if (document.getElementById(ROOT_ID)) return;

  const toTitle = (value) => {
    if (!value) return "";
    return String(value)
      .replace(/_/g, " ")
      .split(" ")
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
      .join(" ");
  };

  const truncateText = (value, limit = 140) => {
    if (!value) return "";
    const text = String(value).trim();
    if (text.length <= limit) return text;
    const slice = text.slice(0, limit);
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > 60) return `${slice.slice(0, lastSpace)}...`;
    return `${slice}...`;
  };

  const formatRelative = (value) => {
    const timestamp = Date.parse(value || "");
    if (!Number.isFinite(timestamp)) return "at an unavailable time";
    const delta = Date.now() - timestamp;
    const absolute = Math.abs(delta);
    for (const [unit, size] of [["day", 86400000], ["hour", 3600000], ["minute", 60000]]) {
      if (absolute >= size) {
        return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-Math.round(delta / size), unit);
      }
    }
    return "just now";
  };

  const sortComponents = (components) => {
    return [...components].sort((a, b) => {
      const aPos = Number.isFinite(Number(a?.position)) ? Number(a.position) : Number.MAX_SAFE_INTEGER;
      const bPos = Number.isFinite(Number(b?.position)) ? Number(b.position) : Number.MAX_SAFE_INTEGER;
      if (aPos !== bPos) return aPos - bPos;

      const aName = String(a?.name || "").toLowerCase();
      const bName = String(b?.name || "").toLowerCase();
      if (aName < bName) return -1;
      if (aName > bName) return 1;
      return 0;
    });
  };

  const createLink = () => {
    const link = document.createElement("a");
    link.className = "ss-status-link";
    link.href = STATUS_URL;
    link.rel = "noreferrer";
    link.target = "_blank";
    link.textContent = "View full status";
    return link;
  };

  const createSection = (titleText) => {
    const section = document.createElement("section");
    section.className = "ss-status-section";

    const title = document.createElement("h4");
    title.className = "ss-status-section-title";
    title.textContent = titleText;

    const list = document.createElement("ul");
    list.className = "ss-status-list";

    section.append(title, list);
    return { section, list };
  };

  const createHeader = (description) => {
    const header = document.createElement("div");
    header.className = "ss-status-header";

    const title = document.createElement("div");
    title.className = "ss-status-header-title";
    title.textContent = "StreamSuites Status";

    const descriptionEl = document.createElement("div");
    descriptionEl.className = "ss-status-header-description";
    descriptionEl.textContent = description || "Status unavailable.";

    header.append(title, descriptionEl);
    return header;
  };

  const createMetricsSection = (diagnostics, { stale = false } = {}) => {
    const metrics = diagnostics?.metrics;
    const core = metrics?.core_api_response_time;
    const studio = metrics?.studio_room_readiness;
    const coreValue = core?.value_ms;
    const coreObserved = core?.state === "observed" && coreValue != null && Number.isFinite(Number(coreValue)) && Number(coreValue) >= 0;
    const studioValue = studio?.value;
    const studioObserved = studio?.state === "observed" && studioValue != null && Number.isFinite(Number(studioValue));
    const studioDeferred = studio?.state === "deferred";
    const section = document.createElement("section");
    section.className = "ss-status-section ss-status-metrics";
    const heading = document.createElement("h2");
    heading.className = "ss-status-section-title";
    heading.textContent = "Atlassian custom metrics";
    const source = document.createElement("p");
    source.className = "ss-status-metrics-source";
    source.textContent = "Sanitized Runtime/Auth projection · read only";
    const grid = document.createElement("div");
    grid.className = "ss-status-metrics-grid";

    const createCard = ({ key, title, value, state, detail }) => {
      const card = document.createElement("article");
      card.className = "ss-status-metric";
      card.dataset.metric = key;
      card.dataset.state = state;
      const head = document.createElement("div");
      head.className = "ss-status-metric-head";
      const name = document.createElement("h3");
      name.textContent = title;
      const stateEl = document.createElement("span");
      stateEl.className = "ss-status-metric-state";
      stateEl.textContent = state === "observed" ? "Observed" : state === "stale" ? "Stale reading" : state === "deferred" ? "Deferred" : "Unavailable";
      head.append(name, stateEl);
      const valueEl = document.createElement("strong");
      valueEl.className = "ss-status-metric-value";
      valueEl.textContent = value;
      const detailEl = document.createElement("p");
      detailEl.className = "ss-status-metric-detail";
      detailEl.textContent = detail;
      card.append(head, valueEl, detailEl);
      return card;
    };

    grid.append(
      createCard({
        key: "core-api-response-time",
        title: "Core API response time",
        value: coreObserved ? `${Math.round(Number(coreValue))} ms` : "Unavailable",
        state: coreObserved ? (stale ? "stale" : "observed") : "unavailable",
        detail: coreObserved ? `Measured ${formatRelative(core.last_checked)}.` : core?.state === "awaiting_measured_data" ? "Awaiting a measured Core API observation." : "No measured Core API value is available.",
      }),
      createCard({
        key: "studio-room-readiness",
        title: "Studio Room Readiness",
        value: studioDeferred ? "Deferred" : studioObserved ? String(studioValue) : "Unavailable",
        state: studioDeferred ? "deferred" : studioObserved ? (stale ? "stale" : "observed") : "unavailable",
        detail: studioDeferred ? truncateText(studio.reason || "A genuine Studio room readiness transaction is not available yet.", 170) : studioObserved ? "Latest measured readiness value." : "No genuine Studio room readiness observation is available.",
      })
    );
    section.append(heading, source, grid);
    return section;
  };

  const createComponentItem = (component) => {
    const item = document.createElement("li");
    item.className = "ss-status-item ss-status-component-item";

    const left = document.createElement("div");
    left.className = "ss-status-item-left";

    const dot = document.createElement("span");
    dot.className = "ss-status-item-dot";
    dot.dataset.state = COMPONENT_STATES[component?.status] || "unknown";
    dot.setAttribute("aria-hidden", "true");

    const name = document.createElement("span");
    name.className = "ss-status-item-title";
    name.textContent = component?.name || "Unnamed Component";

    left.append(dot, name);

    const meta = document.createElement("span");
    meta.className = "ss-status-item-meta";
    meta.textContent = COMPONENT_LABELS[component?.status] || "Unknown";

    item.append(left, meta);
    return item;
  };

  const createCompactItem = ({ title, meta, body }) => {
    const item = document.createElement("li");
    item.className = "ss-status-item";

    const titleEl = document.createElement("div");
    titleEl.className = "ss-status-item-title";
    titleEl.textContent = title;
    item.appendChild(titleEl);

    if (meta) {
      const metaEl = document.createElement("div");
      metaEl.className = "ss-status-item-meta";
      metaEl.textContent = meta;
      item.appendChild(metaEl);
    }

    if (body) {
      const bodyEl = document.createElement("div");
      bodyEl.className = "ss-status-item-body";
      bodyEl.textContent = body;
      item.appendChild(bodyEl);
    }

    return item;
  };

  const createWidgetElements = () => {
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.className = "ss-status-indicator";
    root.dataset.state = "unknown";
    root.dataset.layout = "floating";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "ss-status-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", DETAILS_ID);
    toggle.setAttribute("aria-label", "Service status details");

    const dot = document.createElement("span");
    dot.className = "ss-status-dot";
    dot.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "ss-status-label";
    label.textContent = "UNKNOWN";

    const details = document.createElement("div");
    details.id = DETAILS_ID;
    details.className = "ss-status-details";
    details.hidden = true;

    toggle.append(dot, label);
    root.append(toggle, details);

    return { root, toggle, label, details };
  };

  const setSummaryIndicator = (widget, indicator) => {
    const key = String(indicator || "").toLowerCase();
    widget.root.dataset.state = INDICATOR_STATES[key] || "unknown";
    widget.label.textContent = INDICATOR_LABELS[key] || "UNKNOWN";
  };

  const renderUnavailable = (widget, diagnostics, { diagnosticsStale = false } = {}) => {
    setSummaryIndicator(widget, null);
    widget.root.dataset.stale = "false";
    widget.details.innerHTML = "";
    widget.details.append(createHeader("Status unavailable."), createMetricsSection(diagnostics, { stale: diagnosticsStale }), createLink());
  };

  const renderSummary = (widget, summary, { stale = false, diagnostics = null, diagnosticsStale = false } = {}) => {
    const status = summary?.status || {};
    const components = Array.isArray(summary?.components) ? summary.components : [];
    const incidents = Array.isArray(summary?.incidents) ? summary.incidents : [];
    const maintenances = Array.isArray(summary?.scheduled_maintenances)
      ? summary.scheduled_maintenances
      : [];

    setSummaryIndicator(widget, status.indicator);
    widget.root.dataset.stale = stale ? "true" : "false";

    widget.details.innerHTML = "";
    widget.details.appendChild(createHeader(status.description || "Status unavailable."));
    widget.details.appendChild(createMetricsSection(diagnostics, { stale: diagnosticsStale }));

    const sortedComponents = sortComponents(components);
    const componentSection = createSection("Components");
    if (sortedComponents.length) {
      sortedComponents.forEach((component) => {
        componentSection.list.appendChild(createComponentItem(component));
      });
    } else {
      componentSection.list.appendChild(
        createCompactItem({
          title: "No components reported",
          meta: "Unknown",
        })
      );
    }
    widget.details.appendChild(componentSection.section);

    if (incidents.length) {
      const incidentSection = createSection("Incidents");
      incidents.forEach((incident) => {
        incidentSection.list.appendChild(
          createCompactItem({
            title: incident?.name || "Untitled Incident",
            meta: `${toTitle(incident?.impact) || "Unknown Impact"} - ${
              toTitle(incident?.status) || "Unknown"
            }`,
            body: truncateText(
              Array.isArray(incident?.incident_updates)
                ? incident.incident_updates[0]?.body
                : "",
              120
            ),
          })
        );
      });
      widget.details.appendChild(incidentSection.section);
    }

    if (maintenances.length) {
      const maintenanceSection = createSection("Maintenances");
      maintenances.forEach((maintenance) => {
        maintenanceSection.list.appendChild(
          createCompactItem({
            title: maintenance?.name || "Scheduled Maintenance",
            meta: toTitle(maintenance?.status) || "Scheduled",
          })
        );
      });
      widget.details.appendChild(maintenanceSection.section);
    }

    widget.details.appendChild(createLink());
  };

  const initStatusWidget = () => {
    const widget = createWidgetElements();
    const { root, toggle, details } = widget;

    const host = document.querySelector("[data-status-slot]");
    const inlineMode =
      host?.dataset?.statusSlotMode === "inline" ||
      Boolean(host?.closest("#app-footer"));

    if (host) {
      host.appendChild(root);
      root.dataset.layout = inlineMode ? "inline" : "embedded";
    } else {
      document.body.appendChild(root);
    }

    let isPinned = false;
    let isHovered = false;
    let hasFocus = false;
    let lastSuccessfulSummary = null;
    let lastSuccessfulDiagnostics = null;

    const setExpanded = (expanded) => {
      const isExpanded = Boolean(expanded);
      toggle.setAttribute("aria-expanded", String(isExpanded));
      details.hidden = !isExpanded;
      root.dataset.expanded = String(isExpanded);
    };

    const syncExpandedState = () => {
      setExpanded(isPinned || isHovered || hasFocus);
    };

    toggle.addEventListener("click", () => {
      isPinned = !isPinned;
      syncExpandedState();
    });

    root.addEventListener("mouseenter", () => {
      isHovered = true;
      syncExpandedState();
    });

    root.addEventListener("mouseleave", () => {
      isHovered = false;
      syncExpandedState();
    });

    root.addEventListener("focusin", () => {
      hasFocus = true;
      syncExpandedState();
    });

    root.addEventListener("focusout", () => {
      window.requestAnimationFrame(() => {
        hasFocus = root.contains(document.activeElement);
        syncExpandedState();
      });
    });

    root.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      isPinned = false;
      isHovered = false;
      hasFocus = false;
      syncExpandedState();
      toggle.focus();
    });

    document.addEventListener("pointerdown", (event) => {
      if (!isPinned) return;
      if (root.contains(event.target)) return;
      isPinned = false;
      syncExpandedState();
    });

    const fetchJson = async (url, signal) => {
      const response = await fetch(url, {
        signal,
        cache: "no-store",
        credentials: "omit",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Status fetch failed (${response.status})`);
      return response.json();
    };

    const fetchStatus = async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      let diagnosticsForRender = lastSuccessfulDiagnostics;
      let diagnosticsStaleForRender = Boolean(lastSuccessfulDiagnostics);

      try {
        const results = await Promise.allSettled([
          fetchJson(API_URL, controller.signal),
          fetchJson(DIAGNOSTICS_URL, controller.signal),
        ]);
        const diagnosticsResponse = results[1].status === "fulfilled" ? results[1].value : null;
        const liveDiagnostics = diagnosticsResponse?.available && diagnosticsResponse?.diagnostics
          ? diagnosticsResponse.diagnostics
          : null;
        if (liveDiagnostics) lastSuccessfulDiagnostics = liveDiagnostics;
        diagnosticsForRender = liveDiagnostics || lastSuccessfulDiagnostics;
        diagnosticsStaleForRender = Boolean(diagnosticsForRender && (!liveDiagnostics || diagnosticsResponse?.stale));
        if (results[0].status !== "fulfilled") throw results[0].reason;
        const summary = results[0].value;
        lastSuccessfulSummary = summary;
        renderSummary(widget, summary, { stale: false, diagnostics: diagnosticsForRender, diagnosticsStale: diagnosticsStaleForRender });
      } catch (_error) {
        if (lastSuccessfulSummary) {
          renderSummary(widget, lastSuccessfulSummary, { stale: true, diagnostics: diagnosticsForRender, diagnosticsStale: diagnosticsStaleForRender });
          return;
        }
        renderUnavailable(widget, diagnosticsForRender, { diagnosticsStale: diagnosticsStaleForRender });
      } finally {
        clearTimeout(timeout);
      }
    };

    fetchStatus();
    window.setInterval(fetchStatus, POLL_INTERVAL_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        fetchStatus();
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStatusWidget, { once: true });
  } else {
    initStatusWidget();
  }
})();
