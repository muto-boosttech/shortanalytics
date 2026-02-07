/**
 * 日本国内コンテンツ判定ユーティリティ
 * TikTokデータを日本国内に限定するためのフィルタ
 */

/**
 * テキストに日本語（ひらがな・カタカナ・漢字）が含まれるかを判定
 */
export function containsJapanese(text: string | null | undefined): boolean {
  if (!text) return false;
  // ひらがな (U+3040-U+309F), カタカナ (U+30A0-U+30FF), CJK統合漢字 (U+4E00-U+9FFF)
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
}

/**
 * 動画が日本国内コンテンツかどうかを判定
 * description または hashtags に日本語が含まれていれば日本国内と判定
 */
export function isJapaneseContent(
  description: string | null | undefined,
  hashtags: string[] | null | undefined
): boolean {
  // descriptionに日本語が含まれるか
  if (containsJapanese(description)) return true;

  // hashtagsに日本語が含まれるか
  if (hashtags && Array.isArray(hashtags)) {
    for (const tag of hashtags) {
      if (containsJapanese(tag)) return true;
    }
  }

  return false;
}

/**
 * PostgreSQLのRaw SQLで日本語フィルタを適用するためのWHERE句
 * Prisma rawクエリで使用可能
 */
export const JAPANESE_CONTENT_SQL_CONDITION = `
  (description ~ '[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]'
   OR EXISTS (
     SELECT 1 FROM unnest(hashtags) AS h
     WHERE h ~ '[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]'
   ))
`;
