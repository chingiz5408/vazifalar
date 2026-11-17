

const sidebarToggle=document.getElementById('sidebar-toggle');
const setSidebarExpanded=expanded=>{
  document.body.classList.toggle('sidebar-collapsed',!expanded);
  sidebarToggle.setAttribute('aria-expanded',String(expanded));
  sidebarToggle.setAttribute('aria-label',expanded?'Yon menyuni yopish':'Yon menyuni ochish');
};

sidebarToggle.addEventListener('click',()=>{
  setSidebarExpanded(sidebarToggle.getAttribute('aria-expanded')!=='true');
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&sidebarToggle.getAttribute('aria-expanded')==='true'){
    setSidebarExpanded(false);
    sidebarToggle.focus();
  }
});

const searchInput=document.getElementById('dashboard-search');
const taskModulesRoot=document.getElementById('modules');
if(searchInput&&taskModulesRoot){
  const noResults=document.createElement('p');
  noResults.className='search-empty';
  noResults.setAttribute('aria-live','polite');
  noResults.textContent='Bu qidiruv bo‘yicha topshiriq topilmadi.';
  noResults.hidden=true;
  taskModulesRoot.appendChild(noResults);

  searchInput.addEventListener('input',()=>{
    const query=searchInput.value.trim().toLocaleLowerCase('uz');
    let visibleCount=0;
    taskModulesRoot.querySelectorAll('.module').forEach(module=>{
      const matches=module.textContent.toLocaleLowerCase('uz').includes(query);
      module.hidden=!matches;
      if(matches)visibleCount++;
    });
    noResults.hidden=!query||visibleCount>0;
  });
}

document.querySelectorAll('.sidebar-nav .nav-link').forEach(link=>{
  link.addEventListener('click',()=>{
    document.querySelector('.sidebar-nav .nav-link.is-active')?.classList.remove('is-active');
    document.querySelector('.sidebar-nav .nav-link[aria-current="page"]')?.removeAttribute('aria-current');
    link.classList.add('is-active');
    link.setAttribute('aria-current','page');
  });
});