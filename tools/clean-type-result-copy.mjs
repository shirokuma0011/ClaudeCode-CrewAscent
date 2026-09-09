import fs from 'node:fs';

const file = 'assets/js/diagnosis-data.js';
let source = fs.readFileSync(file, 'utf8');

source = source.replace(/"([^"\r\n]+)から問い合わせへ進む"/g, '"「$1」を選び、問い合わせへ進む"');

source = source.replace(/("layout": ")([^"]+)(")/g, (_, start, copy, end) => {
  const polished = copy.replace(/([ぁ-んァ-ヶ一-龠]) ([ぁ-んァ-ヶ一-龠])/g, '$1。$2');
  return start + polished + end;
});

source = source.replace(/("recommendedPurpose": ")([^"]+)(")/g, (_, start, copy, end) => {
  const polished = copy.replace(
    /^(.+として働きます。)(.+)位置なので、(.+)ことを土台にすると力を発揮しやすいタイプです。$/,
    '$1$2方向です。$3ことが、サイト全体の説得力につながります。'
  );
  return start + polished + end;
});

fs.writeFileSync(file, source, 'utf8');
console.log('cleaned 36 type result records');
