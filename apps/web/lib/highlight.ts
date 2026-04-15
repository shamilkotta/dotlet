import { createHighlighter } from "shiki";

const LIGHT_THEME = "github-light";
const DARK_THEME = "github-dark";

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [LIGHT_THEME, DARK_THEME],
      langs: ["text"],
    });
  }
  return highlighterPromise;
}

function escapeRawGt(html: string): string {
  return html.replace(/>([^<]*)/g, (_match, textContent: string) => {
    const escapedText = textContent.replace(/>/g, "&gt;");
    return `>${escapedText}`;
  });
}

function wrapPlainLines(code: string): string {
  const lines = code.split("\n");
  const wrappedLines = lines
    .map((line) => {
      const escaped = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<span class="line">${escaped}</span>`;
    })
    .join("");
  return `<pre class="shiki github-dark"><code>${wrappedLines}</code></pre>`;
}

function postProcessShikiHtml(html: string): string {
  if (html.includes('<span class="line">')) {
    return html.replace(/<\/span>\n<span class="line">/g, '</span><span class="line">');
  }
  const codeMatch = html.match(/<code[^>]*>([\s\S]*)<\/code>/);
  if (codeMatch?.[1]) {
    const codeContent = codeMatch[1];
    const lines = codeContent.split("\n");
    const wrappedLines = lines
      .map((line: string, i: number) => {
        if (i === lines.length - 1 && line === "") return null;
        return `<span class="line">${line}</span>`;
      })
      .filter((line: string | null): line is string => line !== null)
      .join("");
    return html.replace(codeMatch[1], wrappedLines);
  }
  return html;
}

export async function highlightCode(code: string, language: string, theme: "light" | "dark") {
  const highlighter = await getHighlighter();

  let lang = language;
  try {
    await highlighter.loadLanguage(lang as Parameters<typeof highlighter.loadLanguage>[0]);
  } catch {
    lang = "text";
  }

  try {
    let html = highlighter.codeToHtml(code, {
      lang: lang,
      themes: {
        light: LIGHT_THEME,
        dark: DARK_THEME,
      },
      defaultColor: theme,
    });
    html = escapeRawGt(html);
    return postProcessShikiHtml(html);
  } catch {
    return wrapPlainLines(code);
  }
}
