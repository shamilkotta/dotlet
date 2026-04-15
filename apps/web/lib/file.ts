const FILE_NAME_TO_LANGUAGE: Record<string, string> = {
  ".vimrc": "vim",
  ".zshrc": "shellscript",
  ".bashrc": "shellscript",
  ".bash_profile": "shellscript",
  ".profile": "shellscript",
  makefile: "make",
  dockerfile: "docker",
};

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  md: "markdown",
  mdx: "mdx",
  css: "css",
  scss: "scss",
  html: "html",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  ini: "ini",
  conf: "ini",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  fish: "fish",
  vim: "vim",
  lua: "lua",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  rb: "ruby",
  sql: "sql",
  xml: "xml",
  txt: "text",
};

const LANGUAGE_LABELS: Record<string, string> = {
  shellscript: "Shell Script",
  vim: "Vim Script",
  tsx: "TSX",
  jsx: "JSX",
  typescript: "TypeScript",
  javascript: "JavaScript",
  markdown: "Markdown",
  text: "Plain Text",
};

export function getLanguageFromPath(path: string): string {
  const normalized = path.toLowerCase();
  const fileName = normalized.split("/").pop() ?? normalized;

  if (FILE_NAME_TO_LANGUAGE[fileName]) {
    return FILE_NAME_TO_LANGUAGE[fileName]!;
  }

  if (fileName.startsWith(".") && FILE_NAME_TO_LANGUAGE[fileName]) {
    return FILE_NAME_TO_LANGUAGE[fileName]!;
  }

  const extension = fileName.includes(".") ? fileName.split(".").pop() : null;
  if (extension && EXTENSION_TO_LANGUAGE[extension]) {
    return EXTENSION_TO_LANGUAGE[extension]!;
  }

  return "text";
}

export function getLanguageLabel(language: string): string {
  if (LANGUAGE_LABELS[language]) {
    return LANGUAGE_LABELS[language]!;
  }

  return language
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const MAX_INLINE_FILE_SIZE_BYTES = 3 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
