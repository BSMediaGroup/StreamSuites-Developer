import { DEFAULT_AFTER_LOGIN_PATH } from "./config.js";

const params = new URLSearchParams(window.location.search);
const next = params.get("return_to") || params.get("next") || new URL(DEFAULT_AFTER_LOGIN_PATH, window.location.origin).toString();
document.getElementById("success-next-link").setAttribute("href", next);
setTimeout(() => { window.location.assign(next); }, 1200);
