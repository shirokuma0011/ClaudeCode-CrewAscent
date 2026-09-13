"""One-time migration of the studio's presentation. Run from the project root."""
from pathlib import Path
import re, json

root=Path.cwd()
old=(root/'index.html').read_text(encoding='utf-8')
header=re.search(r'<header class="ca-header">.*?</header>',old,re.S).group()
footer=re.search(r'<footer class="ca-footer">.*?</footer>',old,re.S).group()
plans=json.loads((root/'data/commerce-plans.json').read_text(encoding='utf-8'))
def button(href,text,secondary=False):
    return f'<a class="ca-button{" ca-button-line" if secondary else ""}" href="{href}">{text}<span aria-hidden="true">↗</span></a>'
def sectionhead(n,label,title,lead=''):
    return f'<div class="studio-section-head"><p class="ca-kicker">{n} / {label}</p><div><h2>{title}</h2>{f"<p>{lead}</p>" if lead else ""}</div></div>'
def cta():
    return '<section class="studio-contact"><div class="wrap"><p class="ca-kicker">LET’S TALK</p><h2>まだ、まとまっていなくても。<br>いいサイトは、ここから。</h2><p>相談は無料。制作するかどうかは、内容を確認してから決められます。</p><div class="studio-contact-options"><a href="contact.html"><span><small>文章で、気軽に。</small><strong>無料ヒアリングシート</strong></span><b aria-hidden="true">↗</b></a><a href="booking.html"><span><small>話しながら、じっくり。</small><strong>60分の無料相談を予約</strong></span><b aria-hidden="true">↗</b></a></div></div></section>'
def page(title,description,body,classes=''):
    return f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}｜クルーアセント</title><meta name="description" content="{description}"><meta name="robots" content="noindex,follow"><meta name="theme-color" content="#f6f5f1"><meta property="og:image" content="assets/og/og-home.png">
<link rel="icon" href="assets/brand/icon-32.png"><link rel="preload" as="font" type="font/woff2" href="assets/fonts/CASans-700.woff2" crossorigin><link rel="stylesheet" href="assets/css/base.css"><link rel="stylesheet" href="assets/css/upgrade.css?v=2027.1"><script defer src="assets/js/upgrade.js?v=2027.1"></script></head>
<body class="ca-page {classes}"><a class="skip-link" href="#main">本文へスキップ</a>{header}<main id="main">{body}</main>{footer}</body></html>'''

tiles=''.join(f'<i class="tile-q{(0 if n//6<3 else 2)+(1 if n%6<3 else 2)}{" chosen" if n==14 else ""}"></i>' for n in range(36))
hero=f'''<section class="studio-hero wrap"><div class="studio-hero-copy"><p class="studio-eyebrow"><span></span>小さな事業のための、Web制作事務所。</p><h1>その事業らしさに、<br><em>伝わる設計を。</em></h1><p class="studio-hero-lead">決める前に、整理するところから。<br>あなたの事業に合う見せ方を見つけ、<br>必要な情報が、きちんと届くサイトへ。</p><div class="ca-actions">{button('diagnosis.html','無料で、サイトの方向を見つける')}<a class="ca-text-link" href="plans.html">プラン・料金を見る <span aria-hidden="true">↗</span></a></div><p class="studio-reassurance">Web診断36 · 登録不要 · 16問なら約2〜3分</p></div><div class="studio-hero-art"><div class="studio-art-top"><span>FIND YOUR<br>PERSPECTIVE.</span><span>36<br>↗</span></div><div class="studio-matrix" aria-hidden="true">{tiles}</div><div class="studio-art-bottom"><span>ひとつの正解より、<br>あなたに合う方向を。</span><a href="types.html" aria-label="36のサイトタイプを見る">36 TYPES <span aria-hidden="true">↗</span></a></div></div></section>
<div class="studio-hero-foot wrap"><span>DESIGN STARTS WITH UNDERSTANDING.</span><a href="#approach">私たちのつくり方 <span aria-hidden="true">↓</span></a></div>'''
approach=f'''<section class="studio-section wrap" id="approach">{sectionhead('01','OUR APPROACH','いい見た目には、<br>伝わる理由がある。','誰に、何を届けたいか。そこを一緒に整理することで、<br>見た目にも、ページ構成にも、選ぶ理由が生まれます。')}<div class="studio-principles"><article><span>01</span><h3>事業を、理解する。</h3><p>診断とヒアリングで、目的や強み、届けたい相手を整理。まだ言葉になっていないことから伺います。</p></article><article><span>02</span><h3>迷わない、順番にする。</h3><p>サービス、料金、問い合わせ。読む人が知りたい順番で、必要な情報と導線を組み立てます。</p></article><article><span>03</span><h3>使う場面まで、整える。</h3><p>手の中のスマホでも、机の上のPCでも。文字の読みやすさ、操作のしやすさを確かめます。</p></article></div><a class="ca-text-link" href="services.html">制作すること・対応する範囲 <span aria-hidden="true">↗</span></a></section>'''
directions=[('01','情報を、わかりやすく。','サービス内容や連絡先に、迷わずたどり着ける。','type-clear-information.html','実用・情報'),('02','らしさを、印象に。','雰囲気や価値観から、事業の魅力が伝わる。','type-refined-brand.html','ブランド・魅力'),('03','安心して、読み進める。','見慣れた構成で、大切な情報を落ち着いて読める。','type-trustworthy-information.html','王道・安心'),('04','新しさで、惹きつける。','余白、表現、動きに、今らしい感覚を取り入れる。','type-future-brand.html','先進・新しさ')]
directioncards=''.join(f'<a class="studio-direction direction-{i}" href="{href}"><div class="direction-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div><small>{label}</small><h3>{title}</h3><p>{copy}</p><span class="direction-link">タイプの一例を見る ↗</span></a>' for i,title,copy,href,label in directions)
diagnosis=f'''<section class="studio-diagnosis" id="diagnosis"><div class="wrap">{sectionhead('02','WEB DIAGNOSIS 36','あなたのサイトは、<br>どの方向へ。','「好きなデザイン」の、その先へ。<br>4つの視点から、今の事業に必要な方向を整理します。')}<div class="studio-direction-grid">{directioncards}</div><div class="studio-diagnosis-bottom"><p>4つの視点を2つの軸にまとめた、36のサイトタイプ。<br>結果は、構成や配色を話し合うための手がかりです。</p>{button('diagnosis.html','無料のWeb診断36を始める')}</div><p class="studio-note">タイプに優劣はありません。心理・性格・経営を評価する診断ではなく、Webサイト設計の方向を整理する目安です。</p></div></section>'''
plancards=''.join(f'<article class="studio-plan"><p class="ca-kicker">PLAN 0{i+1}</p><h3>{p["name"]}</h3><p>{p["copy"]}</p><div class="studio-price">{p["price"]//10000}<small>万円</small></div><div class="studio-plan-facts"><span>{p["pages"]}</span><span>{p["weeks"]}</span></div><a href="plans.html#plan-{p["id"]}" class="ca-text-link">含まれる内容を見る <span aria-hidden="true">↗</span></a></article>' for i,p in enumerate(plans))
pricing=f'''<section class="studio-section wrap">{sectionhead('03','PLANS & PRICING','必要な分だけ、<br>きちんとつくる。','ページ数と、文章・画像をどこまで準備するか。<br>同じ条件で比べられる、4つの制作プランです。')}<div class="studio-plan-grid">{plancards}</div><div class="studio-plan-common"><strong>すべてのプランに。</strong><span>スマホ対応</span><span>基本SEO</span><span>問い合わせ導線</span><span>公開作業</span></div><p class="studio-note">制作費は買い切り。税区分は公開前に確定します。納期は原稿・写真の提出後からの目安です。公開後の管理は任意の別契約となります。</p></section>'''
process=f'''<section class="studio-process"><div class="wrap"><div class="studio-process-top"><div><p class="ca-kicker">04 / WORKING TOGETHER</p><h2>つくる間も、<br>迷わせない。</h2><p>何を確認して、次に何をするか。<br>一つずつ共有しながら進めます。</p><a class="ca-text-link" href="process.html">制作の流れを詳しく <span aria-hidden="true">↗</span></a></div><ol class="studio-process-list"><li><span>01</span><div><h3>相談して、整理する。</h3><p>診断やヒアリングから、ご希望と必要な情報を整理します。</p></div></li><li><span>02</span><div><h3>範囲と金額を、確かめる。</h3><p>作業内容・納期をご確認後に契約。着手金は制作費の50%です。</p></div></li><li><span>03</span><div><h3>つくって、一緒に確かめる。</h3><p>初稿を確認し、まとめていただいた修正内容を反映します。</p></div></li><li><span>04</span><div><h3>事業の、新しい窓口へ。</h3><p>最終確認・残金のお支払い後に公開、または納品します。</p></div></li></ol></div><figure class="studio-photo"><img src="assets/img/band-shop-morning-1440.webp" width="1440" height="300" loading="lazy" decoding="async" alt="朝の光のなか、店のシャッターを開ける手元"><figcaption>小さな事業の、大切な一歩のために。<span>CREW ASCENT</span></figcaption></figure></div></section>'''
faqs=[('何も決まっていなくても相談できますか？','はい。事業のことと、今困っていることから教えてください。文章や写真がそろっていなくても、準備の進め方から相談できます。'),('診断を受けると、申し込みが必要ですか？','必要ありません。結果を見るだけでも大丈夫です。診断では、氏名やメールアドレスの登録も不要です。'),('オンラインで話す必要はありますか？','メールだけでの相談も可能です。話しながら整理したい場合は、60分の無料ヒアリングをお選びください。'),('制作費以外にも費用はかかりますか？','ドメインやサーバー、外部サービスの利用料が別途必要になる場合があります。公開後の管理は任意の別契約です。追加作業は、事前に内容と金額を確認します。')]
faq='<section class="studio-section wrap studio-faq"><div><p class="ca-kicker">05 / QUESTIONS</p><h2>はじめる前の、<br>気になること。</h2><a class="ca-text-link" href="faq.html">よくある質問をすべて見る ↗</a></div><div class="ca-faq">'+''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q,a in faqs)+'</div></section>'
(root/'index.html').write_text(page('事業らしさを、伝わる設計に。Web制作・Web診断36','小規模事業者のためのWeb制作事務所。無料のWeb診断36とヒアリングから、事業に合う方向を整理。8万・12万・15万・22万円の4プラン。',hero+approach+diagnosis+pricing+process+faq+cta(),'studio-home'),encoding='utf-8')

# Keep all contractual plan details; introduce a scannable price index and aligned comparison.
p=root/'plans.html';s=p.read_text(encoding='utf-8')
start=s.index('<main id="main">');end=s.index('</main>',start)
intro='<section class="ca-intro wrap"><p class="ca-kicker">PLANS & PRICING</p><h1>ちょうどいい範囲で、<br>納得できる、つくり方を。</h1><p class="ca-intro-lead">4つのプランの違いは、ページ数と準備の範囲。<br>必要なものを見比べて、今の事業に合う形を選べます。</p><nav class="studio-plan-nav" aria-label="プランの詳細へ">'+''.join(f'<a href="#plan-{p["id"]}">{p["name"]}<strong>{p["price"]//10000}<small>万円</small></strong></a>' for p in plans)+'</nav></section>'
detail='<div class="wrap ca-content"><p class="ca-notice">表示価格の税区分は公開前に確定します。相談・見積内容の確認だけでは料金は発生しません。</p><div class="studio-plan-detail-grid">'
for i,p in enumerate(plans):
    detail+=f'<article class="ca-plan" id="plan-{p["id"]}"><p class="ca-kicker">PLAN 0{i+1}</p><h2>{p["name"]}</h2><p>{p["copy"]}</p><div class="ca-price">{p["price"]:,}<small>円</small></div><dl>'+''.join(f'<div><dt>{name}</dt><dd>{p[key]}</dd></div>' for name,key in [('ページ','pages'),('文章','text'),('画像','images'),('修正','revisions'),('納期','weeks')])+f'</dl>{button("contact.html?plan="+p["id"],"このプランを相談する")}<a class="ca-plan-payment" href="checkout-{p["id"]}.html">契約・支払い内容を確認 ↗</a></article>'
detail+='</div><section class="studio-scope"><div><p class="ca-kicker">INCLUDED</p><h2>全プランで整えること。</h2><ul class="ca-list"><li>基本のページ構成とスマートフォン対応</li><li>問い合わせフォーム・連絡先への導線</li><li>基本SEO設定（title・description・OGP）</li><li>公開作業</li></ul></div><div><p class="ca-kicker">BEFORE WE START</p><h2>事前に、確認すること。</h2><p>修正1回は、まとめて提出された修正依頼1セットです。大幅な構成変更やページ追加は、別途お見積もりします。</p><p>本格的な取材・撮影・ブランド開発、複雑な予約・決済、SEO記事やSNS運用は含みません。</p></div></section><section class="ca-notice"><h2>おまかせプランの準備支援</h2><p>回答をもとにした見出し・紹介文・導線文の作成、画像の選定・調整、サイト用の簡易ロゴ1案、ファビコン・OGP、外部サービスへのリンク、GA4・Search Consoleの基本設定を含みます。本格的なブランド開発とは範囲が異なります。</p></section><section class="studio-scope"><div><p class="ca-kicker">PAYMENT</p><h2>お支払いは、2回に。</h2><p>ご契約後に着手金50%。最終確認後、納品・公開前に残金50%をお支払いいただきます。</p><a class="ca-text-link" href="contracts.html">契約書・お支払いについて ↗</a></div><div><p class="ca-kicker">AFTER LAUNCH</p><h2>公開後の管理は、選べます。</h2><p>月額5,500円、または年額50,000円の別契約です。制作だけのご依頼も可能です。</p><a class="ca-text-link" href="management.html">公開・管理の内容を見る ↗</a></div></section></div>'
s=s[:start]+'<main id="main">'+intro+detail+cta()+s[end:];(root/'plans.html').write_text(s,encoding='utf-8')

# The design system loads last, once, on every page (including all 36 type pages).
for p in list(root.glob('*.html'))+list((root/'contracts').glob('*.html')):
    s=p.read_text(encoding='utf-8')
    s=re.sub(r'<link\s+rel="stylesheet"\s+href="(?:\.\./)?assets/css/upgrade\.css[^\"]*">','',s)
    prefix='../' if p.parent.name=='contracts' else ''
    s=re.sub(r'<link\s+rel="stylesheet"\s+href="(?:\.\./)?assets/css/studio\.css[^\"]*">','',s)
    s=s.replace('</head>',f'<link rel="stylesheet" href="{prefix}assets/css/upgrade.css?v=2027.1"><link rel="stylesheet" href="{prefix}assets/css/studio.css?v=2027.1"></head>')
    s=re.sub(r'assets/js/upgrade\.js(?:\?[^\"]*)?', 'assets/js/upgrade.js?v=2027.1',s)
    s=s.replace('無料で相談する <span','無料相談 <span')
    p.write_text(s,encoding='utf-8')
