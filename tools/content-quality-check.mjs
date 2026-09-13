import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const failures = [];
const checks = [];

function check(condition, label) {
  checks.push(label);
  if (!condition) failures.push(label);
}

await import(pathToFileURL(path.join(root, 'assets/js/diagnosis-data.js')));
await import(pathToFileURL(path.join(root, 'assets/js/diagnosis-engine.js')));

const { QUESTIONS, TYPES, META } = globalThis.CrewData;
const engine = globalThis.CrewEngine;

check(QUESTIONS.length === 84 && META.totalQuestions === 84, '質問は84問');
check(QUESTIONS.filter((question) => question.quick).length === 16, 'かんたん診断は16問');
check(new Set(QUESTIONS.map((question) => question.id)).size === 84, '質問IDに重複なし');
check(QUESTIONS.every((question, index) => question.id === index + 1), '質問IDは1〜84の連番');
check(['practical', 'brand', 'trust', 'modern'].every((category) =>
  QUESTIONS.filter((question) => question.category === category).length === 21
), '4観点は各21問');
check(QUESTIONS.every((question) => question.statement.length >= 28), '短すぎる質問なし');
check(QUESTIONS.every((question) => /より|ても|必要でも/.test(question.statement)), '全問が優先順位・トレードオフを含む');

check(TYPES.length === 36 && META.typeCount === 36, '診断タイプは36種類');
check(new Set(TYPES.map((type) => type.slug)).size === 36, 'タイプslugに重複なし');
check(new Set(TYPES.map((type) => type.name)).size === 36, 'タイプ名に重複なし');
check(new Set(TYPES.map((type) => `${type.xIndex},${type.yIndex}`)).size === 36, '6×6の全座標が一意');
check(TYPES.every((type) => type.xIndex >= 0 && type.xIndex <= 5 && type.yIndex >= 0 && type.yIndex <= 5), '全タイプが6×6内に配置');
check(new Set(TYPES.map((type) => type.summary)).size === 36, '36タイプの概要文が一意');
check(new Set(TYPES.map((type) => type.detail.recommendedPurpose)).size === 36, '36タイプの役割説明が一意');
check(TYPES.every((type) => type.detail.conversionFlow.every((step) => !step.includes('から問い合わせへ進む'))), '問い合わせ経路に不自然な接続なし');
check(TYPES.every((type) => !/[ぁ-んァ-ヶ一-龠] [ぁ-んァ-ヶ一-龠]/.test(type.detail.visualRecipe.layout)), 'レイアウト説明の文境界を明示');
check(TYPES.every((type) => !/力を発揮しやすいタイプ/.test(type.detail.recommendedPurpose)), '役割説明から定型的な重複表現を除去');

for (const mode of ['quick', 'full']) {
  const modeQuestions = engine.getQuestionsForMode(mode);
  for (const answerValue of [-2, 0, 2]) {
    const answers = Object.fromEntries(modeQuestions.map((question) => [question.id, answerValue]));
    const result = engine.evaluate(answers, mode);
    check(Boolean(result?.type?.slug), `${mode}・回答${answerValue}で結果を返す`);
  }
}
check(engine.STORAGE_KEY === 'crewAscentDiagnosis:v3' && engine.STORAGE_VERSION === 3, '保存形式は質問文v3');

const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
const publicHtmlFiles = htmlFiles.filter((file) => !file.startsWith('_'));
/* 期待件数は固定値にしない。タイプが増えればページも増えるため、
   「コアページ + タイプ一覧 + タイプ数」から数える。 */
const CORE_PAGES = 21;
const expectedHtml = CORE_PAGES + 1 + TYPES.length;
const typePages = publicHtmlFiles.filter((file) => file.startsWith('type-'));
check(publicHtmlFiles.length === expectedHtml,
  `HTMLは ${expectedHtml}ページ（コア${CORE_PAGES} + 一覧1 + タイプ${TYPES.length}）`);
check(typePages.length === TYPES.length, `タイプ個別ページが ${TYPES.length}件そろっている`);
for (const type of TYPES) {
  check(publicHtmlFiles.includes(`type-${type.slug}.html`), `${type.id}: type-${type.slug}.html がある`);
}

const htmlByFile = new Map(htmlFiles.map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
for (const [file, html] of htmlByFile) {
  check((html.match(/<title>/g) || []).length === 1, `${file}: titleが1つ`);
  check((html.match(/<h1\b/g) || []).length === 1, `${file}: h1が1つ`);
  check(/<html\s+lang="ja"/.test(html), `${file}: 日本語ページを明示`);
  check(/<meta\s+charset="utf-8"/i.test(html), `${file}: UTF-8を明示`);
  check(!html.includes('\uFFFD'), `${file}: 文字化けなし`);
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
  check(new Set(ids).size === ids.length, `${file}: idの重複なし`);
  const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  check([...htmlWithoutComments.matchAll(/<img\b[^>]*>/g)].every((match) => /\salt=["'][^"']*["']/.test(match[0])), `${file}: 全画像にalt属性`);

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|tel:|javascript:)/.test(href) || href === '#') continue;
    const [targetPath, targetId] = href.split('#');
    const targetFile = targetPath || file;
    if (!targetFile.endsWith('.html')) continue;
    check(htmlByFile.has(targetFile), `${file}: リンク先 ${targetFile} が存在`);
    if (targetId && htmlByFile.has(targetFile)) {
      const targetHtml = htmlByFile.get(targetFile);
      check(new RegExp(`id=["']${targetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(targetHtml),
        `${file}: #${targetId} が存在`);
    }
  }
}

check(/<meta name="robots" content="noindex,follow">/.test(htmlByFile.get('result.html')), '診断結果はnoindex');
check(/<meta name="robots" content="noindex,follow">/.test(htmlByFile.get('works.html')), '未掲載の見本ページはnoindex');

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
check(!sitemapLocations.some((location) => /(?:result|works)\.html$/.test(location)), 'sitemapから結果・未掲載見本を除外');
check(!sitemap.includes('2026-08-05') && sitemap.includes('2026-08-17'), 'sitemap更新日を反映');

const publicText = [...htmlByFile.values()].join('\n') + '\n' +
  ['assets/js/diagnosis-data.js', 'assets/js/diagnosis-ui.js', 'assets/js/result.js']
    .map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
for (const stale of [
  '事業の現在地',
  '精度の優劣はありません',
  'おすすめのページ構成',
  '無理なおすすめはしません',
  '最大80%',
  'crewAscentDiagnosis:v2',
]) {
  check(!publicText.includes(stale), `旧表現「${stale}」を公開文面から除去`);
}

if (failures.length) {
  console.error(`FAILED: ${failures.length} / ${checks.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS: ${checks.length} checks`);
console.log(`84 questions / 36 types / ${publicHtmlFiles.length} public-or-noindex pages / internal links verified`);
