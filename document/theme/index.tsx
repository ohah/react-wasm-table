import { Layout as BasicLayout } from "@rspress/core/theme-original";
import { usePageData } from "@rspress/core/runtime";
import { Benchmark } from "demo";

const hideHeroCSS = `
.rp-home-hero,
.rp-home-hero--no-image,
.rp-home-background {
  display: none !important;
  min-height: 0 !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}
.rp-home-feature {
  padding-top: 3rem;
}
`;

function BenchmarkSection() {
  return (
    <section style={{ maxWidth: 1152, margin: "0 auto", padding: "2rem 1.5rem 0" }}>
      <Benchmark />
    </section>
  );
}

function Layout() {
  const { page } = usePageData();
  const isHome = page?.pageType === "home";

  return (
    <>
      {isHome && <style>{hideHeroCSS}</style>}
      <BasicLayout beforeFeatures={isHome ? <BenchmarkSection /> : undefined} />
    </>
  );
}

export { Layout };
export * from "@rspress/core/theme-original";
