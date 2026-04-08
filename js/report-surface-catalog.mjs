export const REPORT_SURFACE_GROUPS = [
  {
    label: "Public and viewer-facing surfaces",
    options: [
      { value: "public_site", label: "StreamSuites Public site" },
      { value: "public_profiles", label: "StreamSuites Public profiles" },
      { value: "public_live", label: "StreamSuites Public live view" },
      { value: "public_artifacts", label: "StreamSuites public artifacts (clips / polls / scoreboards / tallies)" },
      { value: "public_community", label: "StreamSuites public community / account pages" },
      { value: "public_auth", label: "StreamSuites public auth / login" },
      { value: "findmehere_directory", label: "FindMeHere directory" },
      { value: "findmehere_profiles", label: "FindMeHere profiles" },
      { value: "findmehere_live", label: "FindMeHere live view" },
      { value: "docs_site", label: "StreamSuites Docs" },
    ],
  },
  {
    label: "Creator, admin, and developer surfaces",
    options: [
      { value: "creator_dashboard", label: "Creator Dashboard" },
      { value: "creator_account", label: "Creator account / profile controls" },
      { value: "creator_preferences", label: "Creator Preferences" },
      { value: "creator_integrations", label: "Creator integrations" },
      { value: "creator_notifications", label: "Creator notifications / requests" },
      { value: "creator_auth", label: "Creator auth / login" },
      { value: "admin_dashboard", label: "Admin Dashboard" },
      { value: "admin_accounts", label: "Admin accounts / user inspection" },
      { value: "admin_alerts_workspace", label: "Admin Alerts workspace" },
      { value: "admin_analytics", label: "Admin analytics / activity" },
      { value: "admin_permissions", label: "Admin permissions" },
      { value: "admin_approvals", label: "Admin approvals / intake" },
      { value: "admin_auth", label: "Admin auth / login" },
      { value: "developer_console", label: "Developer Console" },
      { value: "developer_reports", label: "Developer reports surfaces" },
      { value: "developer_feedback", label: "Developer feedback surface" },
      { value: "developer_beta", label: "Developer beta surfaces" },
      { value: "developer_auth", label: "Developer auth / login" },
    ],
  },
  {
    label: "Apps and extension surfaces",
    options: [
      { value: "livechat_web", label: "StreamSuites LiveChat web app" },
      { value: "livechat_launcher", label: "LiveChat Launcher extension" },
      { value: "desktop_admin_winforms", label: "WinForms Desktop Admin" },
      { value: "desktop_admin_wpf", label: "WPF Desktop Admin replacement path" },
      { value: "alerts_app", label: "StreamSuites Alerts App" },
    ],
  },
  {
    label: "Shared platform systems",
    options: [
      { value: "auth_session_system", label: "Auth / login / session system" },
      { value: "auth_api", label: "Auth API" },
      { value: "public_profile_policy", label: "Public profile / slug / FindMeHere policy" },
      { value: "notifications_alerting", label: "Shared notifications / alerting" },
      { value: "shared_routing", label: "Shared routing / deep-link handling" },
      { value: "shared_state_exports", label: "Shared state / runtime exports mirroring" },
    ],
  },
  {
    label: "Core runtime and internal systems",
    options: [
      { value: "runtime_core", label: "Core runtime engine" },
      { value: "runtime_exports", label: "Runtime exports / published state" },
      { value: "runtime_jobs_triggers", label: "Automation / jobs / triggers" },
      { value: "runtime_ingestion", label: "Ingestion / chat / platform workers" },
      { value: "runtime_livechat_backend", label: "Unified Chat / LiveChat backend" },
    ],
  },
];

export const REPORT_SURFACE_LABELS = Object.freeze(
  REPORT_SURFACE_GROUPS.flatMap((group) => group.options).reduce((labels, option) => {
    labels[option.value] = option.label;
    return labels;
  }, { other: "Other" }),
);

export function getReportSurfaceLabel(value) {
  return REPORT_SURFACE_LABELS[value] || "";
}

export function populateReportSurfaceSelect(selectEl) {
  if (!(selectEl instanceof HTMLSelectElement)) return;
  const preservedValue = String(selectEl.value || "").trim();
  selectEl.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select surface";
  selectEl.append(placeholder);

  for (const group of REPORT_SURFACE_GROUPS) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;
    for (const optionConfig of group.options) {
      const optionEl = document.createElement("option");
      optionEl.value = optionConfig.value;
      optionEl.textContent = optionConfig.label;
      optgroup.append(optionEl);
    }
    selectEl.append(optgroup);
  }

  const otherOption = document.createElement("option");
  otherOption.value = "other";
  otherOption.textContent = "Other";
  selectEl.append(otherOption);

  if (preservedValue && (getReportSurfaceLabel(preservedValue) || preservedValue === "other")) {
    selectEl.value = preservedValue;
  }
}
