from pathlib import Path
from PIL import Image
from collections import Counter
import csv
import hashlib
import html
import io
import json
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent
BASE = ROOT.parent
OUT = ROOT / 'gallery'
OUT.mkdir(parents=True, exist_ok=True)
ORIGINAL = BASE / 'crewascent-images-20261029/deliverables'
FIXED = BASE / 'crewascent-images-fix-20261029/deliverables'
rows = []
groups = {
 '01-current': '現在の使用候補：静止画11種類・A/Bの22枚',
 '02-archive': '修正前の画像：比較用の旧版3枚',
 '03-fixed-frames': '修正版：動画の代わりに用意した連続画像6枚',
 '04-original-frames': '初回版：動画の代わりに用意した連続画像6枚',
 '05-video-references': '追加動画2本の参考画像',
 '06-posters': 'タイル動画用のポスター・静止表示画像',
 '07-composited-review': 'こちらで作った動画試作の確認コマ',
 '08-gemini-review': '採用されたGemini動画の確認コマ',
 '09-contact-sheets': '比較・検品に使った一覧画像',
}

def add(source, folder, filename, title, description, usage, status):
    source = Path(source)
    dest = OUT / folder / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, dest)
    data = dest.read_bytes()
    with Image.open(io.BytesIO(data)) as im:
        w, h = im.size
        im.verify()
    rows.append({
        'path': dest.relative_to(OUT).as_posix(), 'group': folder,
        'title': title, 'description': description, 'usage': usage, 'status': status,
        'width': w, 'height': h, 'bytes': len(data),
        'sha256': hashlib.sha256(data).hexdigest(),
        'source': source.relative_to(BASE).as_posix(),
    })

specs = [
 ('01-dot-wave', 'ドットの波', 'トップの最初の画面の背景・章の区切り',
  '黒地にブラウンの丸い点が並ぶ抽象グラフィック。波が右下に低く広がり、左と上に大きな余白があります。追加動画13の参考元です。',
  '同じドット表現の別案。大きな点が右手前にあり、奥へ曲がり込む流れが目立ちます。'),
 ('02-tiles-6x6', '36枚のタイル', 'Web診断36の紹介・診断ページの冒頭',
  '黒い石の台に6×6の生成り色のタイルを並べ、1枚だけブラウンにした構図。台の側面が見え、立体感があります。採用されたタイル動画と同系統の素材です。',
  '36枚のタイルを、より上から見下ろした別案。左側の暗い余白と整った並びを生かす構図です。'),
 ('03-wireframe-sketch', 'Webページの設計図', '料金ページ・サービスページの冒頭',
  'Webページの骨組みを描いた紙、定規、鉛筆の静物。相談内容を整理し、画面の設計へ進めることを表します。左側に文章を載せられます。',
  '紙の重ね方と枠・線の描き方を変えた設計図の別案。実際の制作物のスクリーンショットではなく、設計を象徴する画像です。'),
 ('04-tracing-layers', '重なるトレーシングペーパー', '制作の流れページの冒頭',
  '修正済みの5枚の半透明の紙。方眼とブラウンの中空の枠を描き、検討を重ねる工程を表します。右側は暗い余白です。追加動画14の参考元です。',
  '紙の重なりと透け方を変えた別案。段階を重ねて仕上げることを表す静物です。'),
 ('05-index-cards', '9枚の工程カード', '制作の流れ・9段階の横長の帯',
  '修正済みの真上からの構図。9枚のカードのうち最初の3枚にブラウンの糸を通し、その先は下へ逃がしています。工程のつながりを表します。',
  '9枚のカードと糸の別案。画像の外周に小物があるため、掲載範囲を調整して使う候補です。'),
 ('06-stone-key', '鍵と白いカード', '公開・管理ページの冒頭',
  '黒い石の台に真鍮色の鍵と無地のカードを置いた静物。公開後の管理や引き渡しを象徴し、左に暗い余白があります。',
  '鍵を横向きに置き、カードと影の配置を変えた別案。公開・管理の説明に合わせる素材です。'),
 ('07-open-notebook', '開いたノートと鉛筆', 'はじめての方へ・ガイドページの冒頭',
  '白紙のノートと鉛筆。相談前の整理や、これから書き始めることを表します。左上の小物が入る範囲は掲載時の切り取り候補です。',
  'ノートの開き方、鉛筆、光の入り方を変えた別案。右側の暗い余白に案内文を合わせる想定です。'),
 ('08-envelope', '紐で結んだ封筒', '相談ページの冒頭',
  '生成り色の封筒とブラウンの紐。相談や連絡を象徴します。宛名などの文字はなく、左側に文章用の余白があります。',
  '封筒と紐の結び方、陰影を変えた別案。問い合わせの入口に使う素材です。'),
 ('09-desk-overhead', '道具を整えた机の俯瞰', 'クルーアセントについて・運営紹介ページの冒頭',
  '紙、定規、鉛筆、紙のタイルを整然と配置した静物。考える・設計する・整える姿勢を象徴します。実在の事務所を撮影した写真ではありません。',
  '紙と道具を斜めにまとめた別案。暗い余白を広く取り、紹介文と組み合わせる想定です。こちらも生成した象徴画像です。'),
 ('10-og-top', 'トップ用のSNS共有背景', 'トップページをSNSなどで共有した際の表示画像',
  'ブラウンのドットの波を右下へ小さく配置した背景。左側にサイト名や見出しを後から載せるための素材です。文字入りの完成画像ではありません。',
  '右側のドットの流れを強めたSNS共有背景の別案。1200×630の横長画像です。'),
 ('11-og-plans', '料金ページ用のSNS共有背景', '料金ページをSNSなどで共有した際の表示画像',
  '修正済みの画像。設計図の紙・定規・鉛筆を右側へ小さくまとめ、左に広い見出し用の余白を設けています。文字は後から載せます。',
  '紙と道具の配置を変えたSNS共有背景の別案。料金やプランの見出しを左側へ合わせる想定です。'),
]

for stem, title, usage, desc_a, desc_b in specs:
    for v, desc in [('a', desc_a), ('b', desc_b)]:
        name = f'{stem}-{v}.png'
        source = FIXED / name if (FIXED / name).exists() else ORIGINAL / name
        status = '修正版・使用候補' if source.parent == FIXED else '使用候補'
        add(source, '01-current', name, f'{title}：{v.upper()}案', desc, usage, status)

for name, title, why in [
 ('04-tracing-layers-a.png', 'トレーシングペーパーA・修正前', '初回の画像です。紙の枚数や中空の枠、余白の作り方を見直し、現在のA案へ修正しました。'),
 ('05-index-cards-a.png', '工程カードA・修正前', '初回の画像です。糸が全カードに通って見え、真上からの構図にもなっていなかったため、現在のA案へ修正しました。'),
 ('11-og-plans-a.png', '料金SNS背景A・修正前', '初回の画像です。紙や道具が大きく、見出し用の余白が不足していたため、現在のA案へ修正しました。'),
]:
    add(ORIGINAL / name, '02-archive', name, title, why, '修正前後の比較', '旧版・比較用')

for group, folder, label in [('03-fixed-frames', FIXED, '修正版'), ('04-original-frames', ORIGINAL, '初回版')]:
    for n in range(1, 7):
        description = f'タイルの場面で光の位置を変えた連続画像の{n}/6枚目。'
        if group == '03-fixed-frames':
            description += '同じカメラ・台・タイルを基準に光を動かした修正版です。茶色のタイルが上下する動画ではありません。'
        else:
            description += '動画を作れなかった段階の代替画像です。照明のばらつきがあり、後に修正しました。カメラが交互に動くという当初の指摘は撤回されています。'
        add(folder / f'12-frame-{n}.png', group, f'12-frame-{n}.png', f'{label}・光の連続画像 {n}/6', description, '動画の代替として用意した静止画・比較', '動画ではなく静止画')

add(BASE/'extra-video-prompts-20261101/files/13_reference_dot_wave.png', '05-video-references', '13_reference_dot_wave.png', '追加動画13：ドットの波の参考画像', '使用候補の01-dot-wave-aと同じ画像です。大きな波が伝わる動画をGeminiに依頼するために用意しました。', '追加動画13の画像入力', '参考画像・再掲')
add(BASE/'extra-video-prompts-20261101/files/14_reference_paper_layers.png', '05-video-references', '14_reference_paper_layers.png', '追加動画14：重なる紙の参考画像', '修正版04-tracing-layers-aと同じ画像です。5枚の紙の間隔が広がり、元へ戻る動画を依頼するために用意しました。', '追加動画14の画像入力', '参考画像・再掲')

for source, name, title, desc in [
 (ORIGINAL/'12-video-tiles-poster.png', '12-poster-original.png', '初回のタイル用ポスター', '初回02-tiles-6x6-aと同じ画像。動画を読み込む前や動きを抑える設定時に表示する想定で用意しました。'),
 (FIXED/'12-video-tiles-poster.png', '12-poster-fixed.png', '修正版のタイル用ポスター', '修正版12-frame-1と同じ画像。修正版の連続画像の基準です。採用されたGemini動画から取り出した画像ではありません。'),
 (BASE/'crewascent-images-fix-20261029/video/12-video-tiles-poster.png', '12-poster-composited.png', 'こちらで作った動画試作用のポスター', '光とタイルの上下動を合成して作ったMP4試作の冒頭画像。Gemini生成動画のポスターではありません。'),
]:
    add(source, '06-posters', name, title, desc, '動画の読み込み前・静止表示用', '既存のポスター候補')

for n in [0, 60, 120, 180, 239]:
    add(BASE/f'crewascent-images-fix-20261029/video/check-{n:03d}.png', '07-composited-review', f'composited-frame-{n:03d}.png', f'合成動画試作：{n/30:.2f}秒付近', '静止画をもとに光と茶色タイルの上下動を合成した8秒のMP4試作からの確認コマ。動画生成AIの出力ではありません。', '試作の動き・継ぎ目の確認', '検品用の切り出し画像')

for n in [0, 48, 96, 144, 192, 239]:
    add(BASE/f'gemini-video-review-20261101/frame-{n:03d}.png', '08-gemini-review', f'gemini-frame-{n:03d}.png', f'採用されたGemini動画：{n/24:.2f}秒付近', 'ユーザーが生成し、この動きの強さで採用すると判断したタイル動画の確認コマ。茶色タイルの浮き上がりと照明の変化を比較できます。' + ('採用動画の実際の冒頭コマです。' if n == 0 else ''), '採用動画の動き・冒頭と末尾の比較', '採用動画からの切り出し画像')

for source, name, title, desc in [
 (ORIGINAL/'contact-sheet.png', 'contact-original.png', '初回納品画像の一覧', '初回の静止画22枚と、動画代替の連続画像・ポスターをまとめた一覧。修正前の04-A、05-A、11-Aを含むため、現在の使用候補一覧とは異なります。'),
 (BASE/'crewascent-images-fix-20261029/fix-contact-sheet.jpg', 'contact-fixes.jpg', '修正画像の一覧', '修正した紙・工程カード・料金SNS背景と、光の連続画像6枚・ポスターの比較一覧です。'),
 (BASE/'crewascent-images-fix-20261029/video/video-check.jpg', 'contact-composited-video.jpg', '合成動画試作の検品一覧', 'こちらで作ったMP4試作の複数時点を並べ、カメラ・光・タイルの動きを確認した一覧です。'),
 (BASE/'gemini-video-review-20261101/contact-sheet.jpg', 'contact-gemini-video.jpg', '採用されたGemini動画の検品一覧', '参考画像と動画の0秒から最終コマまでを並べた一覧。タイルの浮き上がり、光の通過、元の位置への復帰を確認できます。'),
]:
    add(source, '09-contact-sheets', name, title, desc, '全体比較・検品', '一覧画像')

assert len(rows) == 57
seen = {}
for r in rows:
    r['same_bytes_as'] = seen.get(r['sha256'], '')
    seen.setdefault(r['sha256'], r['path'])

def write_utf8(name, value):
    (OUT/name).write_text(value, encoding='utf-8-sig', newline='\n')

write_utf8('image-catalog.json', json.dumps({'date':'2026-11-01', 'image_files':len(rows), 'unique_file_contents':len(seen), 'images':rows}, ensure_ascii=False, indent=2)+'\n')
with (OUT/'image-catalog.csv').open('w',encoding='utf-8-sig',newline='') as f:
    fields=['path','title','description','usage','status','width','height','sha256','same_bytes_as']
    writer=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');writer.writeheader();writer.writerows(rows)

readme = '''クルーアセント：画像全体一覧・解説付き
2026-11-01

【開き方】
ZIPを必ず「すべて展開」してから、index.htmlをブラウザで開いてください。
全57画像を、画像の内容・用途・版の違い・ファイル名とともに表示します。
上部の検索欄と分類で絞り込めます。画像をクリックすると元画像を開きます。

【収録内容】
現在の使用候補22枚、修正前3枚、動画代替の連続画像12枚、追加動画の参考画像2枚、ポスター3枚、動画確認コマ11枚、比較一覧4枚。
同じ画像を別用途で再掲したものも含む57ファイルです。全57点が互いに異なる図柄という意味ではありません。
「現在の使用候補」はサイトへの掲載完了を意味しません。
追加動画の参考画像は、ドットの波Aと修正版の重なる紙Aの再掲です。
Geminiのタイル動画は、ユーザーが現在の動きの強さで採用と判断済みです。
生成した静物素材であり、実在のスタッフや事務所の写真として紹介するものではありません。

image-catalog.csvにも全画像の解説があります。日本語はUTF-8（BOM付き）です。
フォルダ名とファイル名は英数字です。元画像は変更せずコピーしています。
SHA256SUMS.txtには同梱ファイルの確認用ハッシュを記録しています。
'''
write_utf8('README.txt',readme)
write_utf8('CHECKED.txt', '''確認内容（2026-11-01）
・画像57ファイルを画像として復号・検証し、幅と高さを記録。
・コピー後の画像を元ファイルのバイト列と照合。
・全画像にタイトル、内容、用途、状態を付与。
・修正版と旧版、連続画像、ポスター、動画確認コマを分けて表示。
・同じバイト列の画像はカタログに再掲元を記録。
・HTML内の画像57件の参照先を確認。
・日本語の本文ファイルはUTF-8（BOM付き）。ファイル名・フォルダ名はASCII。
・ZIP作成後に全ファイルのCRCと内容一致を確認する。
''')

sections=[]
for gid,title in groups.items():
    cards=[]
    for r in rows:
        if r['group']!=gid: continue
        esc=lambda s:html.escape(str(s),quote=True)
        search=' '.join([r['title'],r['description'],r['usage'],r['status'],r['path']])
        duplicate=('<p class="same">同じファイル内容：'+esc(r['same_bytes_as'])+'</p>') if r['same_bytes_as'] else ''
        cards.append(f'''<article class="card" data-search="{esc(search)}"><a class="picture" href="{r['path']}" target="_blank" rel="noopener"><img loading="lazy" src="{r['path']}" alt="{esc(r['title'])}"></a><div class="caption"><span class="status">{esc(r['status'])}</span><h3>{esc(r['title'])}</h3><p>{esc(r['description'])}</p><p class="usage">用途：{esc(r['usage'])}</p><p class="file">{esc(r['path'])}<br>{r['width']} × {r['height']} px</p>{duplicate}</div></article>''')
    sections.append(f'<section id="{gid}" data-group="{gid}"><h2>{html.escape(title)}</h2><div class="grid">'+''.join(cards)+'</div></section>')
options='<option value="all">すべての画像</option>'+''.join(f'<option value="{k}">{html.escape(v)}</option>' for k,v in groups.items())
page='''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>クルーアセント：全画像と解説</title><style>
*{box-sizing:border-box}body{margin:0;background:#eee9e1;color:#26221e;font:16px/1.8 "Yu Gothic","Meiryo",sans-serif}header,main,footer{max-width:1440px;margin:auto;padding:28px}h1{font-size:30px;margin:10px 0}h2{font-size:23px;margin:40px 0 18px}h3{font-size:20px;margin:10px 0}.intro{max-width:1000px}.toolbar{position:sticky;top:0;z-index:2;background:#eee9e1f5;border-top:1px solid #c8bdaf;border-bottom:1px solid #c8bdaf;padding:14px 28px;display:flex;flex-wrap:wrap;gap:12px;align-items:center}input,select{font:inherit;padding:10px;border:1px solid #9c8a77;border-radius:5px;background:white}input{min-width:260px;flex:1}select{max-width:100%}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.card{background:white;border:1px solid #d5cabc;border-radius:10px;overflow:hidden}.picture{display:flex;align-items:center;justify-content:center;background:#141311;aspect-ratio:16/9;overflow:hidden}.picture img{display:block;width:100%;height:100%;object-fit:contain}.caption{padding:22px}.status{display:inline-block;background:#eee9e1;color:#594b3b;border-radius:4px;padding:2px 9px;font-size:13px}.usage{font-weight:600}.file,.same{font-size:13px;color:#665b50;overflow-wrap:anywhere}.same{border-top:1px solid #eee;padding-top:10px}[hidden]{display:none!important}footer{border-top:1px solid #c8bdaf}a{color:#66503b}@media(max-width:760px){header,main,footer{padding:20px}.toolbar{padding:12px 20px}.grid{grid-template-columns:1fr}h1{font-size:25px}input{min-width:180px}}
</style></head><body><header><h1>クルーアセント：全画像と解説</h1><div class="intro"><p>2026-11-01時点。使用候補・修正前・動画参考・確認用を含む<strong>57画像ファイル</strong>をまとめました。A/Bは別案で、修正したA案は現在の使用候補に反映しています。</p><p>同じ元画像を別用途で再掲しているものもあります。「使用候補」は掲載完了を意味しません。人物や実在の事務所を撮影した写真ではなく、クルーアセント用の生成素材です。画像をクリックすると元の大きさで開きます。</p><p><a href="image-catalog.csv">解説一覧CSV</a> ／ <a href="README.txt">使い方</a></p></div></header><div class="toolbar"><label for="search">検索</label><input id="search" type="search" placeholder="例：タイル、制作の流れ、修正版"><label for="group">分類</label><select id="group">'''+options+'''</select><span id="count" aria-live="polite">57 / 57 画像</span></div><main>'''+''.join(sections)+'''<p id="empty" hidden>該当する画像がありません。</p></main><footer>画像ファイル57点。内容が同じ再掲ファイルも含みます。日本語はUTF-8、画像の参照先は同梱ファイルだけです。</footer><script>
const search=document.getElementById('search'),group=document.getElementById('group');function update(){const q=search.value.trim().toLocaleLowerCase();let n=0;document.querySelectorAll('main section').forEach(s=>{let shown=0;const match=group.value==='all'||group.value===s.dataset.group;s.querySelectorAll('.card').forEach(c=>{const yes=match&&(!q||c.dataset.search.toLocaleLowerCase().includes(q));c.hidden=!yes;if(yes)shown++;});s.hidden=shown===0;n+=shown;});document.getElementById('count').textContent=n+' / 57 画像';document.getElementById('empty').hidden=n!==0;}search.addEventListener('input',update);group.addEventListener('change',update);
</script></body></html>'''
write_utf8('index.html',page)

from html.parser import HTMLParser
class GalleryParser(HTMLParser):
    def __init__(self):super().__init__();self.images=[];self.links=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='img':self.images.append(a['src'])
        if tag=='a':self.links.append(a['href'])
parser=GalleryParser();parser.feed(page)
assert len(parser.images)==57
assert {r['path'] for r in rows}==set(parser.images)
for p in parser.images+parser.links: assert (OUT/p).is_file(),p
for p in OUT.rglob('*'):
    if p.is_file():
        assert p.relative_to(OUT).as_posix().isascii()
        if p.suffix in ['.html','.txt','.csv','.json']:
            b=p.read_bytes();assert b.startswith(b'\xef\xbb\xbf')
            assert '\ufffd' not in b.decode('utf-8-sig',errors='strict')

hashes=[]
for p in sorted(OUT.rglob('*')):
    if p.is_file() and p.name!='SHA256SUMS.txt':hashes.append(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(OUT).as_posix())
write_utf8('SHA256SUMS.txt','\n'.join(hashes)+'\n')
archive=BASE/'crewascent-all-images-explained-20261101.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in sorted(OUT.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(OUT).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert len(z.namelist())==63==len(set(z.namelist()))
    for name in z.namelist():assert z.read(name)==(OUT/name).read_bytes()
report={'date':'2026-11-01','archive':archive.name,'archive_bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'image_files':len(rows),'unique_file_contents':len(seen),'all_files':63,'groups':dict(Counter(r['group'] for r in rows)),'zip_crc':'PASS','source_copy_integrity':'PASS','image_decode_validation':'PASS','gallery_image_links':57,'text_encoding':'UTF-8 with BOM','filenames':'ASCII only'}
(ROOT/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8-sig')
print(json.dumps(report,ensure_ascii=False,indent=2))
