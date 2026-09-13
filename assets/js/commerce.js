(() => {
 'use strict';
 const $=s=>document.querySelector(s);
 const uid=()=>crypto.randomUUID();
 const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const status=(target,message,error=false)=>{const e=$(target);if(e){e.textContent=message;e.classList.toggle('is-error',error);}};
 async function api(path,data){const r=await fetch('/api/'+path,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});let j;try{j=await r.json();}catch{throw new Error('サーバーに接続できませんでした。しばらくしてから再度お試しください。');}if(!r.ok)throw Object.assign(new Error(j.error||'処理を完了できませんでした。'),{status:r.status});return j;}
 const jstDate=d=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
 const dateTime=s=>new Date(s*1000).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'long',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false});
 const time=s=>new Date(s*1000).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false});
 const mailNote=enabled=>enabled?'確認メールを順次送信します。届かない場合は受付番号を控え、運営者へお問い合わせください。':'メール通知は未接続です。この画面の受付番号と内容を保存してください。';
 const configPromise=api('config').then(c=>{document.querySelectorAll('[data-preview-note]').forEach(e=>{if(c.mode!=='live'){e.hidden=false;e.textContent='確認用サイトです。入力内容は保存されます。動作確認にはテスト用の情報をご使用ください。';}});return c;}).catch(()=>null);
 const labels={name:'お名前',email:'メールアドレス',business:'事業名・屋号',customerType:'ご利用の目的',industry:'業種',description:'事業内容',currentUrl:'現在のサイト・SNS',goals:'相談したいこと',plan:'気になるプラン',timing:'希望時期',materials:'素材の準備状況',notes:'参考・必要な機能',diagnosis:'Web診断36の結果',communication:'希望する相談方法'};
 const names={first:'はじめて',simple:'シンプル',standard:'標準',omakase:'おまかせ',undecided:'まだ決めていない',business:'法人・個人事業主（事業目的）',consumer:'一般消費者（事業目的以外）',email:'メールで相談',online:'オンラインで相談'};
 const hearing=$('#hearing-form');
 if(hearing){
  hearing.addEventListener('invalid',e=>{const section=e.target.closest('details');if(section)section.open=true;},true);
  let payload=null,requestId=uid(),sending=false;
  const params=new URLSearchParams(location.search);const plan=params.get('plan');if(['first','simple','standard','omakase'].includes(plan))hearing.elements.plan.value=plan;
  const diagnosis=params.get('type')||params.get('diagnosis');if(diagnosis&&diagnosis.length<=120)hearing.elements.diagnosis.value=diagnosis;
  if((plan&&plan!=='undecided')||diagnosis){const detail=hearing.querySelector('.studio-optional');if(detail)detail.open=true;}
  hearing.addEventListener('submit',e=>{
   e.preventDefault();if(!hearing.reportValidity())return;
   payload=Object.fromEntries(new FormData(hearing));payload.consent=hearing.elements.consent.checked;payload.requestKey=requestId;
   $('#hearing-summary').replaceChildren();
   for(const [k,label]of Object.entries(labels)){if(!payload[k]?.trim())continue;const row=el('div');row.append(el('dt',label),el('dd',names[payload[k]]||payload[k]));$('#hearing-summary').append(row);}
   $('#hearing-fields').hidden=true;const review=$('#hearing-review');review.hidden=false;review.focus({preventScroll:true});review.scrollIntoView({block:'start'});status('#hearing-status','');
  });
  $('#hearing-back').addEventListener('click',()=>{if(sending)return;$('#hearing-review').hidden=true;$('#hearing-fields').hidden=false;hearing.elements.name.focus();});
  $('#hearing-send').addEventListener('click',async()=>{if(sending||!payload)return;sending=true;$('#hearing-send').disabled=true;$('#hearing-back').disabled=true;status('#hearing-status','送信しています…');try{const r=await api('inquiries',payload);hearing.hidden=true;$('#hearing-reference').textContent=r.reference;$('#hearing-mail-note').textContent=mailNote(r.mailEnabled);$('#hearing-success').hidden=false;$('#hearing-success').focus();}catch(err){status('#hearing-status',err.message,true);}finally{sending=false;$('#hearing-send').disabled=false;$('#hearing-back').disabled=false;}});
 }
 if($('#calendar-days')){
  const today=jstDate(new Date());let month=today.slice(0,7),slots=[],selected=null,day=null,loading=false,loadVersion=0;
  let bookingKey=uid(),cancelToken=secret(),bookingResult=null;
  const empty=$('#calendar-days');
  function render(){const [y,m]=month.split('-').map(Number),first=new Date(Date.UTC(y,m-1,1)).getUTCDay(),count=new Date(Date.UTC(y,m,0)).getUTCDate();$('#calendar-title').textContent=y+'年 '+m+'月';empty.replaceChildren();for(let i=0;i<first;i++)empty.append(el('span'));
    for(let d=1;d<=count;d++){const key=month+'-'+String(d).padStart(2,'0'),available=slots.some(s=>jstDate(new Date(s.starts_at*1000))===key);const b=el('button',String(d),'ca-calendar-day'+(available?' available':'')+(key===day?' selected':'')+(key===today?' today':''));b.type='button';b.disabled=!available;b.setAttribute('aria-label',`${m}月${d}日${available?'、予約可能':'、空き枠なし'}`);b.setAttribute('aria-pressed',String(key===day));if(key===today)b.setAttribute('aria-current','date');b.addEventListener('click',()=>{day=key;selected=null;$('#booking-details').hidden=true;render();showSlots();});empty.append(b);}
    $('#month-prev').disabled=month<=today.slice(0,7);const max=new Date();max.setUTCFullYear(max.getUTCFullYear()+1);$('#month-next').disabled=month>=jstDate(max).slice(0,7);
  }
  function showSlots(){const choices=slots.filter(s=>jstDate(new Date(s.starts_at*1000))===day);$('#slot-buttons').replaceChildren();$('#slot-heading').textContent=day?`${Number(day.slice(5,7))}月${Number(day.slice(8))}日の空き時間`:'日付を選ぶと、空いている時間が表示されます。';for(const s of choices){const b=el('button',`${time(s.starts_at)}–${time(s.ends_at)}`);b.type='button';b.setAttribute('aria-pressed',String(selected?.id===s.id));b.addEventListener('click',()=>{selected=s;bookingKey=uid();cancelToken=secret();showSlots();$('#selected-slot-label').textContent=dateTime(s.starts_at)+'〜'+time(s.ends_at)+'（日本時間）';$('#booking-details').hidden=false;$('#booking-details').focus();status('#booking-status','');});$('#slot-buttons').append(b);}}
  async function load(){const v=++loadVersion;loading=true;$('#calendar-retry').hidden=true;status('#calendar-status','空き状況を確認しています…');try{const r=await api('slots?month='+month);if(v!==loadVersion)return;slots=r.slots;render();showSlots();status('#calendar-status',slots.length?'':'この月の予約枠はまだ公開されていません。別の月をご確認いただくか、ヒアリングシートからご相談ください。');}catch(e){slots=[];render();status('#calendar-status',e.message,true);$('#calendar-retry').hidden=false;}finally{loading=false;}}
  function move(n){if(loading)return;const [y,m]=month.split('-').map(Number),dt=new Date(Date.UTC(y,m-1+n,1));month=dt.toISOString().slice(0,7);day=null;selected=null;$('#booking-details').hidden=true;load();}
  $('#month-prev').addEventListener('click',()=>move(-1));$('#month-next').addEventListener('click',()=>move(1));$('#calendar-retry').addEventListener('click',load);load();
  $('#booking-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;if(!f.reportValidity()||!selected)return;const button=f.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;status('#booking-status','空き状況を再確認し、予約しています…');try{const p=Object.fromEntries(new FormData(f));const r=await api('bookings',{...p,consent:f.elements.consent.checked,slotId:selected.id,requestKey:bookingKey,cancelToken});bookingResult=r;$('#booking-details').hidden=true;$('.ca-book-layout').hidden=true;$('#booking-confirmed-date').textContent=dateTime(r.startsAt)+'〜'+time(r.endsAt)+'（日本時間）';$('#booking-reference').textContent='受付番号：'+r.reference;$('#booking-mail-note').textContent=mailNote(r.mailEnabled);$('#booking-cancel-link').href='booking-cancel.html#token='+r.token;$('#booking-success').hidden=false;$('#booking-success').focus();}catch(err){status('#booking-status',err.message,true);if(err.status===409){selected=null;await load();}}finally{button.disabled=false;}});
  $('#download-ics').addEventListener('click',()=>{if(!bookingResult)return;const r=bookingResult;const stamp=s=>new Date(s*1000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CREW ASCENT//Hearing//JA','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+r.reference+'@crew-ascent','DTSTAMP:'+stamp(Date.now()/1000),'DTSTART:'+stamp(r.startsAt),'DTEND:'+stamp(r.endsAt),'SUMMARY:クルーアセント 無料ヒアリング','DESCRIPTION:60分のオンライン相談。参加方法は担当者から別途ご案内します。','END:VEVENT','END:VCALENDAR',''].join('\r\n');const u=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'}));const a=el('a');a.href=u;a.download='crew-ascent-hearing.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);});
 }
 if($('#cancel-panel')){
  const token=new URLSearchParams(location.hash.slice(1)).get('token');
  api('booking/detail',{token}).then(r=>{$('#cancel-detail').textContent=dateTime(r.startsAt)+'〜'+time(r.endsAt)+'（日本時間）／'+r.reference;if(r.status==='cancelled'){status('#cancel-status','この予約は取り消し済みです。');}else{$('#cancel-consent').hidden=false;$('#cancel-booking').hidden=false;}}).catch(e=>status('#cancel-status',e.message,true));
  $('#cancel-booking').addEventListener('click',async()=>{if(!$('#cancel-confirm').checked){status('#cancel-status','取り消しの確認にチェックを入れてください。',true);return;}$('#cancel-booking').disabled=true;try{await api('booking/cancel',{token,confirm:true});status('#cancel-status','予約を取り消しました。');$('#cancel-booking').hidden=true;$('#cancel-consent').hidden=true;}catch(e){status('#cancel-status',e.message,true);$('#cancel-booking').disabled=false;}});
 }
 const checkout=$('[data-checkout-plan]');
 if(checkout){
  const plan=checkout.dataset.checkoutPlan,raw=new URLSearchParams(location.hash.slice(1)).get('quote');let quote=null,ready=false;
  const customer=$('#checkout-customer-type');function contract(){$('#checkout-contract').href=`contracts/${plan}-${customer.value}.html`;$('#checkout-agree').checked=false;enable();}
  function enable(){$('#checkout-pay').disabled=!(ready&&quote?.plan===plan&&quote.status==='approved'||ready&&quote?.plan===plan&&quote.status==='pending')||!$('#checkout-agree').checked||!$('#checkout-scope').checked;}
  customer.addEventListener('change',contract);$('#checkout-agree').addEventListener('change',enable);$('#checkout-scope').addEventListener('change',enable);
  if(raw)api('quote/detail',{token:raw}).then(r=>{if(r.plan!==plan)throw new Error('この見積もりのプランと画面が一致しません。正しいリンクからお進みください。');quote=r;ready=r.commerceReady;customer.value=r.customerType;customer.disabled=true;contract();$('#checkout-stage-label').textContent='今回のお支払い（'+(r.stage==='deposit'?'着手金':'残金')+'）';$('#checkout-amount').textContent=r.amount.toLocaleString('ja-JP')+'円';const list=el('dl',undefined,'ca-review-list');for(const [label,value]of [['合意した制作範囲',r.scope],['提供時期',r.delivery],['リンクの有効期限',dateTime(r.expires)]]){const row=el('div');row.append(el('dt',label),el('dd',value));list.append(row);}$('#quote-details').append(list);$('#checkout-availability').textContent=r.status==='paid'?'このお支払いは確認済みです。':ready?'合意内容をご確認のうえ、Shopifyのお支払い画面へお進みください。':'専用リンクを確認しました。決済はまだ準備中です。';enable();}).catch(e=>status('#checkout-status',e.message,true));
  $('#checkout-pay').addEventListener('click',async()=>{$('#checkout-pay').disabled=true;status('#checkout-status','Shopifyの決済画面を準備しています…');try{const r=await api('checkout',{token:raw,agreed:$('#checkout-agree').checked,scopeAgreed:$('#checkout-scope').checked,contractVersion:quote.contractVersion});const u=new URL(r.checkoutUrl);if(u.protocol!=='https:')throw new Error('決済URLを確認できませんでした。');location.assign(u.href);}catch(e){status('#checkout-status',e.message,true);enable();}});
 }
})();
