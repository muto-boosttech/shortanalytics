/**
 * TikTok動画のサムネイルURLを生成するユーティリティ
 * 
 * TikTokの動画IDからサムネイル画像のURLを生成します。
 * 複数のフォールバックURLを提供し、画像が読み込めない場合に対応します。
 */

/**
 * TikTok動画IDからサムネイルURLの候補を生成
 * @param videoId TikTok動画ID
 * @returns サムネイルURLの配列（優先順位順）
 */
export function getTikTokThumbnailUrls(videoId: string): string[] {
  if (!videoId) return [];
  
  // TikTokのサムネイルURL形式（複数のパターンを試行）
  return [
    // パターン1: 動的サムネイル（最も一般的）
    `https://www.tiktok.com/api/img/?itemId=${videoId}&location=0`,
    // パターン2: 静的サムネイル
    `https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/${videoId}~tplv-dmt-logom:tos-maliva-p-0000-aiso/${videoId}.image`,
  ];
}

/**
 * プレースホルダー画像のURLを生成
 * @param width 幅
 * @param height 高さ
 * @param text テキスト
 * @returns プレースホルダー画像URL
 */
export function getPlaceholderImage(width: number = 270, height: number = 480, text: string = 'TikTok'): string {
  // グラデーション背景のSVGプレースホルダー
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366F1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#EC4899;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="24" font-weight="bold">TikTok</text>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="sans-serif" font-size="14">動画</text>
    </svg>
  `.trim();
  
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
