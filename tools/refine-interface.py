from pathlib import Path
import re
root=Path.cwd()
p=root/'diagnosis.html';s=p.read_text(encoding='utf-8')
mode=re.search(r'<div class="mode-compare">.*?</div>\s*</div>\s*<p class="hint"',s,re.S).group().rsplit('<p class="hint"',1)[0]
diagram=re.search(r'<figure class="dgm dgm--steps">.*?</figure>',s,re.S).group()
start=s.index('<div id="dg-start">');end=s.index('<div id="dg-app"',start)
intro='''<div id="dg-start"><section class="ca-intro wrap studio-diagnosis-intro"><p class="ca-kicker">FREE / NO REGISTRATION</p><h1>Web診断36<br><span>あなたのサイトの、方向を見つける。</span></h1><p class="ca-intro-lead">伝える情報、感じてほしい印象、使いやすさ。<br>今、何を優先したいかから、サイトのつくり方を整理します。</p><div class="studio-diagnostic-benefits"><span>氏名・メール不要</span><span>途中から再開できる</span><span>結果だけの利用もOK</span></div></section><div class="wrap wrap--mid"><div class="dg-resume" id="dg-resume" hidden></div></div><section class="studio-diagnostic-start wrap wrap--mid">'''+mode+'''<p class="studio-note">どちらも同じ36タイプで表示します。16問は短時間で方向をつかむ版、84問はより多くの場面を考える版です。</p><details class="studio-explainer"><summary>診断でわかること・回答のしかた</summary><div><p>各設問について、今の考えにどの程度近いかを5段階で選びます。迷う場合は「どちらともいえない」で進められます。回答しても自動では次に進みません。</p>'''+diagram+'''</div></details><p class="studio-note">心理・性格・経営を評価するものではなく、Webサイト設計の方向を整理する目安です。回答はこの端末に保存され、サーバーには送信されません。保存から30日を過ぎると再開できなくなります。</p><noscript><p class="ca-notice">診断にはJavaScriptが必要です。<a href="contact.html">無料相談</a>は診断を受けずに始められます。</p></noscript></section></div>'''
s=s[:start]+intro+s[end:]
p.write_text(s,encoding='utf-8')

p=root/'contact.html';s=p.read_text(encoding='utf-8')
start=s.index('<div id="hearing-fields">');end=s.index('<section id="hearing-review"',start)
labels=re.findall(r'<label(?:\s[^>]*)?>.*?</label>',s[start:end],re.S)
def take(name):
    return next(x for x in labels if f'name="{name}"' in x)
basic='<section class="ca-form-section"><p class="ca-kicker">01 / YOUR MESSAGE</p><h2>まずは、ご相談内容から。</h2>'+take('goals')+'<div class="ca-field-grid">'+take('name')+take('email')+'</div>'+take('customerType')+'</section>'
optional='<details class="studio-explainer studio-optional"><summary>事業やご希望を、もう少し詳しく <span>任意</span></summary><div><p>分かる項目だけで大丈夫です。未記入のままでも相談できます。</p>'+''.join(take(n) for n in ['business','industry','description','currentUrl','plan','timing','materials','notes','diagnosis'])+'</div></details>'
last='<section class="ca-form-section"><p class="ca-kicker">02 / BEFORE SENDING</p><h2>ご連絡について。</h2>'+take('communication')+take('consent')+'<div class="ca-honeypot" aria-hidden="true">'+take('website_confirm')+'</div><p class="ca-fine">このシートの送信で、制作契約や料金は発生しません。営業メールの購読登録も行いません。</p><button class="ca-button" type="submit">入力内容を確認する <span aria-hidden="true">→</span></button></section>'
s=s[:start]+'<div id="hearing-fields">'+basic+optional+last+'</div>'+s[end:]
s=s.replace('お話の前に、<br>少しだけ、教えてください。','つくりたいこと、<br>困っていること。そこから。').replace('所要時間の目安は5〜8分。','まずは、ご相談内容とご連絡先から。')
s=s.replace('<aside class="ca-form-aside">','<aside class="ca-form-aside studio-hearing-aside">')
p.write_text(s,encoding='utf-8')
