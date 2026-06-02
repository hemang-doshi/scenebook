export function ThemeInitScript() {
  const script = `
(function () {
  try {
    var stored = window.localStorage.getItem("scenebook-theme");
    var theme = stored === "light" || stored === "dark" ? stored : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
