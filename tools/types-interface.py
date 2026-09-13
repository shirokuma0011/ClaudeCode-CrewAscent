from pathlib import Path
import re
p=Path('types.html');s=p.read_text(encoding='utf-8')
controls='''<div class="studio-type-controls wrap" hidden><div><label for="type-search">キーワードで探す</label><input type="search" id="type-search" placeholder="例：信頼、情報、CA09" autocomplete="off"></div><div><label for="type-area">方向を絞り込む</label><select id="type-area"><option value="all">すべての方向</option value="0">実用・情報 × 先進・新しさ</option><option value="1">ブランド・魅力 × 先進・新しさ</option><option value="2">実用・情報 × 王道・安心</option><option value="3">ブランド・魅力 × 王道・安心</option></select></div><p id="type-count" role="status" aria-live="polite">36タイプを表示</p><button type="button" id="type-reset" hidden>絞り込みを解除</button></div>'''
pos=s.index('<section class="sec ');s=s[:pos]+controls+s[pos:]
s=s.replace('自分がどこに入るかは、16問で分かります。','今の事業に合う方向を、16問から。').replace('2〜3分です。登録もログインも必要ありません。','所要時間は約2〜3分。登録もログインも必要ありません。')
p.write_text(s,encoding='utf-8')
