# 業種・ハッシュタグ管理の調査結果

## 既存のAPI構成
- `GET /api/industries` - 全業種一覧取得（_countでハッシュタグ数・動画タグ数含む）
- `POST /api/industries` - 新規業種作成（name, slug）
- `GET /api/industries/[id]/hashtags` - 業種のハッシュタグ一覧
- `POST /api/industries/[id]/hashtags` - ハッシュタグ追加（hashtag, isActive）
- `GET /api/industries/[id]/hashtags/[hashtagId]` - 個別ハッシュタグ取得
- `PATCH /api/industries/[id]/hashtags/[hashtagId]` - ハッシュタグ更新（hashtag, isActive）
- `DELETE /api/industries/[id]/hashtags/[hashtagId]` - ハッシュタグ削除

## DBモデル
- Industry: id, name, slug, createdAt
- IndustryHashtag: id, industryId, hashtag, isActive, platform(default: tiktok)

## 既存APIの問題点
1. 認証チェックがない → マスター管理者のみに制限する必要あり
2. POST /api/industries/[id]/hashtags にplatformパラメータがない → 追加必要
3. 業種の削除API（DELETE /api/industries/[id]）がない → 追加必要
4. 業種の更新API（PATCH /api/industries/[id]）がない → 追加必要

## データ収集との連携
- cron daily-update → /api/industries で業種一覧取得 → 各業種ごとにcollect/collect-youtube/collect-instagramを呼び出し
- collect APIはbodyの { hashtags, industryId } を受け取る
  - hashtagsが渡されない場合、DBからindustryHashtagを取得する仕組みが必要
- collect-youtube, collect-instagramも同様

## 必要な作業
1. 既存APIにマスター管理者認証を追加
2. 業種の更新・削除APIを追加
3. ハッシュタグ追加時にplatformを指定できるように修正
4. マスター管理者向け管理画面UIを作成
5. データ収集APIがDBのハッシュタグを参照するように確認
