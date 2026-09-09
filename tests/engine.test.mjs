/**
 * engine-2026-08-25.test.mjs
 *
 * 2026-08-25 に足したエンジンの4点を検証する。
 *   1. 外周セルの明瞭度（-84/84 を「境界に近い」と誤判定しない）
 *   2. 方向を読み取れないときの状態（undetermined。1つに断定しない）
 *   3. explainAxes（位置になった理由の内訳）
 *   4. じっくり診断48問（4観点12問ずつ・1.75倍で ±84 の目盛りへ正規化）
 *
 * 座標の目盛り（±84）・6バンドの境界・36マスの割り当ては変えていないので、
 * ここでは「変えていないこと」も一緒に確かめる。
 *
 * 読み込むのは site/ の実装そのもの。テストと本番でファイルがずれない。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const SITE = resolve(__dir, '../site');
for (const f of ['diagnosis-data.js', 'diagnosis-engine.js']) {
  new Function(readFileSync(resolve(SITE, 'assets/js/', f), 'utf8'))();
}
const E = globalThis.CrewEngine;

const answersAll = (mode, v) => {
  const a = {};
  for (const q of E.getQuestionsForMode(mode)) a[q.id] = v;
  return a;
};

test('外周は「境界に近い」ではない', () => {
  for (const [x, y] of [[-84, -84], [84, 84], [-84, 84], [84, -84]]) {
    assert.equal(E.computeClarity(x, y).clarity, 27, `${x},${y}`);
  }
});

test('内側の境界はこれまでどおり0', () => {
  assert.equal(E.computeClarity(-57, -57).clarity, 0);
  assert.equal(E.computeClarity(57, 57).clarity, 0);
});

test('全問中立はタイプを断定せず、中央4タイプを順位なしで返す', () => {
  const r = E.evaluate(answersAll('full', 0), 'full');
  assert.equal(r.state, 'undetermined');
  assert.equal(r.scores.X, 0);
  assert.equal(r.scores.Y, 0);
  assert.equal(r.centralTypes.length, 4);
  const ids = r.centralTypes.map((t) => t.id).sort();
  assert.deepEqual(ids, ['CA15', 'CA16', 'CA21', 'CA22']);
  assert.equal(r.flags.allNeutral, true);
});

test('全問同じ回答も undetermined（対比の設問なので差が出ない）', () => {
  /* 全問「とても近い」= 4観点すべてが同じ合計 → X=0 / Y=0。
     方向が読み取れないので、ここでも1つに断定しない。 */
  const r = E.evaluate(answersAll('full', 2), 'full');
  assert.equal(r.scores.X, 0);
  assert.equal(r.scores.Y, 0);
  assert.equal(r.state, 'undetermined');
  assert.equal(r.flags.allSame, true);
  assert.equal(r.flags.allNeutral, false);
  assert.equal(r.centralTypes.length, 4);
});

test('方向が出る回答では単一タイプを返す', () => {
  const a = answersAll('full', 0);
  for (const q of E.getQuestionsForMode('full')) {
    if (q.category === 'brand' || q.category === 'modern') a[q.id] = 2;
  }
  const r = E.evaluate(a, 'full');
  assert.equal(r.state, 'single');
  assert.equal(r.centralTypes.length, 0);
  assert.ok(r.scores.X > 3 && r.scores.Y > 3);
});

test('じっくり診断は48問・4観点12問ずつ・6問×8ページ', () => {
  const qs = E.getQuestionsForMode('full');
  assert.equal(qs.length, 48);
  assert.equal(qs.length % 6, 0);
  for (const c of ['practical', 'brand', 'trust', 'modern']) {
    assert.equal(qs.filter((q) => q.category === c).length, 12, c);
  }
  assert.ok(qs.slice(0, 16).every((q) => q.quick), 'かんたん16問は先頭16問');
  assert.equal(qs.filter((q) => q.quick).length, 16);
  assert.ok(qs.every((q, i) => q.id === i + 1), 'IDは1〜48の連番');
});

test('48問は1.75倍で ±84 の目盛りへ正規化される', () => {
  const a = {};
  for (const q of E.getQuestionsForMode('full')) {
    a[q.id] = (q.category === 'brand' || q.category === 'modern') ? 2 : -2;
  }
  const s = E.computeScores(a, 'full');
  assert.equal(s.raw.Xraw, 48);          // B(24) - P(-24)
  assert.equal(s.X, 84);                 // 48 * 1.75
  assert.equal(s.Y, 84);
  assert.equal(E.bandIndex(s.X), 5);
});

test('保存形式は48問版のv4（旧IDの回答を引き継がない）', () => {
  assert.equal(E.STORAGE_VERSION, 4);
  assert.equal(E.STORAGE_KEY, 'crewAscentDiagnosis:v4');
});

test('explainAxes: 合計が生スコアと一致し、回答数も合う', () => {
  const a = {};
  E.getQuestionsForMode('full').forEach((q, i) => { a[q.id] = [2, 1, 0, -1, -2][i % 5]; });
  const ax = E.explainAxes(a, 'full');
  assert.equal(ax.total, 48);
  assert.equal(ax.answered, 48);
  const s = E.computeScores(a, 'full');
  /* explainAxes が返すのは回答の生の合計。X/Y は ±84 へ正規化した値なので、
     一致するのは生値のほう。画面もそのまま「取り得る幅は 48」と書く。 */
  assert.equal(ax.x.right.sum - ax.x.left.sum, s.raw.Xraw);
  assert.equal(ax.y.right.sum - ax.y.left.sum, s.raw.Yraw);
  assert.equal(ax.x.diff, s.raw.Xraw);
  assert.equal(ax.y.diff, s.raw.Yraw);
  assert.equal(ax.x.left.count + ax.x.right.count, 24);
  assert.equal(ax.y.left.count + ax.y.right.count, 24);
});

test('explainAxes: 効いた回答は中立から遠い順、中立は入らない、各極2件まで', () => {
  const a = answersAll('full', 0);
  const brand = E.getQuestionsForMode('full').filter((q) => q.category === 'brand');
  a[brand[0].id] = 1;
  a[brand[1].id] = 2;
  a[brand[2].id] = -2;
  const ax = E.explainAxes(a, 'full');
  assert.equal(ax.x.right.top.length, 2);
  assert.deepEqual(ax.x.right.top.map((t) => t.value), [2, -2]);
  assert.ok(ax.x.right.top.every((t) => t.value !== 0));
  assert.equal(ax.x.left.top.length, 0);
  assert.equal(ax.x.right.neutral, brand.length - 3);
});

test('explainAxes: 16問版でも軸の内訳が返る', () => {
  const ax = E.explainAxes(answersAll('quick', 2), 'quick');
  assert.equal(ax.total, 16);
  assert.equal(ax.answered, 16);
  assert.equal(ax.x.left.count + ax.x.right.count, 8);
  assert.equal(ax.x.neutralRate, 0);
});

test('36マスすべてに到達できる（48問の取り得る値から）', () => {
  const cells = new Set();
  for (let xr = -48; xr <= 48; xr += 1) {
    for (let yr = -48; yr <= 48; yr += 1) {
      const X = Math.max(-84, Math.min(84, Math.round((xr * 84) / 48)));
      const Y = Math.max(-84, Math.min(84, Math.round((yr * 84) / 48)));
      cells.add(`${E.bandIndex(X)},${E.bandIndex(Y)}`);
    }
  }
  assert.equal(cells.size, 36);
});

test('evaluate は axes を含み、タイプの割り当ては変わらない', () => {
  const a = {};
  E.getQuestionsForMode('full').forEach((q, i) => { a[q.id] = [2, 1, 0, -1, -2][i % 5]; });
  const r = E.evaluate(a, 'full');
  assert.ok(r.axes && r.axes.x && r.axes.y);
  assert.equal(r.type.xIndex, E.bandIndex(r.scores.X));
  assert.equal(r.type.yIndex, E.bandIndex(r.scores.Y));
});
