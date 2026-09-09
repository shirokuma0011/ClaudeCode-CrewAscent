このフォルダの書体について

同梱書体（CSS上の呼び名 → 実体）
  CA Sans 400/700  →  CASans-400.woff2 / CASans-700.woff2   （Noto Sans JP）
  CA Mono 400/700  →  CAMono-400.woff2 / CAMono-700.woff2   （JetBrains Mono）

  CSSでは "CA Sans" / "CA Mono" という総称で参照している。
  将来ライセンス書体へ差し替える場合、base.css の @font-face の
  src だけを変えればサイト全体に反映される。

ライセンス
  いずれも SIL Open Font License 1.1。商用利用可、Web埋め込み可。
  全文は OFL-NotoSansJP.txt / OFL-JetBrainsMono.txt を参照。
  CDNは使わず、このフォルダから自己ホストしている。

サブセットについて
  サイト内の全HTML/JSで実際に使われている文字と、
  ASCII・ひらがな・カタカナ・和文約物・全角英数の全域を含めている。
  収録字数 1,356字（うち漢字841字）。4ファイル合計 約380KB。

  原稿を差し替えて未収録の漢字が出た場合、その1文字だけ
  OSの既定フォントで表示される（ページは壊れない）。
  文章を大きく入れ替えたときは、下記の手順でサブセットを作り直すこと。

再生成の手順
  1. pip install fonttools brotli
  2. サイト内の全HTML/JSから使用文字を集めて subset.txt を作る
  3. python3 -m fontTools.varLib.instancer NotoSansJP[wght].ttf wght=400 -o noto-400.ttf
  4. python3 -m fontTools.subset noto-400.ttf --text-file=subset.txt \
       --layout-features='kern,palt,vert,liga,calt' --flavor=woff2 \
       --output-file=NotoSansJP-400.woff2 --no-hinting --desubroutinize
  5. 700 も同様。JetBrains Mono は --unicodes で欧文のみ。

入手元
  Noto Sans JP  : github.com/google/fonts/tree/main/ofl/notosansjp
  JetBrains Mono: github.com/google/fonts/tree/main/ofl/jetbrainsmono
