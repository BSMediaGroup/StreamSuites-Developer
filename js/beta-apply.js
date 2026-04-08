import { fetchJson } from "./api.js";
import { createInlineTurnstileController, initStandalonePage } from "./auth.js";

const formEl = document.getElementById("beta-apply-form");
const statusEl = document.getElementById("beta-apply-status");
const turnstileController = createInlineTurnstileController({
  panel: document.getElementById("beta-apply-turnstile-panel"),
  slot: document.getElementById("beta-apply-turnstile"),
  status: document.getElementById("beta-apply-turnstile-status"),
});

await initStandalonePage({ navKey: "beta" });
await turnstileController.init().catch(() => {
  // The controller handles inline status messaging when the widget cannot load.
});

formEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(formEl);
  statusEl.textContent = "Submitting beta application...";
  statusEl.className = "status-line";
  try {
    const turnstileToken = await turnstileController.requireToken();
    if (turnstileController.isEnabled() && !turnstileToken) {
      statusEl.textContent = "Complete the security check before submitting.";
      statusEl.className = "status-line error";
      return;
    }
    await fetchJson("/api/public/beta/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_name: formData.get("contact_name"),
        contact_email: formData.get("contact_email"),
        beta_motivation: formData.get("beta_motivation"),
        experience_summary: formData.get("experience_summary"),
        testing_environment: formData.get("testing_environment"),
        product_usage: formData.get("product_usage"),
        timezone: formData.get("timezone"),
        platforms: formData.get("platforms"),
        turnstile_token: turnstileToken,
        source_route: "/beta/apply/",
      }),
    });
    formEl.reset();
    turnstileController.reset();
    statusEl.textContent = "Application submitted. StreamSuites now has it in the beta review queue.";
    statusEl.className = "status-line success";
  } catch (error) {
    if (turnstileController.isEnabled()) {
      turnstileController.reset();
    }
    statusEl.textContent = error.message;
    statusEl.className = "status-line error";
  }
});
