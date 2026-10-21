const studentEmail=sessionStorage.getItem('studentEmail');

if(!studentEmail){
  window.location.replace('Login.html');
}else{
  const storageKey=`studentProfile:${studentEmail.toLocaleLowerCase('uz')}`;
  const defaultName=studentEmail.split('@')[0].replace(/[._-]+/g,' ').trim().replace(/\b\p{L}/gu,letter=>letter.toLocaleUpperCase('uz'))||'O‘quvchi';
  let savedProfile={};

  try{
    const storedProfile=JSON.parse(localStorage.getItem(storageKey)||'{}');
    if(storedProfile&&typeof storedProfile==='object'&&!Array.isArray(storedProfile))savedProfile=storedProfile;
  }catch(error){
    console.error('Profil sozlamalarini o‘qib bo‘lmadi.',error);
  }

  const nameInput=document.getElementById('display-name');
  const emailInput=document.getElementById('email');
  const displayName=document.getElementById('profile-display-name');
  const summaryEmail=document.getElementById('profile-summary-email');
  const avatar=document.getElementById('profile-avatar');
  const profileStatus=document.getElementById('profile-status');
  const reminders=document.getElementById('task-reminders');
  const courseUpdates=document.getElementById('course-updates');
  const notificationStatus=document.getElementById('notification-status');

  const updateIdentity=name=>{
    const normalizedName=name.trim()||defaultName;
    displayName.textContent=normalizedName;
    avatar.textContent=normalizedName.split(/\s+/).map(part=>part[0]).slice(0,2).join('').toLocaleUpperCase('uz');
  };

  nameInput.value=typeof savedProfile.name==='string'&&savedProfile.name.trim()?savedProfile.name:defaultName;
  emailInput.value=studentEmail;
  summaryEmail.textContent=studentEmail;
  updateIdentity(nameInput.value);
  reminders.checked=savedProfile.taskReminders!==false;
  courseUpdates.checked=savedProfile.courseUpdates!==false;

  document.getElementById('profile-form').addEventListener('submit',event=>{
    event.preventDefault();
    const name=nameInput.value.trim();
    if(!name){
      profileStatus.textContent='Ism maydonini to‘ldiring.';
      nameInput.focus();
      return;
    }
    const profile={...savedProfile,name};
    try{
      localStorage.setItem(storageKey,JSON.stringify(profile));
      savedProfile=profile;
      updateIdentity(profile.name);
      profileStatus.textContent='Profil ma’lumotlari saqlandi.';
    }catch(error){
      console.error('Profil ma’lumotlarini saqlab bo‘lmadi.',error);
      profileStatus.textContent='Saqlash amalga oshmadi. Brauzer xotirasini tekshiring.';
    }
  });

  const saveNotificationSettings=()=>{
    const profile={...savedProfile,taskReminders:reminders.checked,courseUpdates:courseUpdates.checked};
    try{
      localStorage.setItem(storageKey,JSON.stringify(profile));
      savedProfile=profile;
      notificationStatus.textContent='Bildirishnoma sozlamalari saqlandi.';
    }catch(error){
      console.error('Bildirishnoma sozlamalarini saqlab bo‘lmadi.',error);
      notificationStatus.textContent='Sozlamalarni saqlash amalga oshmadi.';
    }
  };

  reminders.addEventListener('change',saveNotificationSettings);
  courseUpdates.addEventListener('change',saveNotificationSettings);

  document.getElementById('logout').addEventListener('click',()=>sessionStorage.removeItem('studentEmail'));
  document.getElementById('logout-action').addEventListener('click',()=>sessionStorage.removeItem('studentEmail'));

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
}
