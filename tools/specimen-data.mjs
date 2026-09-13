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

export function specimenFor(type, overlay) {
  const d = type.detail || {};
  const flow = d.conversionFlow || [];
  const prio = d.contentPriority || [];
  const proof = (overlay && overlay.proof) || [];
  const title = (overlay && overlay.specimen) || '設計の見本';
  const kinds = ['filter', 'steps', 'match', 'pair', 'gallery', 'story'];
  const kind = kinds[type.xIndex];

  if (kind === 'filter') {
    return {
      kind, title,
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
      kind, title,
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

  return { kind, title, picks: pickSets[kind] || [] };
}
