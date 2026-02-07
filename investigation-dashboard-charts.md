# ダッシュボード グラフ表示問題 調査

## 問題1: コンテンツ類型別ER と フック別再生数 が空白

### 添付画像の比較
- **1枚目（現在のサイト）**: Instagramタブ選択、フィットネス業種。総動画数2、総再生数96.3K。コンテンツ類型別ERとフック別再生数が空白。
- **2枚目（参考サイト）**: TikTokタブ選択、フィットネス業種。総動画数255、総再生数56.5M。グラフが正常に表示。

### 原因分析
- 1枚目はInstagramで動画数が2件しかない → videoTagsにcontentTypeやhookTypeが設定されていない可能性が高い
- auto-tagがInstagramの動画に対して正しく動作していない可能性
- または、Instagramの動画データにvideoTagsが紐づいていない

### 確認ポイント
1. dashboard APIがcontentTypeStats/hookTypeStatsを返しているか
2. videoTagsテーブルにInstagram動画のタグデータがあるか
3. auto-tag APIがInstagram動画にも対応しているか

## 問題2: TikTokデータの日本国内限定
- 現在のTikTokデータは海外データが多い
- 日本国内のデータのみに絞る必要がある
- 方法: 
  - Apify収集時に日本のハッシュタグのみ使用（既に設定済み？）
  - 動画のauthorRegionやlanguageでフィルタ
  - DBにcountry/regionフィールドを追加してフィルタ
