(()=>{
  const demoNotifications=[
    {
      id:'task-reminder-dom',
      type:'task',
      title:'Topshiriq muddati yaqinlashmoqda',
      message:'“DOM bilan ishlash va hodisalar” topshirig‘ini bugun yakunlang.',
      createdAt:new Date(Date.now()-18*60*60*1000).toISOString(),
      href:'Mustaqil.html'
    },
    {
      id:'course-update-arrays',
      type:'course',
      title:'Yangi mavzu tayyor',
      message:'JavaScript massivlari bo‘yicha yangi mashqlar o‘quv rejangizga qo‘shildi.',
      createdAt:new Date(Date.now()-31*60*60*1000).toISOString(),
      href:'Topshiriqlar.html'
    },
    {
      id:'task-completed',
      type:'success',
      title:'Natijangiz saqlandi',
      message:'Oxirgi topshiriq bo‘yicha natijangiz muvaffaqiyatli qayd etildi.',
      createdAt:new Date(Date.now()-52*60*60*1000).toISOString(),
      href:'Oquvchi.html#activity'
    }
  ];

  const getStorageKey=()=>{
    const email=sessionStorage.getItem('studentEmail');
    if(!email)throw new Error('Bildirishnomalarni ko‘rish uchun tizimga kiring.');
    return `bilimlabNotifications:${email.toLocaleLowerCase('uz')}`;
  };

  const readNotifications=()=>{
    const stored=localStorage.getItem(getStorageKey());
    if(!stored)return demoNotifications.map(notification=>({...notification,read:false}));
    const notifications=JSON.parse(stored);
    if(!Array.isArray(notifications)||notifications.some(notification=>!notification||typeof notification.id!=='string'||typeof notification.title!=='string'||typeof notification.message!=='string'||typeof notification.createdAt!=='string'||typeof notification.read!=='boolean')){
      throw new Error('Bildirishnomalar ma’lumotlari noto‘g‘ri formatda.');
    }
    return notifications;
  };

  const saveNotifications=notifications=>{
    localStorage.setItem(getStorageKey(),JSON.stringify(notifications));
  };

  const refreshBadges=async()=>{
    try{
      const unreadCount=await window.BilimLabNotifications.getUnreadCount();
      document.querySelectorAll('.notification-count').forEach(badge=>{
        badge.textContent=String(unreadCount);
        badge.hidden=unreadCount===0;
      });
      document.querySelectorAll('.notification-button').forEach(button=>{
        button.setAttribute('aria-label',unreadCount?`${unreadCount} ta o‘qilmagan bildirishnoma`:'Bildirishnomalar');
      });
    }catch(error){
      console.error('Bildirishnomalar sonini ko‘rsatib bo‘lmadi.',error);
    }
  };

  window.BilimLabNotifications={
    getAll:async()=>readNotifications(),
    markRead:async id=>{
      const notifications=readNotifications();
      const notification=notifications.find(item=>item.id===id);
      if(!notification)throw new Error('Bildirishnoma topilmadi.');
      notification.read=true;
      saveNotifications(notifications);
      await refreshBadges();
      return notification;
    },
    markAllRead:async()=>{
      const notifications=readNotifications().map(notification=>({...notification,read:true}));
      saveNotifications(notifications);
      await refreshBadges();
      return notifications;
    },
    getUnreadCount:async()=>{
      const notifications=readNotifications();
      return notifications.filter(notification=>!notification.read).length;
    }
  };

  window.addEventListener('storage',event=>{
    if(sessionStorage.getItem('studentEmail')&&event.key===getStorageKey())refreshBadges();
  });
  if(sessionStorage.getItem('studentEmail'))refreshBadges();
})();
