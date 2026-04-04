const DEFAULT_AUTH_API_ORIGIN = "https://api.streamsuites.app";

function resolveUpstreamOrigin(env) {
  const raw = String(env?.STREAMSUITES_API_ORIGIN || DEFAULT_AUTH_API_ORIGIN).trim();
  try {
    const parsed = new URL(raw);
    parsed.pathname = "/";
    parsed.search = "";
    parsed.hash = "";
    return parsed;
  } catch {
    return new URL(DEFAULT_AUTH_API_ORIGIN);
  }
}

function isPathAllowed(pathname, allowedMatchers) {
  return allowedMatchers.some((matcher) => matcher instanceof RegExp ? matcher.test(pathname) : String(matcher || "").trim() === pathname);
}

function cloneResponseHeaders(sourceHeaders) {
  const headers = new Headers();
  for (const [name, value] of sourceHeaders.entries()) {
    if (name.toLowerCase() === "set-cookie") continue;
    headers.append(name, value);
  }
  if (typeof sourceHeaders.getSetCookie === "function") {
    const setCookies = sourceHeaders.getSetCookie();
    for (const value of setCookies) {
      headers.append("Set-Cookie", value);
    }
  } else {
    const setCookie = sourceHeaders.get("Set-Cookie");
    if (setCookie) headers.append("Set-Cookie", setCookie);
  }
  headers.set("Cache-Control", "no-store");
  return headers;
}

export async function proxyAuthApiRequest(context, allowedMatchers) {
  const requestUrl = new URL(context.request.url);
  if (!isPathAllowed(requestUrl.pathname, allowedMatchers)) {
    return Response.json({ success: false, error: "Not Found" }, { status: 404 });
  }
  const upstreamOrigin = resolveUpstreamOrigin(context.env);
  const upstreamUrl = new URL(requestUrl.pathname + requestUrl.search, upstreamOrigin);
  const headers = new Headers(context.request.headers);
  headers.delete("host");
  headers.set("x-streamsuites-proxy-origin", requestUrl.origin);
  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    method: context.request.method,
    headers,
    body: ["GET", "HEAD"].includes(context.request.method) ? undefined : context.request.body,
    redirect: "manual",
  });
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: cloneResponseHeaders(upstreamResponse.headers),
  });
}
