# クルーアセント / Perspective デザイン版

2026年9月9日。提供ZIPを元にした改修版です。元ZIPは変更していません。

2026年9月11日：UI/UXを再設計。全74ページの共通デザイン、トップ、料金、診断入口、ヒアリング、タイプ検索を改修しました。評価と実ブラウザ検証の記録は [UIUX-REVIEW-2027.md](docs/UIUX-REVIEW-2027.md) にまとめています。

GitHubの保存先は `shirokuma0011/ClaudeCode-CrewAscent` の `codex/uiux-2027` ブランチです。mainにある別の改修を保持するため、このブランチに独立して保存しています。ここではサイトHTMLはルートにあり、`site/` 配下ではありません。診断は提供資料に基づく16問・84問版です。

- サイト本体：`index.html`、全74 HTMLページ
- 無料シート：`contact.html`
- 1時間・1名の予約：`booking.html`
- 運営管理：`admin.html`
- 4プランの決済確認：`checkout-first.html` / `checkout-simple.html` / `checkout-standard.html` / `checkout-omakase.html`
- 契約書8種類：`contracts/`（印刷・PDF保存対応のHTMLと編集用Markdown）
- 評価と改修内容：`docs/REVIEW.md`
- 運用・接続手順：`docs/OPERATIONS.md`
- 本番に向けた確定事項：`docs/LAUNCH-SETTINGS.md`

## 実行

Node.js 24以降が必要です。ページ閲覧・診断の大部分はHTML/CSS/JavaScriptを維持し、保存・予約・決済にサーバーを追加しました。

```sh
npm ci
npm run dev
```

`http://127.0.0.1:4310/` を開きます。実行時に第三者製のサーバーパッケージは不要です。Drizzleはデータベースの変更定義を生成する開発用依存です。

初回は `.env.example` を `.env.local` にコピーし、`ADMIN_PASSWORD`（24文字以上）と `SESSION_SECRET`（32文字以上）にそれぞれ十分にランダムな値を設定してください。今回の作業フォルダには設定済みです。**配布ZIP・ソース管理にはパスワード、環境設定、保存データを含めていません。**

```sh
npm test
npm run check
npm run build
```

`dist/` にサーバーと公開アセットを出力します。SitesではWorkers + D1、ローカルでは同じAPIをNode + SQLiteで動かします。D1の定義は `db/schema.ts`、履歴は `drizzle/`。本番で適用済みのマイグレーションは書き換えません。

## 現在の状態

確認用・所有者限定のサイトです。シート・予約はサーバーに保存しますが、Shopify決済とメール通知は未接続です。空き枠は運営者が登録してから公開されます。架空の営業日や予約枠を初期投入していません。

価格の税区分、正式事業者情報、最終契約文、データ保管期間が未確定です。全ページの `noindex` を維持しています。契約書は**草案**であり、署名済みの契約書や法的な有効性の保証ではありません。

## 旧資料との関係

ZIP内の過去の制作レポートは経緯の資料として残しました。今回の仕様・検証結果は `docs/` が正本です。過去資料にある「静的のみ」「Googleフォーム必須」「21ページ」「以前の検証数」等は今回版の運用説明として使いません。

`tools/upgrade.py`、`commerce-pages.py`、`legal-pages.py`、`admin-page.py` は今回改修のための一度限りの変換記録です。納品後の通常ビルドでは実行しません。今後は実際のHTML/CSS/JavaScriptを編集して `npm run build` を実行してください。
