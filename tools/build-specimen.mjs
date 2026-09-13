/* =====================================================================
   タイプごとの「60秒の見本」HTMLを組み立てる。
   generate-type-pages.mjs から呼ばれます。

   中身は最初からすべてHTMLに出します。JSは表示の出し分けだけを行うので、
   JSが動かない環境では全状態がそのまま読めます。
   ===================================================================== */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const id = (t, k) => `sp-${t.slug}-${k}`;

/* 見本の枠。どの方式でも共通の外側 */
function shell(t, spec, inner, hint) {
  return `
      <div class="spx" data-spec="${spec.kind}">
        <div class="spx__hd">
          <p class="spx__lbl"><b>60秒の見本</b><span>架空の事業を想定した操作見本です</span></p>
          <p class="spx__ttl">${esc(spec.title)}</p>
          ${hint ? `<p class="spx__hint">${esc(hint)}</p>` : ''}
        </div>
        ${inner}
        <p class="spx__live" data-spec-live role="status" aria-live="polite"></p>
        <p class="spx__note">この見本の数値・名称はすべて架空です。実在の事業者・実績ではありません。</p>
      </div>`;
}

/* X1 検索・参照: 条件で絞り込む */
function filterSpec(t, spec) {
  const conds = spec.conditions;
  const rows = spec.rows;
  const checks = conds.map((c, i) => `
            <label class="spx-chk"><input type="checkbox" data-spec-cond="c${i}" id="${id(t, 'c' + i)}"><span>${esc(c)}</span></label>`).join('');
  const list = rows.map((r) => `
            <li class="spx-row" data-spec-row="${r.tags.join('|')}">
              <b>${esc(r.name)}</b><span>${esc(r.note)}</span>
            </li>`).join('');
  return shell(t, spec, `
        <div class="spx__bd spx--filter">
          <fieldset class="spx-conds">
            <legend>条件を選ぶ（複数可）</legend>${checks}
            <button type="button" class="btn btn--sm btn--line" data-spec-reset>条件をはずす</button>
          </fieldset>
          <div class="spx-out">
            <p class="spx-out__n">該当 <b data-spec-count>0</b> 件</p>
            <ul class="spx-rows">${list}</ul>
            <p class="spx-empty" data-spec-empty hidden>条件に合うものがありません。条件をはずすと戻ります。</p>
          </div>
        </div>`, '条件を組み合わせると候補が絞り込まれます。該当0件のときの表示も確認できます。');
}

/* X2 案内・導入: 段階を進む・戻る */
function stepsSpec(t, spec) {
  const dots = spec.steps.map((s, i) => `<li data-spec-dot aria-current="${i === 0 ? 'step' : 'false'}">${i + 1}</li>`).join('');
  const panels = spec.steps.map((s, i) => `
            <div class="spx-step" data-spec-step data-spec-title="${esc(s.title)}"${i ? ' hidden' : ''}>
              <p class="spx-step__no">STEP ${i + 1}</p>
              <b>${esc(s.title)}</b>
              <p>${esc(s.body)}</p>
            </div>`).join('');
  return shell(t, spec, `
        <div class="spx__bd spx--steps">
          <div class="spx-prog"><div class="spx-prog__bar" data-spec-bar aria-hidden="true"></div></div>
          <ol class="spx-dots" aria-hidden="true">${dots}</ol>
          <div class="spx-steps">${panels}</div>
          <div class="spx-nav">
            <button type="button" class="btn btn--sm btn--line" data-spec-prev>前へ</button>
            <span class="spx-pos" data-spec-pos>1 / ${spec.steps.length}</span>
            <button type="button" class="btn btn--sm btn--primary" data-spec-next>次へ</button>
          </div>
        </div>`, '前へ戻れます。どの段階にいるかが常に見えます。');
}

/* X3〜X6: 選ぶと中身が入れ替わる（見せ方は方式ごとに変える） */
function pickSpec(t, spec, cls, pickLabel) {
  const picks = spec.picks.map((p, i) => `
            <button type="button" class="spx-pick" data-spec-pick data-spec-name="${esc(p.name)}" aria-pressed="${i === 0 ? 'true' : 'false'}">
              <span class="spx-pick__i">${String(i + 1).padStart(2, '0')}</span><span>${esc(p.name)}</span>
            </button>`).join('');
  const panels = spec.picks.map((p, i) => `
            <div class="spx-panel" data-spec-panel${i ? ' hidden' : ''}>
              <p class="spx-panel__h">${esc(p.name)}</p>
              <dl class="spx-panel__dl">${p.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
            </div>`).join('');
  return shell(t, spec, `
        <div class="spx__bd ${cls}">
          <div class="spx-picks" role="group" aria-label="${esc(pickLabel)}">${picks}</div>
          <div class="spx-panels">${panels}</div>
        </div>`, `${pickLabel}を選ぶと、右（下）の内容が入れ替わります。`);
}

export function buildSpecimen(t, spec) {
  switch (spec.kind) {
    case 'filter': return filterSpec(t, spec);
    case 'steps': return stepsSpec(t, spec);
    case 'match': return pickSpec(t, spec, 'spx--match', '場面');
    case 'pair': return pickSpec(t, spec, 'spx--pair', '印象');
    case 'gallery': return pickSpec(t, spec, 'spx--gallery', '見せる情報');
    case 'story': return pickSpec(t, spec, 'spx--story', '読む順番');
    default: return '';
  }
}
