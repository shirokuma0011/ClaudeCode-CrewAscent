(() => {
  const normalize = path => path.replace(/\/$/,'').split('/').pop().replace(/\.html$/,'') || 'index';
  const current = normalize(location.pathname);
  document.querySelectorAll('.ca-nav a,.ca-menu a').forEach(a => { if (normalize(new URL(a.href).pathname) === current) a.setAttribute('aria-current', 'page'); });
  document.querySelectorAll('[data-native-form-link]').forEach(a => { a.href='contact.html'; a.removeAttribute('aria-disabled'); a.removeAttribute('target'); });
  document.querySelectorAll('[data-year]').forEach(e => e.textContent=new Date().getFullYear());
  const menu=document.querySelector('.ca-menu');
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && menu?.open){menu.open=false;menu.querySelector('summary').focus();}});
  document.addEventListener('click',e=>{if(menu?.open&&!menu.contains(e.target))menu.open=false;});
  const typeControls=document.querySelector('.studio-type-controls');
  if(typeControls){
    const search=document.getElementById('type-search'),area=document.getElementById('type-area'),count=document.getElementById('type-count'),reset=document.getElementById('type-reset');
    const groups=[...document.querySelectorAll('.tp-list')];
    const fold=s=>s.normalize('NFKC').toLocaleLowerCase();
    function filter(){
      const query=fold(search.value.trim());let total=0;
      groups.forEach((group,index)=>{let visible=0;for(const li of group.children){li.hidden=!(area.value==='all'||area.value===String(index))||!fold(li.textContent).includes(query);if(!li.hidden)visible++;}group.closest('section').hidden=visible===0;total+=visible;});
      count.textContent=total?`${total} / 36 タイプを表示`:'該当するタイプがありません。別の言葉で探すか、絞り込みを解除してください。';
      reset.hidden=!query&&area.value==='all';
    }
    search.addEventListener('input',filter);area.addEventListener('change',filter);reset.addEventListener('click',()=>{search.value='';area.value='all';filter();search.focus();});typeControls.hidden=false;filter();
  }
})();
