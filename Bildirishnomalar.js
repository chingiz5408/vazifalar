const studentEmail=sessionStorage.getItem('studentEmail');

if(!studentEmail){
  window.location.replace('Login.html');
}else{
  const notificationList=document.getElementById('notification-list');
  const emptyState=document.getElementById('notification-empty');
  const emptyTitle=document.getElementById('notification-empty-title');
  const emptyCopy=document.getElementById('notification-empty-copy');
  const summary=document.getElementById('notification-summary');
  const allCount=document.getElementById('all-count');
  const unreadCount=document.getElementById('unread-count');
  const markAllButton=document.getElementById('mark-all-read');
  const filterButtons=[...document.querySelectorAll('.notification-filter')];
  let notifications=[];
  let activeFilter='all';

  const formatDate=value=>{
    const date=new Date(value);
    const months=['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
    const time=new Intl.DateTimeFormat('uz-UZ',{hour:'2-digit',minute:'2-digit'}).format(date);
    return `${date.getDate()}-${months[date.getMonth()]}, ${time}`;
  };
  const getTypeLabel=type=>({
    task:'Topshiriq',
    course:'Kurs yangiligi',
    success:'Natija'
  }[type]||'Bildirishnoma');
  const getTypeIcon=type=>({
    task:'◷',
    course:'▣',
    success:'✓'
  }[type]||'♧');

  const render=()=>{
    const unreadTotal=notifications.filter(notification=>!notification.read).length;
    const visibleNotifications=notifications.filter(notification=>activeFilter==='all'||!notification.read);
    allCount.textContent=String(notifications.length);
    unreadCount.textContent=String(unreadTotal);
    summary.textContent=activeFilter==='unread'?`${unreadTotal} ta o‘qilmagan`: `${notifications.length} ta bildirishnoma`;
    markAllButton.disabled=unreadTotal===0;
    notificationList.replaceChildren();
    emptyState.hidden=visibleNotifications.length!==0;
    if(!visibleNotifications.length){
      const hasNotifications=notifications.length>0;
      emptyTitle.textContent=hasNotifications?'O‘qilmagan bildirishnoma yo‘q':'Hozircha bildirishnoma yo‘q';
      emptyCopy.textContent=hasNotifications?'Barcha bildirishnomalarni o‘qib bo‘ldingiz.':'Yangi yangiliklar shu yerda ko‘rinadi.';
    }

    visibleNotifications.forEach(notification=>{
      const article=document.createElement('article');
      article.className=`notification-item${notification.read?'':' is-unread'}`;
      const icon=document.createElement('span');
      icon.className=`notification-item-icon type-${notification.type}`;
      icon.setAttribute('aria-hidden','true');
      icon.textContent=getTypeIcon(notification.type);

      const body=document.createElement('div');
      body.className='notification-item-body';
      const meta=document.createElement('div');
      meta.className='notification-item-meta';
      const type=document.createElement('span');
      type.className=`notification-type type-${notification.type}`;
      type.textContent=getTypeLabel(notification.type);
      const date=document.createElement('time');
      date.dateTime=notification.createdAt;
      date.textContent=formatDate(notification.createdAt);
      meta.append(type,date);
      const title=document.createElement('h2');
      title.textContent=notification.title;
      const message=document.createElement('p');
      message.textContent=notification.message;
      body.append(meta,title,message);

      const actions=document.createElement('div');
      actions.className='notification-item-actions';
      if(notification.href){
        const link=document.createElement('a');
        link.className='notification-open-link';
        link.href=notification.href;
        link.textContent='Ko‘rish';
        actions.append(link);
      }
      if(!notification.read){
        const readButton=document.createElement('button');
        readButton.className='notification-read-button';
        readButton.type='button';
        readButton.textContent='O‘qildi';
        readButton.setAttribute('aria-label',`“${notification.title}” bildirishnomasini o‘qilgan deb belgilash`);
        readButton.addEventListener('click',()=>markRead(notification.id));
        actions.append(readButton);
      }

      article.append(icon,body,actions);
      notificationList.append(article);
    });

    document.querySelectorAll('.notification-count').forEach(badge=>{
      badge.textContent=String(unreadTotal);
      badge.hidden=unreadTotal===0;
    });
    document.querySelectorAll('.notification-button').forEach(button=>{
      button.setAttribute('aria-label',unreadTotal?`${unreadTotal} ta o‘qilmagan bildirishnoma`:'Bildirishnomalar');
    });
  };

  const showError=error=>{
    console.error('Bildirishnomalarni yuklashda xatolik yuz berdi.',error);
    notificationList.replaceChildren();
    emptyState.hidden=false;
    emptyTitle.textContent='Bildirishnomalarni yuklab bo‘lmadi';
    emptyCopy.textContent='Qayta urinib ko‘ring yoki sahifani yangilang.';
    summary.textContent='Xatolik yuz berdi';
    markAllButton.disabled=true;
  };

  const loadNotifications=async()=>{
    try{
      notifications=await window.BilimLabNotifications.getAll();
      render();
    }catch(error){
      showError(error);
    }
  };

  const markRead=async id=>{
    try{
      await window.BilimLabNotifications.markRead(id);
      notifications=await window.BilimLabNotifications.getAll();
      render();
    }catch(error){
      showError(error);
    }
  };

  markAllButton.addEventListener('click',async()=>{
    try{
      notifications=await window.BilimLabNotifications.markAllRead();
      render();
    }catch(error){
      showError(error);
    }
  });

  filterButtons.forEach(button=>{
    button.addEventListener('click',()=>{
      activeFilter=button.dataset.filter;
      filterButtons.forEach(filter=>{
        const selected=filter===button;
        filter.classList.toggle('is-selected',selected);
        filter.setAttribute('aria-pressed',String(selected));
      });
      render();
    });
  });

  document.getElementById('logout').addEventListener('click',()=>sessionStorage.removeItem('studentEmail'));

  const sidebarToggle=document.getElementById('sidebar-toggle');
  const setSidebarExpanded=expanded=>{
    document.body.classList.toggle('sidebar-collapsed',!expanded);
    sidebarToggle.setAttribute('aria-expanded',String(expanded));
    sidebarToggle.setAttribute('aria-label',expanded?'Yon menyuni yopish':'Yon menyuni ochish');
  };

  sidebarToggle.addEventListener('click',()=>setSidebarExpanded(sidebarToggle.getAttribute('aria-expanded')!=='true'));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&sidebarToggle.getAttribute('aria-expanded')==='true'){
      setSidebarExpanded(false);
      sidebarToggle.focus();
    }
  });

  loadNotifications();
}
