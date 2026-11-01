# 残り59ページを第8版へ移す — 2026-11-01

オーナーの依頼「今までの内容を使用し、０から作成したクルーアセントのwebサイトを完成させてください」による。

## したこと
- 61ページすべてが同じヘッダー・フッター・書体（CA Sans／CA Serif／CA Mono）・色（黒・生成り・ブラウン）になった。
- 本文は旧ページと同じクラス名のまま、見た目を `site/assets/css/site.css` で作り直した（角丸・影なし、2px と 1px の罫線で区切る、見出しは明朝）。
- 診断の画面・結果・相談フォーム・36タイプ・業種のページの部品は `site/assets/css/app.css`。旧CSSからこれらの部品の規則だけを順番どおり抜き出し、角丸と影を外し、色の変数を置き換えたもの。末尾に第8版の上書きがある。
- 旧CSS 6本（styles / base / system / crew / atelier-top / top、約360KB）を削除。
- 生成するページ（36タイプ・一覧・業種・相談フォーム2本）は生成元の骨組み（diagnosis-guide.html・contact.html）から作り直し、`npm run check` で一致を確認。相談フォームの生成元は app.css を読むように変更。
- 4つの領域の色を、黒×ブラウンに合う落ち着いた4色（#4f6472／#6f5a6e／#5c6b4a／#8a5f33）に変えた。トップの立体の地図も同じ色。
- 13px 未満の文字は、ロゴの英字（11px）だけ。スマホで押せる範囲は 44px 以上（トップの36マスの地図のマスは約38px）。
- 確定済みの公開値（税込、支払い方法など）を `tools/apply-publish-values.mjs` で反映。氏名・住所・電話・メール・制定日は未記入のまま（公開直前に入れる）。

## ページの頭の画像（オーナーが ChatGPT で作った静物。人・手・文字・画面なし。実在の事務所の写真ではない）
| ページ | 画像 | 元 |
|---|---|---|
| サービス | head-sketch.webp | 03-wireframe-sketch-b |
| 制作の流れ | head-tracing.webp | 04-tracing-layers-a（左右反転） |
| 公開・管理 | head-key.webp | 06-stone-key-a |
| ガイド・Webサイトの役割 | head-notebook.webp | 07-open-notebook-b（左右反転） |
| 相談・フォーム2本 | head-envelope.webp | 08-envelope-a |
| クルーアセントについて | head-desk.webp | 09-desk-overhead-b |
| 診断・診断の仕組み | head-tiles.webp | 02-tiles-6x6-b |
| よくある質問 | head-cards.webp | 05-index-cards-a |
| 36タイプ一覧・業種 | head-dots.webp | 01-dot-wave-b |

ガイド一覧の記事の小さな画像も、指が写った旧画像から上の静物に替えた。

## 大きさ
- site.css 約85KB（全ページ）＋ app.css 約81KB（診断・結果・フォーム・36タイプ・業種・見本・プライバシーだけ）。1ファイル100KB以下は守れているが、app.css を読むページは合計約166KB。
- トップ PC 3,982px、料金 PC 5,494px（目標どおり）。
