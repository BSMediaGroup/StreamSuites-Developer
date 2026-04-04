import { fetchJson } from "./api.js";
import { initConsolePage } from "./auth.js";

const formEl = document.getElementById("report-form");
const statusEl = document.getElementById("report-status");

const page = await initConsolePage({ navKey: "reports", authRequired: true, developerRequired: true, statusTargetId: "report-status" });

if (!page.blocked) {
  formEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(formEl);
    statusEl.textContent = "Submitting report...";
    statusEl.className = "status-line";
    try {
      const submissionPayload = await fetchJson("/api/developer/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          category: formData.get("category"),
          severity: formData.get("severity"),
          affected_area: formData.get("affected_area"),
          reproduction_steps: formData.get("reproduction_steps"),
          expected_result: formData.get("expected_result"),
          actual_result: formData.get("actual_result"),
          environment_details: formData.get("environment_details"),
          platform_details: formData.get("platform_details"),
          account_context: formData.get("account_context"),
          body: formData.get("body"),
          structured_metadata: formData.get("structured_metadata"),
          source_route: "/reports/submit/",
        }),
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
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || `Attachment upload failed (${response.status})`);
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
