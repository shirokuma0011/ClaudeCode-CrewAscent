# クルーアセント本体サイト

小規模事業者向けWebサイト制作「クルーアセント」の本体サイトです。
**静的HTML / CSS / Vanilla JavaScript のみ。ビルドは不要**で、`site/` をそのまま配信できます。

外部サービスへのログイン、APIキー、CMS、フレームワークは使いません。
書体は自前で持ち（`site/assets/fonts/`）、アニメーションも外部ライブラリなしで動きます。

---

## 置き場所

| ディレクトリ | 中身 | 公開 |
|---|---|---|
| `site/` | 公開するファイル。HTML 59ページ、CSS 5本、JS 12本、画像、書体 | **する** |
| `data/` | 正本。設問、36タイプ、業種の対応表、公開用の確定値 | しない |
| `tools/` | 生成器と検査。ここから `site/` を作る | しない |
| `docs/` | 改修の記録、公開前チェックリスト、監査 | しない |
| `tests/` | 診断エンジンの自動テスト | しない |

**公開するのは `site/` だけ**です。道具と下書きは web 上に置きません。

---

## よく使うコマンド

```bash
npm install          # 検査用に playwright を入れる（公開物には含まれません）

npm run serve        # http://127.0.0.1:8899 で site/ を配信
npm run check        # 正本との一致 + 内容検査 + sitemap・トップのタイプデータの整合（約6,300件）
npm run check:browser # 59ページ × 4画面幅を実際に開いて検査
npm test             # 診断エンジンのテスト

npm run data         # data/questions.tsv などから診断データを作り直す
npm run types        # 36タイプの個別ページと一覧を作り直す
npm run sitemap      # index にしているページだけで sitemap を作り直す
npm run atelier      # トップの36タイプ空間のデータを data/types.json・occupations.json から作り直す
npm run sample-prompts # 見本サイト10件の制作用プロンプト（ZIP）を dist/sample-prompts/ に作る
npm run questionnaires # 相談アンケート2ページを data/questionnaires.json から作り直す
```

`site/` の中で**手で編集してよいのは、生成対象でないページだけ**です。
`type-*.html` / `types.html` / `industries.html` / `assets/js/diagnosis-data.js` / `sitemap.xml`
は生成物なので、正本（`data/`）を直して作り直してください。

---

## 診断の仕組み

- **かんたん診断16問 / じっくり診断48問**。1ページ6問（16問は6・6・4の3ページ、48問は8ページ）
- 4観点（実用・情報／ブランド・魅力／王道・安心／先進・新しさ）を2軸へまとめる
  - X = ブランド・魅力 − 実用・情報
  - Y = 先進・新しさ − 王道・安心
- 座標の目盛りは **±84 固定**。16問は5.25倍、48問は1.75倍で正規化する
- 各軸を6段階に分けて **6×6＝36タイプ**
- 回答も結果も**その人の端末（localStorage）にだけ**保存する。サーバーへは送らない
- 途中の回答は30日で読み込まなくなる。記録は診断・結果・プライバシーの3ページから削除できる

**この診断は心理検査・性格診断・経営診断ではありません。**
Webサイトで何を先にするかを整理するための目安で、成果や順位は保証しません。

---

## 公開までの手順

1. `docs/PUBLISH_INPUT_SHEET.md` を読み、`data/publish-values.json` に確定値を書く
2. `npm run publish:dry` で何が変わるか確認する
3. `npm run publish:apply` で、印の置き換え・canonical・OGP・sitemap・index解禁までを反映する
4. `npm run publish:ready` で残りを確認する

**index は一度に全ページを外しません。** 基準は `tools/publish-stages.mjs` にあります。

| 段階 | ページ | 条件 |
|---|---|---|
| 1 | 基本19ページ | 公開ドメインが決定／法務コア4ページと当該ページに「公開前に確定」の印が残っていない |
| 2 | タイプ37ページ | 段階1に加えて、本文2,000字以上と `_switches.indexTypePages` が `true` |
| — | `result.html` `404.html` `works.html` | 公開後も載せない |

`sitemap.xml` は、その時点で `index,follow` のページだけで作られます。

---

## 見た目の層

第6版「Warm Atelier」。木の温かみ、自然光、深い緑、余白、編集的な文字組み。
2026-10-14 の引き継ぎパッケージのトップ案を取り込み、同じ見た目を全ページへ広げています。

- 下層ページは `base` `styles` `system` `crew` の順に読みます。**`crew.css` が最後に読まれて見た目を決めます**
- トップ（`index.html`）は `base` `system` `crew` のあとに **`atelier-top.css`** を読みます。
  トップ固有の部品はすべて `atl-` 接頭辞で、このファイルの外へ漏れません
- トップの36タイプ空間は `atelier-types.js`（データ）・`atelier-app.js`（一覧・検索・ダイアログ）・
  `atelier-spatial.js`（立体配置・キー操作）。データは `npm run atelier` で `data/types.json` から作ります。
  手で直さないでください（`npm run check` が食い違いを止めます）
- 色は 紙 `#f6f4ed`・墨緑 `#203d35`・深い緑 `#254e41`。四領域は土の色味。ページの見出し帯には部屋の写真
  （生成画像。実際の事務所ではありません）を淡く敷きます
- 見た目を直すときは `crew.css`（全ページ）か `atelier-top.css`（トップ）に書き足します。土台は触りません
- `top.css` は第6版でどのページからも読まれなくなりました（削除は確認待ち）
- 経緯と採点は `docs/IMPROVEMENT_2026-08-17.md` の §21〜§27

## 見本サイト（仮の実績）

- 10件の見本は `data/sample-sites.json` が正本。`npm run sample-prompts` で、Claude Code に渡す制作パッケージ（ZIP）を10件作ります
- パッケージはリポジトリ直下の `samples-kit/` に展開して使い、見本は `site/samples/<id>/` に出力されます（`samples-kit/` と `dist/` は git に入れません）
- 見本には必ずクルーアセントの枠（上の帯・下の案内・見本ダイアログ・設計メモ）を入れ、すべて `noindex`。事業・価格はすべて架空です
- 一覧への載せ方は `docs/WORKS_連携手順.md`

## 相談アンケート

- サイト内の2ページ: `consult-form.html`（イメージがまだ固まっていない方・15問）と `hearing-form.html`（固まっている方・16段階）
- 設問の正本は `data/questionnaires.json`。直したら `npm run questionnaires`
- 回答は確認画面のあと「メールアプリで送る」（宛先は `email`）。PHPが動くサーバーなら `server/` の受け口で直接届けることもできる（任意）
- 詳しくは `docs/CONTACT_FORM_SETUP.md`

## 守っていること

- 実在しない実績・人物・レビューを載せない
- 成果を保証しない
- 診断結果からプランを自動で決めない。4つのプランは利用者が選ぶ
- 確定していない情報は「公開前に確定」の印として残し、公開できる状態だと偽らない
- 本文とリンクは13px以上、モノスペースのラベルは12px以上（例外はロゴの英字11pxのみ）
- `prefers-reduced-motion` で動くものを0にする
