import * as path from "node:path";
import { defineConfig, type UserConfig } from "@rspress/core";

const base = "/react-wasm-table/";

const config: UserConfig = {
  root: path.join(__dirname, "docs"),
  base,
  title: "react-wasm-table",
  description: "High-performance React table component powered by Rust/WASM",
  lang: "en",
  head: [
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "react-wasm-table" }],
  ],
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
      description: "Rust/WASM 기반 고성능 React 테이블 컴포넌트 라이브러리",
    },
  ],
  themeConfig: {
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/anthropics/react-wasm-table",
      },
    ],
  },
  route: {
    cleanUrls: true,
  },
  markdown: {
    checkDeadLinks: false,
  },
  builderConfig: {
    output: {
      distPath: {
        root: "doc_build",
      },
    },
  },
};

export default defineConfig(config);
