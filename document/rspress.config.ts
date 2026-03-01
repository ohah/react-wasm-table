import * as path from "node:path";
import { defineConfig, type UserConfig } from "@rspress/core";
import { pluginTwoslash } from "@rspress/plugin-twoslash";
import pluginMermaid from "rspress-plugin-mermaid";
import pluginFileTree from "rspress-plugin-file-tree";

const base = "/react-wasm-table/";

const config: UserConfig = {
  root: path.join(__dirname, "docs"),
  base,
  globalStyles: path.join(__dirname, "tailwind.css"),
  plugins: [pluginTwoslash(), pluginMermaid(), pluginFileTree()],
  title: "react-wasm-table",
  description: "High-performance React table component powered by Rust/WASM",
  lang: "en",
  logo: `${base}logo.svg`,
  logoText: "react-wasm-table",
  locales: [
    {
      lang: "en",
      label: "English",
      title: "react-wasm-table",
      description: "High-performance React table component powered by Rust/WASM",
    },
    {
      lang: "ko",
      label: "한국어",
      title: "react-wasm-table",
      description: "Rust/WASM 기반 고성능 React 테이블 컴포넌트",
    },
  ],
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: `${base}logo.svg` }],
    ["link", { rel: "stylesheet", href: `${base}custom.css` }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "react-wasm-table" }],
  ],
  themeConfig: {
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/ohah/react-wasm-table",
      },
    ],
  },
  route: {
    cleanUrls: true,
  },
  builderConfig: {
    server: {
      port: 12330,
    },
    output: {
      distPath: {
        root: "doc_build",
      },
    },
    resolve: {
      alias: {
        "@ohah/react-wasm-table": path.resolve(__dirname, "../packages/grid/src/index.ts"),
        "@": path.resolve(__dirname, "src"),
      },
    },
  },
};

export default defineConfig(config);
