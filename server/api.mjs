export const CONTRACT_VERSION='2026-09-09-draft-v1';
export const PRIVACY_VERSION='2026-09-09-preview-v1';
export const prices={first:80000,simple:120000,standard:150000,omakase:220000};
const labels={first:'はじめて',simple:'シンプル',standard:'標準',omakase:'おまかせ'};
const encoder=new TextEncoder();
const now=()=>Math.floor(Date.now()/1000);
const id=()=>crypto.randomUUID();
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
class ApiError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const fail=(message,status=400)=>{throw new ApiError(message,status);};
const sha=async(value)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');
async function hmac(secret,value){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));}
const hex=bytes=>Array.from(bytes).map(v=>v.toString(16).padStart(2,'0')).join('');
const base64=bytes=>btoa(String.fromCharCode(...bytes));
function equal(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
const token=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
function clean(v,max,required=false){if(typeof v!=='string'){if(required)fail('必須項目を入力してください。');return '';}const s=v.trim();if(s.length>max)fail('入力内容が長すぎます。');if(required&&!s)fail('必須項目を入力してください。');return s;}
function email(v){const s=clean(v,254,true).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))fail('メールアドレスを確認してください。');return s;}
function requestKey(v){if(typeof v!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(v))fail('ページを再読み込みしてから送信してください。');return v;}
async function body(req,max=24576){if(!req.headers.get('content-type')?.includes('application/json'))fail('JSON形式で送信してください。',415);const len=Number(req.headers.get('content-length')||0);if(len>max)fail('送信サイズが大きすぎます。',413);const reader=req.body?.getReader();if(!reader)fail('内容がありません。');let total=0;const chunks=[];for(;;){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();fail('送信サイズが大きすぎます。',413);}chunks.push(value);}const all=new Uint8Array(total);let pos=0;for(const c of chunks){all.set(c,pos);pos+=c.length;}try{return JSON.parse(new TextDecoder().decode(all));}catch{fail('送信内容を読み取れません。');}}
function consent(b){if(b.consent!==true)fail('個人情報の取り扱いへの同意が必要です。');if(b.website_confirm)fail('送信を受け付けられません。');}
function originGuard(req,env){const origin=req.headers.get('origin');if(!env.SITE_ORIGIN||origin!==env.SITE_ORIGIN)fail('このサイトの画面から操作してください。',403);if(req.headers.get('sec-fetch-site')==='cross-site')fail('このサイトの画面から操作してください。',403);}
function envReady(env){return env.COMMERCE_ENABLED==='true'&&env.TAX_MODE==='included'&&env.LEGAL_APPROVED==='true'&&!!env.SHOPIFY_STORE_DOMAIN&&!!env.SHOPIFY_STOREFRONT_TOKEN&&!!env.SHOPIFY_WEBHOOK_SECRET&&!!env.LEGAL_BUSINESS_NAME&&!!env.CONTACT_EMAIL&&!!env.BUSINESS_ADDRESS&&!!env.BUSINESS_PHONE;}
async function limit(db,key,max,seconds){const n=now();await db.prepare('DELETE FROM rates WHERE expires < ?').bind(n).run();const row=await db.prepare('INSERT INTO rates (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,n+seconds).first();if(row.count>max)fail('短時間に操作が集中しています。時間をおいてもう一度お試しください。',429);}
async function admin(req,env){if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<24||!env.SESSION_SECRET||env.SESSION_SECRET.length<32)fail('管理者認証の設定が必要です。',503);const value=req.headers.get('cookie')?.match(/(?:^|;\s*)ca_admin=([^;]+)/)?.[1]||'';const [expires,nonce,sig]=value.split('.');if(!/^\d+$/.test(expires)||Number(expires)<now()||Number(expires)>now()+12*3600||!nonce||!equal(sig,hex(await hmac(env.SESSION_SECRET,expires+'.'+nonce))))fail('管理画面にログインしてください。',401);}
async function outbox(db,kind,payload){await db.prepare('INSERT INTO outbox (id,kind,payload,created_at,attempts) VALUES (?,?,?,?,0)').bind(id(),kind,JSON.stringify(payload),now()).run();}
const ref=(kind,value)=>kind+'-'+value.slice(0,8).toUpperCase();
function requireSubmissions(env){if(env.ACCEPT_SUBMISSIONS!=='true')fail('現在、受付の準備中です。',503);if(env.SITE_MODE==='live'&&(!env.CONTACT_EMAIL||!env.LEGAL_BUSINESS_NAME||env.PRIVACY_APPROVED!=='true'))fail('受付に必要な事業者情報の設定がまだ完了していません。',503);}
async function getQuote(db,raw){if(!raw||!/^[a-f0-9]{64}$/.test(raw))fail('専用のお支払いリンクからお進みください。',404);const q=await db.prepare('SELECT * FROM quotes WHERE token_hash=?').bind(await sha(raw)).first();if(!q)fail('お支払いリンクが見つかりません。',404);if(q.expires<now())fail('このお支払いリンクは期限切れです。再発行をご相談ください。',410);return q;}
function publicQuote(q){return {id:q.id,plan:q.plan,customerType:q.customer_type,stage:q.stage,amount:q.amount,total:q.total,scope:q.scope,delivery:q.delivery,expires:q.expires,status:q.status,contractVersion:q.contract_version};}
async function notifyPending(db,env){
  if(!env.RESEND_API_KEY||!env.MAIL_FROM||!env.CONTACT_EMAIL||env.MAIL_ENABLED!=='true')return {sent:0,pending:true};
  const rows=(await db.prepare('SELECT * FROM outbox WHERE sent_at IS NULL AND attempts<5 ORDER BY created_at LIMIT 10').all()).results;
  let sent=0;
  for(const row of rows){
    const p=JSON.parse(row.payload);const when=p.startsAt?new Date(p.startsAt*1000).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'';
    const isCancel=row.kind==='booking-cancelled';const subject=row.kind==='inquiry'?'無料相談を受け付けました':isCancel?'ご予約を取り消しました':'無料ヒアリングのご予約が確定しました';
    const text=row.kind==='inquiry'?`${p.name} 様\n\nご相談を受け付けました。受付番号：${p.reference}\n内容を確認してご連絡します。\n\nクルーアセント\n${env.CONTACT_EMAIL}`:`${p.name} 様\n\n${subject}\n日時：${when}（日本時間）／60分\n受付番号：${p.reference}\n${!isCancel?`予約の確認・取り消し：${env.SITE_ORIGIN}/booking-cancel.html#token=${p.token}\n参加方法は担当者から別途ご案内します。`:''}\nクルーアセント\n${env.CONTACT_EMAIL}`;
    try{
      const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':row.id},body:JSON.stringify({from:env.MAIL_FROM,to:[p.email],bcc:[env.CONTACT_EMAIL],subject:'【クルーアセント】'+subject,text}),signal:AbortSignal.timeout(10000)});
      if(!r.ok)throw new Error('mail-'+r.status);
      await db.prepare('UPDATE outbox SET sent_at=?,attempts=attempts+1,last_error=NULL WHERE id=?').bind(now(),row.id).run();sent++;
    }catch(e){await db.prepare('UPDATE outbox SET attempts=attempts+1,last_error=? WHERE id=?').bind(String(e.message).slice(0,80),row.id).run();}
  }return {sent,pending:false};
}
export async function handleApi(req,env,ctx={}){
 const url=new URL(req.url),path=url.pathname,method=req.method,db=env.DB;
 try{
  if(path==='/api/config'&&method==='GET')return json({mode:env.SITE_MODE||'preview',acceptSubmissions:env.ACCEPT_SUBMISSIONS==='true',commerceReady:envReady(env),taxMode:env.TAX_MODE||'pending',mailEnabled:env.MAIL_ENABLED==='true'&&!!env.RESEND_API_KEY,timezone:'Asia/Tokyo',privacyVersion:PRIVACY_VERSION,contractVersion:CONTRACT_VERSION});
  if(!db)fail('データ保存の設定がまだ完了していません。',503);
  if(path==='/api/shopify/webhook'&&method==='POST')return await webhook(req,env);
  if(!['GET','HEAD'].includes(method))originGuard(req,env);
  const ip=await sha((req.headers.get('cf-connecting-ip')||env.LOCAL_CLIENT_IP||'unknown')+'|'+(env.SESSION_SECRET||'preview'));
  if(path==='/api/admin/login'&&method==='POST'){
    await limit(db,'login:'+ip,8,900);const b=await body(req);
    if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<24||!env.SESSION_SECRET||env.SESSION_SECRET.length<32)fail('管理者用の認証設定を行ってください。',503);
    if(!equal(await sha(clean(b.password,256,true)),await sha(env.ADMIN_PASSWORD)))fail('ログイン情報を確認してください。',401);
    const payload=(now()+8*3600)+'.'+token();const cookie=payload+'.'+hex(await hmac(env.SESSION_SECRET,payload));
    return json({ok:true},200,{'set-cookie':`ca_admin=${cookie}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=28800${env.SITE_ORIGIN?.startsWith('https:')?'; Secure':''}`});
  }
  if(path.startsWith('/api/admin/')){
    await admin(req,env);
    if(path==='/api/admin/logout'&&method==='POST')return json({ok:true},200,{'set-cookie':'ca_admin=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0'});
    if(path==='/api/admin/dashboard'&&method==='GET'){
      const slots=(await db.prepare("SELECT s.*,b.id AS booking_id,b.name,b.email,b.notes FROM slots s LEFT JOIN bookings b ON s.id=b.slot_id AND b.status='confirmed' WHERE s.starts_at>? ORDER BY s.starts_at LIMIT 500").bind(now()-86400*30).all()).results;
      const inquiries=(await db.prepare('SELECT id,payload,created_at FROM inquiries ORDER BY created_at DESC LIMIT 100').all()).results.map(r=>({...r,payload:JSON.parse(r.payload)}));
      const quotes=(await db.prepare('SELECT id,plan,customer_type,email,stage,amount,status,delivery,created_at FROM quotes ORDER BY created_at DESC LIMIT 100').all()).results;
      const pending=await db.prepare('SELECT count(*) AS total FROM outbox WHERE sent_at IS NULL').first();
      return json({slots,inquiries,quotes,pendingNotifications:pending.total,commerceReady:envReady(env),mode:env.SITE_MODE||'preview'});
    }
    if(path==='/api/admin/slots'&&method==='POST'){
      const b=await body(req);const start=Number(b.startsAt);
      if(!Number.isInteger(start)||start<now()+3600||start>now()+366*86400||start%60!==0)fail('1時間以上先、1年以内の日時を指定してください。');
      const slotId=id();
      const r=await db.prepare('INSERT INTO slots (id,starts_at,ends_at,active,created_at) SELECT ?,?,?,1,? WHERE NOT EXISTS (SELECT 1 FROM slots WHERE active=1 AND starts_at<? AND ends_at>?) ON CONFLICT(starts_at) DO UPDATE SET active=1 WHERE slots.active=0 RETURNING *').bind(slotId,start,start+3600,now(),start+3600,start).first();
      if(!r)fail('この時間帯には、重なる予約枠がすでにあります。',409);return json({slot:r},201);
    }
    if(path==='/api/admin/slots/close'&&method==='POST'){
      const b=await body(req);const r=await db.prepare("UPDATE slots SET active=0 WHERE id=? AND NOT EXISTS (SELECT 1 FROM bookings WHERE slot_id=slots.id AND status='confirmed') RETURNING id").bind(clean(b.id,64,true)).first();if(!r)fail('予約済みの枠は非公開にできません。予約者への連絡・調整が必要です。',409);return json({ok:true});
    }
    if(path==='/api/admin/quotes'&&method==='POST'){
      const b=await body(req);if(!prices[b.plan]||!['business','consumer'].includes(b.customerType)||!['deposit','balance'].includes(b.stage))fail('プラン・利用区分・支払い段階を確認してください。');
      if(b.approved!==true)fail('お客様との見積もり合意を確認してください。');
      const quoteId=id(),raw=token(),n=now();const total=prices[b.plan];
      const q={id:quoteId,plan:b.plan,customerType:b.customerType,email:email(b.email),stage:b.stage,amount:total/2,total,scope:clean(b.scope,4000,true),delivery:clean(b.delivery,1000,true)};
      await db.prepare('INSERT INTO quotes (id,token_hash,plan,customer_type,email,stage,amount,total,scope,delivery,expires,created_at,status,contract_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(q.id,await sha(raw),q.plan,q.customerType,q.email,q.stage,q.amount,q.total,q.scope,q.delivery,n+7*86400,n,'approved',CONTRACT_VERSION).run();
      return json({quote:q,url:`${env.SITE_ORIGIN}/checkout-${q.plan}.html#quote=${raw}`,expires:n+7*86400},201);
    }
    if(path==='/api/admin/notifications/retry'&&method==='POST')return json(await notifyPending(db,env));
    if(path==='/api/admin/quotes/revoke'&&method==='POST'){
      const b=await body(req);const r=await db.prepare("UPDATE quotes SET status='revoked' WHERE id=? AND status='approved' AND checkout_url IS NULL RETURNING id").bind(clean(b.id,64,true)).first();if(!r)fail('決済へ進んだリンクはShopify側での確認・処理が必要です。',409);return json({ok:true});
    }
    fail('見つかりません。',404);
  }
  if(path==='/api/slots'&&method==='GET'){
    const month=url.searchParams.get('month');if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||''))fail('年月を確認してください。');
    const start=Math.floor(Date.parse(month+'-01T00:00:00+09:00')/1000);const [year,m]=month.split('-').map(Number);const end=Math.floor(Date.UTC(year,m,1)/1000)-9*3600;
    if(start>now()+366*86400||end<now()-31*86400)fail('表示できる期間の範囲外です。');
    const rows=(await db.prepare("SELECT id,starts_at,ends_at FROM slots WHERE active=1 AND starts_at>=? AND starts_at<? AND starts_at>? AND NOT EXISTS (SELECT 1 FROM bookings WHERE bookings.slot_id=slots.id AND bookings.status='confirmed') ORDER BY starts_at").bind(start,end,now()+3600).all()).results;
    return json({slots:rows,timezone:'Asia/Tokyo'});
  }
  if(path==='/api/inquiries'&&method==='POST'){
    requireSubmissions(env);const b=await body(req);consent(b);const key=requestKey(b.requestKey);const n=now();
    const existing=await db.prepare('SELECT id FROM inquiries WHERE request_key=?').bind(key).first();if(existing)return json({reference:ref('H',existing.id),duplicate:true,mailEnabled:env.MAIL_ENABLED==='true'});
    await limit(db,'inquiry:'+ip,5,3600);
    const p={name:clean(b.name,100,true),email:email(b.email),business:clean(b.business,150),industry:clean(b.industry,120),description:clean(b.description,2000),goals:clean(b.goals,4000,true),currentUrl:clean(b.currentUrl,1000),notes:clean(b.notes,3000),diagnosis:clean(b.diagnosis,120),timing:clean(b.timing,100),materials:clean(b.materials,100),communication:clean(b.communication,50),plan:clean(b.plan,30),customerType:clean(b.customerType,20)};
    if(p.goals.length<10)fail('相談したいことを10文字以上でご記入ください。');
    if(!['business','consumer'].includes(p.customerType)||!['undecided',...Object.keys(prices)].includes(p.plan))fail('ご利用区分・プランを確認してください。');
    if(p.currentUrl){try{if(!['https:','http:'].includes(new URL(p.currentUrl).protocol))fail('URLを確認してください。');}catch{fail('URLを確認してください。');}}
    const rid=id();const inserted=await db.prepare('INSERT INTO inquiries (id,request_key,payload,created_at,privacy_version) VALUES (?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING RETURNING id').bind(rid,key,JSON.stringify(p),n,PRIVACY_VERSION).first();
    const actual=inserted?.id||(await db.prepare('SELECT id FROM inquiries WHERE request_key=?').bind(key).first()).id;
    if(inserted){await outbox(db,'inquiry',{name:p.name,email:p.email,reference:ref('H',actual)});if(ctx.waitUntil)ctx.waitUntil(notifyPending(db,env));}
    return json({reference:ref('H',actual),mailEnabled:env.MAIL_ENABLED==='true'&&!!env.RESEND_API_KEY},201);
  }
  if(path==='/api/bookings'&&method==='POST'){
    requireSubmissions(env);const b=await body(req);consent(b);const key=requestKey(b.requestKey);const name=clean(b.name,100,true),mail=email(b.email),notes=clean(b.notes,2000),slot=clean(b.slotId,64,true);
    // The caller supplies a 256-bit cancellation secret. Only its hash is stored on the booking.
    if(!/^[a-f0-9]{64}$/.test(b.cancelToken||''))fail('ページを再読み込みしてから送信してください。');
    const old=await db.prepare('SELECT b.*,s.starts_at,s.ends_at FROM bookings b JOIN slots s ON s.id=b.slot_id WHERE request_key=?').bind(key).first();
    if(old){if(old.email!==mail||old.token_hash!==await sha(b.cancelToken))fail('送信情報が一致しません。',409);return json({reference:ref('B',old.id),startsAt:old.starts_at,endsAt:old.ends_at,token:b.cancelToken,status:old.status,mailEnabled:env.MAIL_ENABLED==='true'});}
    await limit(db,'booking:'+ip,6,3600);
    const bid=id();let result;
    try{result=await db.prepare("INSERT INTO bookings (id,slot_id,name,email,notes,token_hash,request_key,status,created_at,privacy_version) SELECT ?,id,?,?,?,?,?,'confirmed',?,? FROM slots WHERE id=? AND active=1 AND starts_at>? AND NOT EXISTS (SELECT 1 FROM bookings WHERE slot_id=slots.id AND status='confirmed') RETURNING id").bind(bid,name,mail,notes,await sha(b.cancelToken),key,now(),PRIVACY_VERSION,slot,now()+3600).first();}catch(e){if(/UNIQUE|constraint/i.test(String(e)))fail('この枠は先に予約されました。別の日時をお選びください。',409);throw e;}
    if(!result)fail('この枠は予約済み、または受付を終了しています。別の日時をお選びください。',409);
    const s=await db.prepare('SELECT starts_at,ends_at FROM slots WHERE id=?').bind(slot).first();
    await outbox(db,'booking',{name,email:mail,reference:ref('B',bid),startsAt:s.starts_at,token:b.cancelToken});if(ctx.waitUntil)ctx.waitUntil(notifyPending(db,env));
    return json({reference:ref('B',bid),startsAt:s.starts_at,endsAt:s.ends_at,token:b.cancelToken,status:'confirmed',mailEnabled:env.MAIL_ENABLED==='true'&&!!env.RESEND_API_KEY},201);
  }
  if((path==='/api/booking/detail'||path==='/api/booking/cancel')&&method==='POST'){
    await limit(db,'cancel:'+ip,30,3600);const b=await body(req);if(!/^[a-f0-9]{64}$/.test(b.token||''))fail('予約リンクを確認してください。',404);
    const r=await db.prepare('SELECT b.*,s.starts_at,s.ends_at FROM bookings b JOIN slots s ON s.id=b.slot_id WHERE token_hash=?').bind(await sha(b.token)).first();if(!r)fail('予約が見つかりません。',404);
    if(path.endsWith('/cancel')){
      if(b.confirm!==true)fail('取り消しの確認が必要です。');if(r.starts_at<=now())fail('開始時刻を過ぎた予約は運営者にご相談ください。',409);
      const changed=await db.prepare("UPDATE bookings SET status='cancelled',cancelled_at=? WHERE id=? AND status='confirmed' RETURNING id").bind(now(),r.id).first();
      if(changed){await outbox(db,'booking-cancelled',{name:r.name,email:r.email,reference:ref('B',r.id),startsAt:r.starts_at});if(ctx.waitUntil)ctx.waitUntil(notifyPending(db,env));}
      return json({ok:true,status:'cancelled'});
    }
    return json({reference:ref('B',r.id),startsAt:r.starts_at,endsAt:r.ends_at,status:r.status});
  }
  if(path==='/api/quote/detail'&&method==='POST'){const b=await body(req);const q=await getQuote(db,b.token);return json({...publicQuote(q),commerceReady:envReady(env)});}
  if(path==='/api/checkout'&&method==='POST'){
    if(!envReady(env))fail('決済は準備中です。ご案内までお待ちください。',503);
    await limit(db,'checkout:'+ip,12,600);const b=await body(req);const q=await getQuote(db,b.token);
    if(b.agreed!==true||b.scopeAgreed!==true||b.contractVersion!==CONTRACT_VERSION)fail('最新の契約内容と支払い条件をご確認ください。');
    if(q.contract_version!==CONTRACT_VERSION)fail('契約書が更新されています。見積リンクの再発行をご相談ください。',409);
    if(q.status==='paid')fail('このお支払いは確認済みです。',409);if(q.status==='revoked'||q.status==='refunded'||q.status==='review')fail('このお支払いリンクは利用できません。担当者にご確認ください。',409);
    if(q.checkout_url)return json({checkoutUrl:q.checkout_url});
    const locked=await db.prepare("UPDATE quotes SET status='creating',accepted_at=? WHERE id=? AND status='approved' RETURNING id").bind(now(),q.id).first();if(!locked)fail('決済画面の準備中です。しばらくしてから再度お試しください。',409);
    try{
      const domain=env.SHOPIFY_STORE_DOMAIN;if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain))throw new Error('store-domain');
      const variant=env['SHOPIFY_VARIANT_'+q.plan.toUpperCase()+'_'+q.stage.toUpperCase()];if(!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(variant||''))throw new Error('variant-unconfigured');
      const gql=async(query,variables)=>{const r=await fetch(`https://${domain}/api/2026-07/graphql.json`,{method:'POST',headers:{'content-type':'application/json','Shopify-Storefront-Private-Token':env.SHOPIFY_STOREFRONT_TOKEN,'Shopify-Storefront-Buyer-IP':req.headers.get('cf-connecting-ip')||'127.0.0.1'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(15000)});const j=await r.json();if(!r.ok||j.errors)throw new Error('shopify-api');return j.data;};
      const product=await gql('query Variant($id:ID!){node(id:$id){... on ProductVariant{id availableForSale price{amount currencyCode}}}}',{id:variant});
      if(!product.node?.availableForSale||product.node.price.currencyCode!=='JPY'||Number(product.node.price.amount)!==q.amount)throw new Error('price-mismatch');
      const data=await gql('mutation CreateCart($input:CartInput!){cartCreate(input:$input){cart{id checkoutUrl cost{totalAmount{amount currencyCode}}} userErrors{field message}}}',{input:{lines:[{merchandiseId:variant,quantity:1}],buyerIdentity:{email:q.email,countryCode:'JP'},attributes:[{key:'crew_quote_id',value:q.id},{key:'crew_stage',value:q.stage},{key:'crew_contract_version',value:CONTRACT_VERSION}]}});
      const c=data.cartCreate;if(c.userErrors?.length||!c.cart?.checkoutUrl)throw new Error('cart-create');
      if(c.cart.cost.totalAmount.currencyCode!=='JPY'||Number(c.cart.cost.totalAmount.amount)!==q.amount)throw new Error('cart-total-mismatch');
      const u=new URL(c.cart.checkoutUrl);const allowed=[domain,...(env.SHOPIFY_CHECKOUT_HOSTS||'').split(',').map(s=>s.trim()).filter(Boolean)];if(u.protocol!=='https:'||!allowed.includes(u.hostname))throw new Error('checkout-host');
      await db.prepare("UPDATE quotes SET status='pending',checkout_url=? WHERE id=? AND status='creating'").bind(u.href,q.id).run();return json({checkoutUrl:u.href});
    }catch(e){await db.prepare("UPDATE quotes SET status='approved' WHERE id=? AND status='creating'").bind(q.id).run();fail('決済画面を準備できませんでした。金額・商品設定を担当者にご確認ください。',502);}
  }
  fail('見つかりません。',404);
 }catch(e){if(e instanceof ApiError)return json({error:e.message},e.status);console.error('API failure',path,e.name);return json({error:'処理を完了できませんでした。時間をおいて再度お試しください。'},500);}
}
async function webhook(req,env){
 if(!env.SHOPIFY_WEBHOOK_SECRET)fail('Webhookの設定が必要です。',503);
 const raw=await req.text();if(encoder.encode(raw).length>256000)fail('Payload too large',413);
 if(!equal(req.headers.get('x-shopify-hmac-sha256'),base64(await hmac(env.SHOPIFY_WEBHOOK_SECRET,raw))))fail('Invalid signature',401);
 if(req.headers.get('x-shopify-shop-domain')!==env.SHOPIFY_STORE_DOMAIN)fail('Invalid shop',401);
 const topic=req.headers.get('x-shopify-topic')||'',eventId=req.headers.get('x-shopify-webhook-id');if(!eventId||eventId.length>128)fail('Invalid event');
 const db=env.DB;if(await db.prepare('SELECT id FROM events WHERE id=?').bind(eventId).first())return json({ok:true,duplicate:true});
 let order;try{order=JSON.parse(raw);}catch{fail('Invalid payload');}
 if(topic!=='orders/paid')return json({ok:true,ignored:true});
 const quoteId=order.note_attributes?.find(a=>a.name==='crew_quote_id')?.value;
 const q=quoteId?await db.prepare('SELECT * FROM quotes WHERE id=?').bind(quoteId).first():null;
 if(!q){await db.prepare('INSERT INTO events (id,topic,received_at,status) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(eventId,topic,now(),'unmatched').run();return json({ok:true,unmatched:true});}
 const variant=env['SHOPIFY_VARIANT_'+q.plan.toUpperCase()+'_'+q.stage.toUpperCase()]?.split('/').pop();
 const valid=order.financial_status==='paid'&&order.currency==='JPY'&&Number(order.total_price)===q.amount&&order.line_items?.length===1&&String(order.line_items[0].variant_id)===variant&&order.line_items[0].quantity===1&&(!order.test||env.SHOPIFY_ALLOW_TEST==='true')&&q.accepted_at!==null&&['pending','paid'].includes(q.status)&&(!q.order_id||q.order_id===String(order.id));
 await db.batch([
  db.prepare('INSERT INTO events (id,topic,received_at,quote_id,status) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(eventId,topic,now(),q.id,valid?'verified':'review'),
  valid?db.prepare("UPDATE quotes SET status='paid',order_id=?,paid_at=? WHERE id=? AND (order_id IS NULL OR order_id=?)").bind(String(order.id),now(),q.id,String(order.id)):db.prepare("UPDATE quotes SET status='review' WHERE id=?").bind(q.id)
 ]);
 return json({ok:true,verified:valid});
}
