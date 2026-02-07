# パフォーマンス分析結果

## ボトルネック特定

### 1. Google Fonts (Noto Sans JP) - レンダーブロッキング
- globals.css の1行目で `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap')` を読み込み
- CSSの@importはレンダーブロッキング → 4ウェイト分のフォントファイルをダウンロード
- Noto Sans JPは日本語フォントで非常に大きい（各ウェイト数百KB〜数MB）

### 2. 動画ファイル (17MB)
- public/videos/demo.mp4 が17MB
- signupページで2箇所で参照されている
- モバイルでは自動再生が制限されるため、poster画像に置き換えるべき

### 3. signupページが1321行の巨大コンポーネント
- 'use client'の単一コンポーネント
- lucide-reactから29個のアイコンをインポート
- すべてが初期レンダリングで必要ではない

### 4. 画像最適化
- screenshot-ranking2.png: 116KB (PNG)
- screenshot-dashboard.png: 52KB (PNG)
- logo.png: 28KB (PNG)
- Next.js Imageコンポーネントは使用しているがWebP変換が効いているか要確認

### 5. next.config.ts が空
- 最適化設定なし（swcMinify, compress等）

## 改善計画
1. Google Fonts → next/fontに変更（レンダーブロッキング解消）
2. 動画をlazyロード + poster画像
3. 画像をWebPに変換
4. signupページをコンポーネント分割 + dynamic import
5. next.config.tsに最適化設定追加
6. 不要なSVGファイル削除
