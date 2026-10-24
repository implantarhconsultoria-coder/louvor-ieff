import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.implantaxpro.louvorieff",
  appName: "LOUVOR IEFF",
  webDir: "../.mobile-stage/out",
  // Bundled application, not a website loaded through server.url.
  plugins: { CapacitorHttp: { enabled: true } },
  ios: { contentInset: "always" },
  android: { allowMixedContent: false }
};
export default config;
