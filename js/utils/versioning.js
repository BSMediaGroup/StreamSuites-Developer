(() => {
  "use strict";

  const Versioning = {
    _cache: null,

    resolveMetaUrl() {
      return "/runtime/exports/version.json";
    },

    async loadVersion() {
      if (this._cache) return this._cache;

      this._cache = (async () => {
        try {
          const res = await fetch(this.resolveMetaUrl(), { cache: "no-store" });
          if (!res.ok) {
            console.warn("[Versioning] Meta export unavailable", res.status);
            return null;
          }

          const data = await res.json();
          if (!data || typeof data !== "object") return null;

          const info = {
            project: data?.project || data?.meta?.project || "StreamSuites",
            version: data?.version || data?.meta?.version || "",
            build: data?.build || data?.meta?.build || "",
            generated_at: data?.generated_at || data?.meta?.generated_at || "",
            source: data?.source || data?.meta?.source || ""
          };

          if (!info.version) return null;

          window.StreamSuitesVersion = info;
          return info;
        } catch (err) {
          console.warn("[Versioning] Failed to load runtime version metadata", err);
          this._cache = null;
          return null;
        }
      })();

      return this._cache;
    },

    async fetchVersionData() {
      return this.loadVersion();
    },

    formatDisplayVersion(info) {
      if (!info || !info.version) return "Unavailable";
      const name = info.project || "StreamSuites";
      const versionLabel = info.version.startsWith("v")
        ? info.version
        : `v${info.version}`;
      const build = info.build ? ` (build ${info.build})` : "";
      return `${name} ${versionLabel}${build}`.trim();
    }
  };

  window.Versioning = Versioning;
})();
