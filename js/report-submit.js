import { fetchJson } from "./api.js";
import { initStandalonePage } from "./auth.js";
import { getReportSurfaceLabel, populateReportSurfaceSelect } from "./report-surface-catalog.mjs";

const AFFECTED_AREA_LABELS = {
  dashboard_shell: "Dashboard shell",
  reports_hub: "Reports hub",
  report_submission: "Report submission",
  keys_workspace: "Keys workspace",
  auth_session: "Auth / session",
  api_backend: "API / backend",
  runtime_exports: "Runtime / exports",
  other: "Other",
};

const VALUE_LABELS = {
  streamsuites_web: "StreamSuites web",
  browser_extension: "Browser extension",
  desktop: "Desktop",
  laptop: "Laptop",
  tablet: "Tablet",
  mobile: "Mobile",
  embedded: "Embedded / WebView",
};

const formEl = document.getElementById("report-form");
const statusEl = document.getElementById("report-status");
const affectedAreaOtherCheckbox = document.querySelector('[data-other-toggle="affected-area"]');
const affectedAreaOtherWrap = document.getElementById("affected-area-other-wrap");
const affectedAreaOtherInput = formEl?.elements.namedItem("affected_area_other");
const affectedAreaValidationEl = document.getElementById("affected-area-validation");
const surfaceSelect = formEl?.elements.namedItem("context_surface");
const surfaceOtherWrap = document.getElementById("surface-other-wrap");
const surfaceOtherInput = formEl?.elements.namedItem("context_surface_other");
const platformSelect = formEl?.elements.namedItem("context_platform");
const platformOtherWrap = document.getElementById("platform-other-wrap");
const platformOtherInput = formEl?.elements.namedItem("context_platform_other");

populateReportSurfaceSelect(surfaceSelect);

const page = await initStandalonePage({
  navKey: "report-submit",
  authRequired: true,
  developerRequired: true,
  statusTargetId: "report-status",
});

function normalizeLabel(value) {
  return (
    getReportSurfaceLabel(value) ||
    VALUE_LABELS[value] ||
    AFFECTED_AREA_LABELS[value] ||
    String(value || "").replace(/_/g, " ")
  );
}

function setConditionalFieldState(wrap, input, active) {
  if (!wrap || !input) return;
  wrap.classList.toggle("hidden", !active);
  input.disabled = !active;
  input.required = active;
  if (!active) {
    input.value = "";
    input.setCustomValidity("");
  }
}

function syncConditionalFields() {
  setConditionalFieldState(affectedAreaOtherWrap, affectedAreaOtherInput, affectedAreaOtherCheckbox?.checked === true);
  setConditionalFieldState(surfaceOtherWrap, surfaceOtherInput, surfaceSelect?.value === "other");
  setConditionalFieldState(platformOtherWrap, platformOtherInput, platformSelect?.value === "other");
}

function getCheckedValues(form, fieldName) {
  return Array.from(form.querySelectorAll(`input[name="${fieldName}"]:checked`)).map((input) => input.value);
}

function readValue(form, name) {
  const field = form.elements.namedItem(name);
  return field instanceof RadioNodeList ? String(field.value || "").trim() : String(field?.value || "").trim();
}

function setAffectedAreaValidation(message = "") {
  if (!affectedAreaValidationEl) return;
  affectedAreaValidationEl.textContent = message;
  affectedAreaValidationEl.classList.toggle("is-error", Boolean(message));
}

function buildDelimitedText(entries) {
  return entries
    .filter(([, value]) => String(value || "").trim())
    .map(([label, value]) => `${label}: ${String(value).trim()}`)
    .join("\n");
}

function parseExtraMetadata(text) {
  const source = String(text || "").trim();
  if (!source) return {};
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (_error) {
    throw new Error("Advanced structured metadata must be valid JSON.");
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Advanced structured metadata must be a JSON object.");
  }
  return parsed;
}

function buildDeveloperReportPayload(form) {
  const affectedAreaValues = getCheckedValues(form, "affected_area_choice");
  const affectedAreaOther = readValue(form, "affected_area_other");
  const affectedAreaSummary = affectedAreaValues
    .filter((value) => value !== "other")
    .map((value) => normalizeLabel(value));

  if (affectedAreaValues.includes("other") && affectedAreaOther) {
    affectedAreaSummary.push(`Other: ${affectedAreaOther}`);
  }

  const environment = {
    operating_system: readValue(form, "environment_os"),
    os_version: readValue(form, "environment_os_version"),
    browser: readValue(form, "environment_browser"),
    browser_version: readValue(form, "environment_browser_version"),
    viewport: readValue(form, "environment_viewport"),
    device_type: readValue(form, "environment_device_type"),
    flags: readValue(form, "environment_flags"),
  };

  const platformContext = {
    surface: readValue(form, "context_surface"),
    surface_other: readValue(form, "context_surface_other"),
    platform: readValue(form, "context_platform"),
    platform_other: readValue(form, "context_platform_other"),
    route: readValue(form, "context_route"),
    creator_context: readValue(form, "context_creator"),
    viewer_context: readValue(form, "context_viewer"),
  };

  const accountContext = {
    account_tier_context: readValue(form, "context_account_tier"),
    identifiers: readValue(form, "context_identifiers"),
  };

  const extraMetadata = parseExtraMetadata(readValue(form, "structured_metadata_extra"));
  const structuredMetadata = {
    schema_version: 2,
    source: "developer_console_report_form",
    affected_area: {
      selected: affectedAreaValues.filter((value) => value !== "other"),
      other: affectedAreaOther || "",
    },
    environment,
    platform_context: platformContext,
    account_context: accountContext,
    extra: extraMetadata,
  };

  return {
    title: readValue(form, "title"),
    category: readValue(form, "category"),
    severity: readValue(form, "severity"),
    affected_area: affectedAreaSummary.join(", "),
    reproduction_steps: readValue(form, "reproduction_steps"),
    expected_result: readValue(form, "expected_result"),
    actual_result: readValue(form, "actual_result"),
    environment_details: buildDelimitedText([
      ["Operating system", environment.operating_system],
      ["OS version", environment.os_version],
      ["Browser", environment.browser],
      ["Browser version", environment.browser_version],
      ["Viewport / screen size", environment.viewport],
      ["Device type", normalizeLabel(environment.device_type)],
      ["Flags / toggles / extensions / special conditions", environment.flags],
    ]),
    platform_details: buildDelimitedText([
      ["Surface", platformContext.surface === "other" ? platformContext.surface_other : normalizeLabel(platformContext.surface)],
      ["Platform", platformContext.platform === "other" ? platformContext.platform_other : normalizeLabel(platformContext.platform)],
      ["Route / URL path", platformContext.route],
      ["Creator context", platformContext.creator_context],
      ["Viewer context", platformContext.viewer_context],
    ]),
    account_context: buildDelimitedText([
      ["Account / tier context", accountContext.account_tier_context],
      ["Relevant creator / viewer identifiers", accountContext.identifiers],
    ]),
    body: readValue(form, "body"),
    structured_metadata: JSON.stringify(structuredMetadata),
    source_route: "/reports/submit/",
  };
}

function validateStructuredForm(form) {
  syncConditionalFields();
  setAffectedAreaValidation("");

  const affectedAreaValues = getCheckedValues(form, "affected_area_choice");
  if (!affectedAreaValues.length) {
    setAffectedAreaValidation("Select at least one affected area.");
    affectedAreaOtherCheckbox?.focus();
    return "Select at least one affected area.";
  }

  if (affectedAreaValues.includes("other") && !readValue(form, "affected_area_other")) {
    setAffectedAreaValidation("Describe the affected area when Other is selected.");
    affectedAreaOtherInput?.focus();
    return "Describe the affected area when Other is selected.";
  }

  if (surfaceSelect?.value === "other" && !readValue(form, "context_surface_other")) {
    surfaceOtherInput?.setCustomValidity("Describe the surface when Other is selected.");
  } else {
    surfaceOtherInput?.setCustomValidity("");
  }

  if (platformSelect?.value === "other" && !readValue(form, "context_platform_other")) {
    platformOtherInput?.setCustomValidity("Describe the platform when Other is selected.");
  } else {
    platformOtherInput?.setCustomValidity("");
  }

  if (!form.reportValidity()) {
    return "Complete the required fields before submitting.";
  }

  try {
    parseExtraMetadata(readValue(form, "structured_metadata_extra"));
  } catch (error) {
    return error.message;
  }

  return "";
}

if (!page.blocked) {
  syncConditionalFields();
  formEl?.addEventListener("change", syncConditionalFields);
  formEl?.addEventListener("reset", () => {
    window.requestAnimationFrame(() => {
      syncConditionalFields();
      setAffectedAreaValidation("");
    });
  });

  formEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const validationError = validateStructuredForm(formEl);
    if (validationError) {
      statusEl.textContent = validationError;
      statusEl.className = "status-line error";
      return;
    }

    statusEl.textContent = "Submitting report...";
    statusEl.className = "status-line";
    try {
      const payload = buildDeveloperReportPayload(formEl);
      const submissionPayload = await fetchJson("/api/developer/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const submissionId = submissionPayload?.submission?.id;
      const files = Array.from(document.getElementById("attachments")?.files || []);
      for (const file of files) {
        const upload = new FormData();
        upload.append("file", file, file.name);
        const response = await fetch(`/api/developer/reports/${encodeURIComponent(submissionId)}/artifacts`, {
          method: "POST",
          credentials: "include",
          body: upload,
        });
        if (!response.ok) {
          const uploadPayload = await response.json().catch(() => null);
          throw new Error(uploadPayload?.error || `Attachment upload failed (${response.status})`);
        }
      }
      formEl.reset();
      statusEl.textContent = "Developer report submitted. Attachment metadata is now available to admin review.";
      statusEl.className = "status-line success";
    } catch (error) {
      statusEl.textContent = error.message;
      statusEl.className = "status-line error";
    }
  });
}
