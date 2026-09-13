# 見本サイト（仮の実績）を有効にする手順

現在は**受け皿だけを作った状態**です。`data/works.json` の `items` が空なので、
`works.html` は「見本サイトは準備中です」と表示し、ナビゲーションからはリンクされていません。

---

## 1. 見本サイトを1件足す

`data/works.json` の `items` に追記します。これだけで `works.html` に並びます。

```json
{
  "items": [
    {
      "id": "sample-dental",
      "name": "さくら通り歯科（架空）",
      "industry": "歯科医院",
      "typeId": "CA21",
      "typeName": "親切案内型サイト",
      "plan": "標準",
      "pages": "5ページ",
      "summary": "初めての人が迷わず予約まで進めることを最優先にした構成です。",
      "points": ["診療時間と予約導線を最上部に", "初診の流れを段階で提示", "料金の目安を先に開示"],
      "thumb": "assets/img/works/sample-dental.webp",
      "url": "samples/sample-dental/index.html"
    }
  ]
}
```

- `thumb` は 1600×1000 推奨。**未設定でも動きます**（「図版準備中」と出ます）
- `url` は相対パスでも絶対URLでも可。**未設定ならリンクなしのカード**になります
- 完成版サイト本体は `samples/<id>/` に置くのが分かりやすいです

---

## 2. 表示ルールは消せません

設計書の方針に合わせ、**「架空の事業を想定した見本」の表示は `assets/js/works.js` 側で強制**しています。
サムネイル左上のバッジと本文の注記の2か所に必ず出ます。JSON側で消すことはできません。

---

## 3. ナビゲーションに出す（3か所）

`items` に1件以上入れてから、全ページ共通のヘッダー／フッターへ追加します。
ヘッダーとフッターは全20ページに同じHTMLが入っているので、一括置換が確実です。

**(1) メガメニュー「サービス」に追加**

`<li><a href="management.html">…</a></li>` の直後へ:

```html
<li><a href="works.html"><span class="mega__ttl">見本サイト</span><span class="mega__note">架空の事業を想定した見本</span></a></li>
```

**(2) モバイルドロワー「サービス」に追加**

`<li><a href="management.html">公開・管理<span>…</span></a></li>` の直後へ:

```html
<li><a href="works.html">見本サイト<span>架空の事業を想定した見本</span></a></li>
```

**(3) フッター「サイト」に追加**

`<li><a href="services.html">Web制作サービス</a></li>` の直後へ:

```html
<li><a href="works.html">見本サイト</a></li>
```

---

## 4. TOPページに載せる（任意）

TOPに出す場合は、`index.html` の `07 Guides` の直前に章を1つ足します。
`data-works="3"` は「最大3件だけ出す」の意味です。`data-works-host` と
`data-works-hide-empty` を付けておくと、**itemsが空のあいだは章ごと消えます**。

```html
<section class="sec sec--paper2" id="works" data-works-host data-works-hide-empty>
  <div class="gridlines" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
  <div class="wrap">
    <div class="opener">
      <div class="opener__top">
        <span class="opener__no">07</span><span class="lbl">Chapter</span>
        <span class="opener__ja">／見本サイト</span>
      </div>
      <span class="opener__rule rvl" aria-hidden="true"><i></i></span>
      <span class="opener__en rvm"><span>Samples</span></span>
      <div class="g6 opener__body">
        <div class="c1-4"><h2 class="sec-title rvm"><span>実際の画面で、仕上がりを確かめてください。</span></h2></div>
        <div class="c5-6 rv rv-d1"><p class="sec-lead">すべて架空の事業を想定した見本です。実在の顧客・実績ではありません。</p></div>
      </div>
    </div>
    <div class="rv" data-works="3"></div>
    <div class="btn-row btn-row--mt rv"><a class="btn btn--line" href="works.html">見本サイトを全部見る<svg class="ico" aria-hidden="true"><use href="#i-arrow"></use></svg></a></div>
  </div>
</section>
```

追加したら `index.html` に `<script defer src="assets/js/works.js"></script>` を足し、
以降の章番号（現 07 Guides）を 08 へ繰り上げ、左端の章索引 `.chapidx` にも1行足してください。

---

## 5. 注意（ローカルで開くとき）

`works.js` は `fetch()` で `data/works.json` を読みます。
**ファイルを直接ダブルクリックで開くと CORS で読めません。**
確認するときは簡易サーバーを立ててください。

```
cd crew-ascent
python3 -m http.server 8000
# → http://localhost:8000/works.html
```

公開後のサーバー上では問題ありません。
