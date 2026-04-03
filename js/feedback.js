import { fetchJson, fetchMe, setVoteToken } from "./api.js";
import { initConsolePage } from "./auth.js";

const requestListEl = document.getElementById("request-list");
const requestStatusEl = document.getElementById("request-status");
const formEl = document.getElementById("feedback-form");
const formStatusEl = document.getElementById("feedback-form-status");
const accountContextEl = document.getElementById("feedback-account-context");

function renderRequests(items) {
  if (!requestListEl) return;
  if (!Array.isArray(items) || !items.length) {
    requestListEl.innerHTML = `<div class="request-card"><p class="muted">No approved requests are available yet.</p></div>`;
    return;
  }
  requestListEl.innerHTML = items.map((item) => {
    const preview = String(item.body || "").slice(0, 260);
    return `<article class="request-card"><div class="request-meta"><span>${item.created_by_display_name || "StreamSuites user"}</span><span>${item.implemented ? "Implemented" : "Approved"}</span><span>${item.vote_count || 0} vote${Number(item.vote_count || 0) === 1 ? "" : "s"}</span></div><h3>${item.title || "Untitled request"}</h3><p class="muted">${preview}${preview.length >= 260 ? "..." : ""}</p><div class="card-actions"><button class="soft-button" data-vote-id="${item.id}">Upvote</button></div></article>`;
  }).join("");
  requestListEl.querySelectorAll("[data-vote-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.getAttribute("data-vote-id");
      button.setAttribute("disabled", "disabled");
      try {
        const payload = await fetchJson(`/api/public/requests/${encodeURIComponent(id)}/vote`, { method: "POST" });
        setVoteToken(payload.vote_token || "");
        await loadRequests();
      } catch (error) {
        requestStatusEl.textContent = error.message;
        requestStatusEl.className = "status-line error";
      } finally {
        button.removeAttribute("disabled");
      }
    });
  });
}

async function loadRequests() {
  requestStatusEl.textContent = "Loading approved request board...";
  requestStatusEl.className = "status-line";
  try {
    const payload = await fetchJson("/api/public/requests");
    renderRequests(payload.requests || []);
    requestStatusEl.textContent = "Approved requests are live from the authoritative runtime.";
    requestStatusEl.className = "status-line success";
  } catch (error) {
    requestStatusEl.textContent = error.message;
    requestStatusEl.className = "status-line error";
  }
}

async function initFormAccountContext() {
  const me = await fetchMe();
  if (!accountContextEl) return;
  if (!me?.authenticated) {
    accountContextEl.innerHTML = `<p class="muted">You can submit anonymously, or sign in to attach account context automatically.</p>`;
    return;
  }
  accountContextEl.innerHTML = `<div class="inline-account"><strong>${me.display_name || "Signed in"}</strong><div class="muted">${me.email || "Authenticated StreamSuites account"} · ${me.role || "account"}</div></div>`;
}

formEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatusEl.textContent = "Submitting feedback...";
  formStatusEl.className = "status-line";
  const formData = new FormData(formEl);
  try {
    await fetchJson("/api/public/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feedback_type: formData.get("feedback_type"),
        title: formData.get("title"),
        body: formData.get("body"),
        summary: formData.get("summary"),
        contact_name: formData.get("contact_name"),
        contact_email: formData.get("contact_email"),
        source_route: "/feedback/",
      }),
    });
    formEl.reset();
    formStatusEl.textContent = "Feedback submitted. It is now in the authoritative review queue.";
    formStatusEl.className = "status-line success";
  } catch (error) {
    formStatusEl.textContent = error.message;
    formStatusEl.className = "status-line error";
  }
});

await initConsolePage({ navKey: "feedback" });
await initFormAccountContext();
await loadRequests();
