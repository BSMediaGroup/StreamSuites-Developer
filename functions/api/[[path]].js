import { proxyAuthApiRequest } from "../_shared/auth-api-proxy.js";

const ALLOWED_API_PATHS = [
  "/api/me",
  "/api/public/feedback",
  "/api/public/beta/apply",
  /^\/api\/public\/requests(?:\/.*)?$/,
  /^\/api\/developer\/reports(?:\/.*)?$/,
];

export async function onRequest(context) {
  return proxyAuthApiRequest(context, ALLOWED_API_PATHS);
}
