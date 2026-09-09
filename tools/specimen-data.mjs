/* =====================================================================
   タイプごとの見本データを、そのタイプ自身の情報から組み立てる。

   新しく文章を作らず、既にあるデータ
   （情報の優先順・問い合わせまでの経路・活きる場面・デザインの言葉・根拠3点）
   を、X軸の方式に合わせて並べ替えて使います。
   ===================================================================== */

/* 行がどの意図に答えるかを、語で判定する（タイプごとに優先順が違うので結果も変わる） */
const INTENTS = [
  { key: 'c0', label: '料金や費用を知りたい', words: ['料金', '価格', '費用', '金額', '見積'] },
  { key: 'c1', label: '対応できる範囲を確かめたい', words: ['対応', '範囲', '条件', '仕様', '機能', 'サービス', '内容'] },
  { key: 'c2', label: '他と比べたい', words: ['比較', '違い', '選', '種類', '一覧', '事例', '実績'] },
];

function tagsFor(text) {
  const hit = INTENTS.filter((i) => i.words.some((w) => text.includes(w))).map((i) => i.key);
  /* どれにも当たらない行は「どの意図でも見せる」= 全条件に該当させる */
  return hit.length ? hit : INTENTS.map((i) => i.key);
}

const take = (a, n) => (Array.isArray(a) ? a.slice(0, n) : []);

/* Y軸(王道・安心 ⇄ 先進・新しさ)の6段階で「見せ方」を変える。
   操作の種類はX軸で決まる。ここで変えるのは並べ方と説明の書き方だけなので、
   X6方式 × Y6段階 = 36通りが、それぞれ違う画面になります。 */
const Y_PRESENT = [
  { key: 'y1', name: '定番の一覧', hint: '見せ方は、縦に並べて上から順に読む形です。' },
  { key: 'y2', name: '位置をそろえた表', hint: '見せ方は、番号と項目の位置をそろえた表に近い形です。' },
  { key: 'y3', name: '横並び', hint: '見せ方は、横に並べて選んだところに下線を引く形です。' },
  { key: 'y4', name: 'カード', hint: '見せ方は、一つずつ枠で囲むカードの形です。' },
  { key: 'y5', name: '余白の広い編集', hint: '見せ方は、余白を広く取り一度に一つだけ見せる形です。' },
  { key: 'y6', name: '角の丸いラベル', hint: '見せ方は、角の丸いラベルで並べる形です。' },
];

/* X軸の方式ごとに、何を選ぶのかの呼び名（読み上げにもそのまま使う） */
const X_UNIT = ['条件', '段階', '場面', '印象', '見せる情報', '読む順番'];

export function specimenFor(type, overlay) {
  const d = type.detail || {};
  const flow = d.conversionFlow || [];
  const prio = d.contentPriority || [];
  const proof = (overlay && overlay.proof) || [];
  const title = (overlay && overlay.specimen) || '設計の見本';
  const kinds = ['filter', 'steps', 'match', 'pair', 'gallery', 'story'];
  const kind = kinds[type.xIndex];
  /* 見せ方(Y)と、そのタイプ自身の行動・判断。新しい文章は作らず、既にある値を使う */
  const common = {
    yIndex: type.yIndex,
    present: Y_PRESENT[type.yIndex],
    unit: X_UNIT[type.xIndex],
    action: (overlay && overlay.specimenAction) || '',
    secondary: (overlay && overlay.specimenSecondary) || '',
    decision: (overlay && overlay.decision) || '',
  };

  if (kind === 'filter') {
    return {
      kind, title, ...common,
      conditions: INTENTS.map((i) => i.label),
      rows: take(prio, 7).map((p) => ({
        name: p,
        note: tagsFor(p).length === 3 ? 'どの入口からでも必要' : '選んだ条件のときに要る',
        tags: tagsFor(p),
      })),
    };
  }

  if (kind === 'steps') {
    return {
      kind, title, ...common,
      steps: take(flow, 5).map((f, i) => ({
        title: f,
        body: prio[i] ? `この段階で見せる情報: ${prio[i]}` : '前の段階で示した内容を確かめられる状態にします。',
      })),
    };
  }

  const pickSets = {
    match: take(type.strengths, 3).map((s, i) => ({
      name: s,
      rows: [
        ['最初に置く情報', prio[i] || prio[0] || '—'],
        ['そのとき促す行動', i === 0 ? (d.ctaStrategy || {}).primaryCTA : (d.ctaStrategy || {}).secondaryCTA],
        ['そばに添える一言', (d.ctaStrategy || {}).reassuranceNearCTA],
      ].filter((r) => r[1]),
    })),
    pair: take(type.designKeywords, 4).map((k, i) => ({
      name: k,
      rows: [
        ['そのための根拠', proof[i % Math.max(1, proof.length)] || '—'],
        ['見せ方', [(d.visualRecipe || {}).layout, (d.visualRecipe || {}).colorUse,
                    (d.visualRecipe || {}).typography, (d.visualRecipe || {}).imagery][i % 4]],
      ].filter((r) => r[1]),
    })),
    gallery: take(prio, 4).map((p, i) => ({
      name: p,
      rows: [
        ['添える条件', proof[i % Math.max(1, proof.length)] || '—'],
        ['次にすすむ先', flow[i] || flow[flow.length - 1] || '—'],
      ].filter((r) => r[1]),
    })),
    story: take(flow, 4).map((f, i) => ({
      name: f,
      rows: [
        ['そこに置く事実', proof[i % Math.max(1, proof.length)] || '—'],
        ['読み手が決めること', prio[i] || prio[0] || '—'],
      ].filter((r) => r[1]),
    })),
  };

  return { kind, title, ...common, picks: pickSets[kind] || [] };
}
