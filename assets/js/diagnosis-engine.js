/**
 * diagnosis-engine.js — クルーアセント 36タイプ診断エンジン(純粋関数)
 *
 * 正本: docs/crew-ascent-site-blueprint/materials/03_diagnosis-specification.txt
 * ここには副作用(DOM / localStorage / Date.now)を置かない。
 * localStorage の読み書きは呼び出し側が担い、検証は parseStoredState(raw, nowMs) を使う。
 *
 * 通常スクリプトとして書く(ESモジュールにしない)。
 * 理由: file:// でHTMLを直接開いた場合、ESモジュールはCORSでブロックされ診断が動かないため。
 * ブラウザ: <script src> で読み込み、globalThis.CrewEngine を使う。
 * Node: tests/ が同ファイルを評価して globalThis.CrewEngine を検証する。
 * 依存: diagnosis-data.js を先に読み込むこと。
 */
(function (global) {
  'use strict';

  const DATA = global.CrewData;
  if (!DATA) throw new Error('diagnosis-data.js を先に読み込んでください');
  const QUESTIONS = DATA.QUESTIONS;
  const TYPES = DATA.TYPES;

const CATEGORIES = ['practical', 'brand', 'trust', 'modern'];
const ANSWER_VALUES = [-2, -1, 0, 1, 2]; // 近い(+2)〜近くない(-2)
const STORAGE_KEY = 'crewAscentDiagnosis:v3';  // 質問文v3へ改訂。旧回答は引き継がない
const STORAGE_VERSION = 3;

/* この幅に収まると「方向を読み取れない」と扱う（±84 のうちの ±3） */
const NO_SIGNAL_SPAN = 3;
const STORAGE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30日

// 6段階セル中心スコア(近いタイプ距離計算に使用) 仕様§8
const CELL_CENTERS = [-70, -42, -14, 14, 42, 70];

// 各バンドの包含レンジ [lo, hi](明確さ算出に使用) 仕様§6/§10
const BAND_RANGES = [
  [-84, -57], // 0
  [-56, -29], // 1
  [-28, 0], //   2
  [1, 28], //    3
  [29, 56], //   4
  [57, 84], //   5
];

const TYPE_BY_CELL = new Map(TYPES.map((t) => [`${t.xIndex},${t.yIndex}`, t]));
const TYPE_BY_SLUG = new Map(TYPES.map((t) => [t.slug, t]));
const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

/** モードに対応する設問配列を返す。順序は正本(TSV)のまま。 */
function getQuestionsForMode(mode) {
  if (mode === 'quick') return QUESTIONS.filter((q) => q.quick);
  if (mode === 'full') return QUESTIONS.slice();
  throw new Error(`unknown mode: ${mode}`);
}

/** 値が正当な回答か(-2..2 の整数) */
function isValidAnswer(v) {
  return Number.isInteger(v) && v >= -2 && v <= 2;
}

/** value を [-84,84] などの範囲へ収める */
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/** X/Y スコア(-84..84)を 6 バンド(0..5)へ分類。境界は仕様§6どおり。 */
function bandIndex(v) {
  if (v <= -57) return 0; // -84..-57
  if (v <= -29) return 1; // -56..-29
  if (v <= 0) return 2; //   -28..0
  if (v <= 28) return 3; //  1..28
  if (v <= 56) return 4; //  29..56
  return 5; //               57..84
}

/**
 * 回答からカテゴリ合計 → 軸スコアを計算。
 * @param {Object<number,number>} answers  { questionId: score(-2..2) }
 * @param {'quick'|'full'} mode
 */
function computeScores(answers, mode) {
  const questions = getQuestionsForMode(mode);
  const sums = { practical: 0, brand: 0, trust: 0, modern: 0 };
  for (const q of questions) {
    const v = answers[q.id];
    if (!isValidAnswer(v)) {
      throw new Error(`missing/invalid answer for question ${q.id}`);
    }
    sums[q.category] += v;
  }
  const P = sums.practical;
  const B = sums.brand;
  const T = sums.trust;
  const M = sums.modern;

  let X;
  let Y;
  let raw = null;
  if (mode === 'full') {
    X = B - P; // -84..84
    Y = M - T;
  } else {
    const Xraw = B - P; // -16..16
    const Yraw = M - T;
    // 84問版と同じ分類境界へ正規化(倍率 84/16 = 5.25) 仕様§5
    X = clamp(Math.round((Xraw * 84) / 16), -84, 84);
    Y = clamp(Math.round((Yraw * 84) / 16), -84, 84);
    raw = { Xraw, Yraw };
  }
  return { P, B, T, M, X, Y, raw, mode };
}

/** カテゴリ回答傾向(0..100)。能力評価ではない旨は UI 側で明示。 仕様§9 */
function categoryPercent(categoryScore, mode) {
  const pct =
    mode === 'full'
      ? Math.round(((categoryScore + 42) / 84) * 100)
      : Math.round(((categoryScore + 8) / 16) * 100);
  return clamp(pct, 0, 100);
}

/** 現在バンドの最寄り境界までの距離から「傾向の明確さ」を出す。 仕様§10 */
function computeClarity(X, Y) {
  const xi = bandIndex(X);
  const yi = bandIndex(Y);
  const [xlo, xhi] = BAND_RANGES[xi];
  const [ylo, yhi] = BAND_RANGES[yi];
  /* 端の外側には隣のタイプが無いので、そこまでの距離は数えない。
     以前は -84 と 84（取り得る最も強い回答）を「境界に近い」と判定していた。
     内側の境界だけを見るように直す。 */
  const AT_MIN = BAND_RANGES[0][0];
  const AT_MAX = BAND_RANGES[BAND_RANGES.length - 1][1];
  const edge = (v, lo, hi) => {
    const toLo = lo === AT_MIN ? Infinity : v - lo;
    const toHi = hi === AT_MAX ? Infinity : hi - v;
    const d = Math.min(toLo, toHi);
    return d === Infinity ? Math.max(hi - v, v - lo) : d;
  };
  const dx = edge(X, xlo, xhi);
  const dy = edge(Y, ylo, yhi);
  const clarity = Math.min(dx, dy);
  let message;
  if (clarity <= 3) message = '境界に近い傾向です。近いタイプもあわせて確認してください。';
  else if (clarity <= 9) message = '複数の考え方をバランスよく持っています。';
  else message = '現在の方向が比較的はっきり表れています。';
  return { clarity, message };
}

/** x/y インデックスからタイプを取得 */
function typeForIndices(xIndex, yIndex) {
  const t = TYPE_BY_CELL.get(`${xIndex},${yIndex}`);
  if (!t) throw new Error(`no type for cell ${xIndex},${yIndex}`);
  return t;
}

function typeBySlug(slug) {
  return TYPE_BY_SLUG.get(slug) || null;
}

/**
 * 考え方が近い 3 タイプ。距離=各セル中心とのユークリッド距離。 仕様§8
 * 同距離時: 1)同じ行 2)同じ列 3)xIndex昇順 4)yIndex昇順 5)slug昇順
 */
function nearestTypes(mainType, X, Y, count = 3) {
  const scored = TYPES.filter((t) => t.slug !== mainType.slug).map((t) => {
    const cx = CELL_CENTERS[t.xIndex];
    const cy = CELL_CENTERS[t.yIndex];
    const dist2 = (X - cx) * (X - cx) + (Y - cy) * (Y - cy); // 整数のまま比較
    return { type: t, dist2 };
  });
  scored.sort((a, b) => {
    if (a.dist2 !== b.dist2) return a.dist2 - b.dist2;
    const aRow = a.type.yIndex === mainType.yIndex ? 0 : 1;
    const bRow = b.type.yIndex === mainType.yIndex ? 0 : 1;
    if (aRow !== bRow) return aRow - bRow;
    const aCol = a.type.xIndex === mainType.xIndex ? 0 : 1;
    const bCol = b.type.xIndex === mainType.xIndex ? 0 : 1;
    if (aCol !== bCol) return aCol - bCol;
    if (a.type.xIndex !== b.type.xIndex) return a.type.xIndex - b.type.xIndex;
    if (a.type.yIndex !== b.type.yIndex) return a.type.yIndex - b.type.yIndex;
    return a.type.slug < b.type.slug ? -1 : 1;
  });
  return scored.slice(0, count).map((s) => ({ type: s.type, distance: Math.sqrt(s.dist2) }));
}

/**
 * 回答から完全な結果オブジェクトを構築。
 * 回答パターンの特記(全中立 / 全同一)も判定。 仕様§11
 */
function evaluate(answers, mode) {
  const scores = computeScores(answers, mode);
  const { P, B, T, M, X, Y } = scores;
  const xIndex = bandIndex(X);
  const yIndex = bandIndex(Y);
  const type = typeForIndices(xIndex, yIndex);
  const near = nearestTypes(type, X, Y);
  const clarity = computeClarity(X, Y);

  const categoryPercents = {
    practical: categoryPercent(P, mode),
    brand: categoryPercent(B, mode),
    trust: categoryPercent(T, mode),
    modern: categoryPercent(M, mode),
  };

  const questions = getQuestionsForMode(mode);
  const values = questions.map((q) => answers[q.id]);
  const allNeutral = values.every((v) => v === 0);
  const allSame = values.every((v) => v === values[0]);

  /* 結果の状態を3つに分ける。
     single       … 方向が出ている
     boundary     … 出ているが境界のすぐそば
     undetermined … 回答から方向を読み取れない

     undetermined を設けた理由:
       84問すべて「どちらともいえない」でも X=0 / Y=0 となり、
       これまでは CA21 を「あなたのタイプ」として言い切っていた。
       中立の回答は親切案内型への支持ではないので、断定してはいけない。
     型の割り当て（計算式・分類境界）そのものは一切変えていない。 */
  const noSignal = allNeutral || (allSame && values[0] === 0) ||
    (Math.abs(X) <= NO_SIGNAL_SPAN && Math.abs(Y) <= NO_SIGNAL_SPAN);
  const state = noSignal ? 'undetermined' : (clarity.clarity <= 3 ? 'boundary' : 'single');

  /* 方向が読み取れないときに、同じ重みで示す中央の4タイプ */
  const centralTypes = state === 'undetermined'
    ? [[2, 2], [3, 2], [2, 3], [3, 3]].map(([cx, cy]) => typeForIndices(cx, cy))
    : [];

  let note = null;
  if (state === 'undetermined') {
    note = '回答からは方向を読み取れませんでした。中立が多い場合や、四つの観点を同じ重みで選んだ場合に起こります。'
         + '設問を見直すか、84問版でもう一度お答えください。';
  } else if (allSame) {
    note = '四つの観点を同程度に重視する回答でした。近いタイプもあわせて確認してください。';
  } else if (state === 'boundary') {
    note = '境界のすぐそばです。となりのタイプの説明もあわせて読んでください。';
  }

  return {
    mode,
    scores: { P, B, T, M, X, Y, raw: scores.raw },
    xIndex,
    yIndex,
    type,
    near,
    clarity,
    categoryPercents,
    state,
    centralTypes,
    flags: { allNeutral, allSame, noSignal },
    note,
  };
}

/* ---------------- localStorage 状態(検証は純粋関数として提供) ---------------- */

/** 新規保存状態を作る。nowIso は呼び出し側で new Date().toISOString() を渡す。 */
function makeInitialState(mode, nowIso) {
  return {
    version: STORAGE_VERSION,
    mode,
    currentIndex: 0,
    answers: {},
    startedAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * localStorage の生文字列を検証して正当な状態のみ返す。不正/破損/期限切れは null。 仕様§13
 * @param {string|null} raw
 * @param {number} nowMs  現在時刻(ms)。呼び出し側で Date.now() を渡す。
 */
function parseStoredState(raw, nowMs) {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null; // JSON破損
  }
  if (!data || typeof data !== 'object') return null;
  if (data.version !== STORAGE_VERSION) return null; // version不一致
  if (data.mode !== 'quick' && data.mode !== 'full') return null;
  if (!Number.isInteger(data.currentIndex) || data.currentIndex < 0) return null;
  if (!data.answers || typeof data.answers !== 'object') return null;

  // 回答の各エントリを検証。存在しない questionId / 範囲外 score は破棄(=全体を無効化)。
  const cleaned = {};
  for (const [k, v] of Object.entries(data.answers)) {
    const qid = Number(k);
    if (!QUESTION_BY_ID.has(qid)) return null;
    if (!isValidAnswer(v)) return null;
    cleaned[qid] = v;
  }

  // 期限(最終更新から30日超過)判定
  const updated = Date.parse(data.updatedAt || data.startedAt || '');
  if (Number.isFinite(updated) && nowMs - updated > STORAGE_MAX_AGE_MS) return null;

  const maxIndex = data.mode === 'quick' ? 16 : 84;
  const currentIndex = Math.min(data.currentIndex, maxIndex);

  return {
    version: STORAGE_VERSION,
    mode: data.mode,
    currentIndex,
    answers: cleaned,
    startedAt: typeof data.startedAt === 'string' ? data.startedAt : null,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
  };
}

/** モードの全問に回答済みか(完了判定)。 仕様§11 未回答 */
function firstUnansweredIndex(answers, mode) {
  const questions = getQuestionsForMode(mode);
  for (let i = 0; i < questions.length; i++) {
    if (!isValidAnswer(answers[questions[i].id])) return i;
  }
  return -1; // 全問回答済み
}

  // 公開API(テストと画面の両方から使う)
  global.CrewEngine = {
    CATEGORIES: CATEGORIES,
    ANSWER_VALUES: ANSWER_VALUES,
    STORAGE_KEY: STORAGE_KEY,
    STORAGE_VERSION: STORAGE_VERSION,
    STORAGE_MAX_AGE_MS: STORAGE_MAX_AGE_MS,
    CELL_CENTERS: CELL_CENTERS,
    QUESTIONS: QUESTIONS,
    TYPES: TYPES,
    getQuestionsForMode: getQuestionsForMode,
    isValidAnswer: isValidAnswer,
    bandIndex: bandIndex,
    computeScores: computeScores,
    categoryPercent: categoryPercent,
    computeClarity: computeClarity,
    typeForIndices: typeForIndices,
    typeBySlug: typeBySlug,
    nearestTypes: nearestTypes,
    evaluate: evaluate,
    makeInitialState: makeInitialState,
    parseStoredState: parseStoredState,
    firstUnansweredIndex: firstUnansweredIndex,
  };
}(typeof globalThis !== 'undefined' ? globalThis : this));
