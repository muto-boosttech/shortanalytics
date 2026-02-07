/**
 * Markdownテキストをプレーンテキストに変換する（PDF/PPTX用）
 * テーブル、見出し、太字、リストなどを処理
 */
export function markdownToPlainText(md: string): string {
  let text = md;
  // Remove bold/italic markers
  text = text.replace(/\*\*(.+?)\*\*/g, "$1");
  text = text.replace(/\*(.+?)\*/g, "$1");
  // Remove headers markers but keep text
  text = text.replace(/^#{1,6}\s+/gm, "");
  // Clean up extra whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/**
 * Markdownからテーブルを抽出する
 * Returns array of { headers: string[], rows: string[][] }
 */
export function extractMarkdownTables(md: string): { headers: string[]; rows: string[][] }[] {
  const tables: { headers: string[]; rows: string[][] }[] = [];
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    // Check if this line looks like a table header (contains |)
    if (line.startsWith("|") && line.endsWith("|")) {
      // Check if next line is separator (|---|---|)
      if (i + 1 < lines.length && /^\|[\s\-:]+\|/.test(lines[i + 1].trim())) {
        const headers = line
          .split("|")
          .filter((c) => c.trim() !== "")
          .map((c) => c.trim());

        const rows: string[][] = [];
        let j = i + 2; // Skip header and separator
        while (j < lines.length) {
          const rowLine = lines[j].trim();
          if (!rowLine.startsWith("|") || !rowLine.endsWith("|")) break;
          const cells = rowLine
            .split("|")
            .filter((c) => c.trim() !== "")
            .map((c) => c.trim());
          rows.push(cells);
          j++;
        }

        if (rows.length > 0) {
          tables.push({ headers, rows });
        }
        i = j;
        continue;
      }
    }
    i++;
  }

  return tables;
}

/**
 * Markdownからセクション（見出し+本文）を抽出する
 */
export function extractMarkdownSections(md: string): { title: string; content: string; level: number }[] {
  const sections: { title: string; content: string; level: number }[] = [];
  const lines = md.split("\n");
  let currentSection: { title: string; content: string; level: number } | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headerMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: headerMatch[2].replace(/\*\*/g, ""),
        content: "",
        level: headerMatch[1].length,
      };
    } else if (currentSection) {
      currentSection.content += line + "\n";
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}
