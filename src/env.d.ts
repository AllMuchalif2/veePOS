/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  turnstile?: {
    render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void; "error-callback"?: () => void; theme?: "light" | "dark" | "auto"; }) => string;
    reset: (widgetId?: string) => void;
  };
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
