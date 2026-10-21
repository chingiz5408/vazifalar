const independentStudentEmail=sessionStorage.getItem('studentEmail');

if(!independentStudentEmail){
  window.location.replace('Login.html');
}else{
  const savedName=()=>{
    try{
      const profile=JSON.parse(localStorage.getItem(`studentProfile:${independentStudentEmail.toLocaleLowerCase('uz')}`)||'{}');
      return typeof profile.name==='string'&&profile.name.trim()?profile.name.trim():independentStudentEmail.split('@')[0];
    }catch(error){
      console.error('Profil nomini o‘qib bo‘lmadi.',error);
      return independentStudentEmail.split('@')[0];
    }
  };
  const profileName=savedName();
  document.getElementById('profile-name').textContent=profileName;
  document.getElementById('profile-avatar').textContent=profileName.split(/\s+/).map(part=>part[0]).slice(0,2).join('').toLocaleUpperCase('uz');

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
  document.getElementById('logout').addEventListener('click',()=>sessionStorage.removeItem('studentEmail'));

  const assignments=[
    {
      id:'responsive-profile-card',
      title:'Moslashuvchan profil kartasi',
      module:'Frontend dasturlash',
      lesson:'HTML va CSS',
      subject:'HTML va CSS',
      level:'Boshlang‘ich',
      dueAt:'2026-10-22T23:59:00+05:00',
      description:'O‘zingiz haqingizda ma’lumot beruvchi profil kartasini yarating. Rasm, ism, qisqa bio va aloqa havolalarini joylashtiring; telefon ekranida ham tartibli ko‘rinishini tekshiring.',
      checklist:['Semantik HTML teglaridan foydalaning','CSS Flexbox yoki Grid bilan joylashtiring','Mobil ekran uchun media query qo‘shing']
    },
    {
      id:'form-validation',
      title:'Interaktiv forma validatsiyasi',
      module:'Frontend dasturlash',
      lesson:'JavaScript asoslari',
      subject:'JavaScript',
      level:'O‘rta',
      dueAt:'2026-10-23T23:59:00+05:00',
      description:'Ro‘yxatdan o‘tish formasini tayyorlang. Ism, elektron pochta va parol maydonlarini tekshirib, xatolarni foydalanuvchiga tushunarli ko‘rsating.',
      checklist:['Bo‘sh maydonlarni tekshiring','Elektron pochta formatini tekshiring','Xato va muvaffaqiyat holatlarini ko‘rsating']
    },
    {
      id:'personal-todo',
      title:'Shaxsiy To-Do ro‘yxati',
      module:'Frontend dasturlash',
      lesson:'JavaScript asoslari',
      subject:'JavaScript va DOM',
      level:'O‘rta',
      dueAt:'2026-10-25T23:59:00+05:00',
      description:'Vazifa qo‘shish, bajarildi deb belgilash va ro‘yxatdan o‘chirish imkoniyatlari bor kichik To-Do ilovasini tuzing.',
      checklist:['Yangi vazifa qo‘shish imkonini yarating','Vazifani bajarildi deb belgilashni qo‘shing','Ro‘yxat bo‘sh holatini ham ko‘rsating']
    },
    {
      id:'semantic-portfolio',
      title:'Portfolio sahifasi uchun semantik tuzilma',
      module:'Frontend dasturlash',
      lesson:'HTML va CSS',
      subject:'HTML5',
      level:'Boshlang‘ich',
      dueAt:'2026-10-27T23:59:00+05:00',
      description:'Kelajakdagi portfolio saytingiz uchun sahifa tuzilmasini yarating: navigatsiya, tanishtiruv, loyihalar va aloqa bo‘limlarini mantiqan ajrating.',
      checklist:['header, nav, main va footer teglaridan foydalaning','Kamida ikkita loyiha bo‘limini qo‘shing','Sarlavhalar ketma-ketligini to‘g‘ri tashkil qiling']
    }
  ];
  const storageKey=`studentIndependentAssignments:${independentStudentEmail.toLocaleLowerCase('uz')}`;
  const list=document.getElementById('independent-list');
  const emptyMessage=document.getElementById('independent-empty');
  const statusMessage=document.getElementById('independent-status');
  const searchInput=document.getElementById('independent-search');
  const filterButtons=[...document.querySelectorAll('.independent-filter')];
  let completedIds=[];
  let activeFilter='all';
  const expandedModules=new Set();
  const expandedLessons=new Set();

  const formatDueDate=value=>{
    const date=new Date(value);
    const months=['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
    return `${date.getDate()}-${months[date.getMonth()]}, 23:59`;
  };

  const loadProgress=()=>{
    const stored=localStorage.getItem(storageKey);
    if(stored===null)return;
    const parsed=JSON.parse(stored);
    if(!Array.isArray(parsed)||parsed.some(id=>typeof id!=='string'||!assignments.some(assignment=>assignment.id===id))){
      throw new Error('Mustaqil vazifalar holati noto‘g‘ri formatda.');
    }
    completedIds=parsed;
  };

  const render=()=>{
    const query=searchInput.value.trim().toLocaleLowerCase('uz');
    const pendingCount=assignments.length-completedIds.length;
    document.getElementById('pending-count').textContent=`${pendingCount} ta`;
    document.getElementById('total-count').textContent=`Jami ${assignments.length} ta mustaqil vazifa`;
    document.getElementById('filter-all-count').textContent=String(assignments.length);
    document.getElementById('filter-pending-count').textContent=String(pendingCount);
    document.getElementById('filter-completed-count').textContent=String(completedIds.length);
    const visibleAssignments=assignments.filter(assignment=>{
      const isCompleted=completedIds.includes(assignment.id);
      const matchesFilter=activeFilter==='all'||(activeFilter==='completed'?isCompleted:!isCompleted);
      const matchesSearch=`${assignment.module} ${assignment.lesson} ${assignment.title} ${assignment.subject} ${assignment.description}`.toLocaleLowerCase('uz').includes(query);
      return matchesFilter&&matchesSearch;
    });
    document.getElementById('independent-summary').textContent=`${visibleAssignments.length} ta vazifa ko‘rsatilmoqda`;
    list.replaceChildren();
    emptyMessage.hidden=visibleAssignments.length>0;
    const visibleModules=[...new Set(visibleAssignments.map(assignment=>assignment.module))];
    visibleModules.forEach((moduleName,moduleIndex)=>{
      const moduleAssignments=visibleAssignments.filter(assignment=>assignment.module===moduleName);
      const moduleSection=document.createElement('section');
      moduleSection.className='independent-module';
      const moduleButton=document.createElement('button');
      moduleButton.type='button';
      moduleButton.className='independent-module-toggle';
      moduleButton.setAttribute('aria-expanded',String(expandedModules.has(moduleName)));
      const moduleId=`independent-module-${moduleIndex}`;
      moduleButton.setAttribute('aria-controls',moduleId);
      const moduleNumber=document.createElement('span');
      moduleNumber.className='independent-module-number';
      moduleNumber.textContent=String(moduleIndex+1).padStart(2,'0');
      const moduleTitle=document.createElement('span');
      moduleTitle.className='independent-module-title';
      moduleTitle.textContent=moduleName;
      const moduleCount=document.createElement('span');
      moduleCount.className='independent-group-count';
      moduleCount.textContent=`${moduleAssignments.length} ta masala`;
      const moduleChevron=document.createElement('span');
      moduleChevron.className='independent-group-chevron';
      moduleChevron.setAttribute('aria-hidden','true');
      moduleChevron.textContent='⌄';
      moduleButton.append(moduleNumber,moduleTitle,moduleCount,moduleChevron);

      const lessonsRoot=document.createElement('div');
      lessonsRoot.className='independent-lessons';
      lessonsRoot.id=moduleId;
      lessonsRoot.hidden=!expandedModules.has(moduleName);
      const lessonNames=[...new Set(moduleAssignments.map(assignment=>assignment.lesson))];
      lessonNames.forEach((lessonName,lessonIndex)=>{
        const lessonAssignments=moduleAssignments.filter(assignment=>assignment.lesson===lessonName);
        const lessonSection=document.createElement('section');
        lessonSection.className='independent-lesson';
        const lessonButton=document.createElement('button');
        lessonButton.type='button';
        lessonButton.className='independent-lesson-toggle';
        const lessonKey=`${moduleName}:${lessonName}`;
        lessonButton.setAttribute('aria-expanded',String(expandedLessons.has(lessonKey)));
        const lessonId=`independent-lesson-${moduleIndex}-${lessonIndex}`;
        lessonButton.setAttribute('aria-controls',lessonId);
        const lessonTitle=document.createElement('span');
        lessonTitle.className='independent-lesson-title';
        lessonTitle.textContent=lessonName;
        const lessonCount=document.createElement('span');
        lessonCount.className='independent-group-count';
        lessonCount.textContent=`${lessonAssignments.length} ta masala`;
        const lessonChevron=document.createElement('span');
        lessonChevron.className='independent-group-chevron';
        lessonChevron.setAttribute('aria-hidden','true');
        lessonChevron.textContent='⌄';
        lessonButton.append(lessonTitle,lessonCount,lessonChevron);

        const problemsRoot=document.createElement('div');
        problemsRoot.className='independent-problems';
        problemsRoot.id=lessonId;
        problemsRoot.hidden=!expandedLessons.has(lessonKey);
        lessonAssignments.forEach(assignment=>{
          const isCompleted=completedIds.includes(assignment.id);
          const card=document.createElement('article');
          card.className=`independent-card${isCompleted?' is-completed':''}`;
          const cardHeader=document.createElement('div');
          cardHeader.className='independent-card-header';
          const icon=document.createElement('span');
          icon.className='independent-card-icon';
          icon.setAttribute('aria-hidden','true');
          icon.textContent=assignment.subject==='HTML5'||assignment.subject==='HTML va CSS'?'▤':'⌘';
          const identity=document.createElement('div');
          identity.className='independent-card-identity';
          const subject=document.createElement('span');
          subject.className='independent-subject';
          subject.textContent=assignment.subject;
          const level=document.createElement('span');
          level.className='independent-level';
          level.textContent=assignment.level;
          identity.append(subject,level);
          const badge=document.createElement('span');
          badge.className=`independent-state${isCompleted?' completed':''}`;
          badge.textContent=isCompleted?'Bajarildi':'Bajarilmagan';
          cardHeader.append(icon,identity,badge);

          const title=document.createElement('h3');
          title.textContent=assignment.title;
          const description=document.createElement('p');
          description.className='independent-description';
          description.textContent=assignment.description;
          const footer=document.createElement('div');
          footer.className='independent-card-footer';
          const due=document.createElement('span');
          due.className='independent-due';
          due.textContent=`◷ Muddati: ${formatDueDate(assignment.dueAt)}`;
          const completionButton=document.createElement('button');
          completionButton.className=`independent-completion-button${isCompleted?' undo':''}`;
          completionButton.type='button';
          completionButton.textContent=isCompleted?'Qayta ochish':'Bajarildi deb belgilash';
          completionButton.addEventListener('click',()=>toggleCompletion(assignment.id));
          footer.append(due,completionButton);
          card.append(cardHeader,title,description,footer);
          problemsRoot.append(card);
        });
        lessonButton.addEventListener('click',()=>{
          if(expandedLessons.has(lessonKey))expandedLessons.delete(lessonKey);
          else expandedLessons.add(lessonKey);
          render();
        });
        lessonSection.append(lessonButton,problemsRoot);
        lessonsRoot.append(lessonSection);
      });
      moduleButton.addEventListener('click',()=>{
        if(expandedModules.has(moduleName))expandedModules.delete(moduleName);
        else expandedModules.add(moduleName);
        render();
      });
      moduleSection.append(moduleButton,lessonsRoot);
      list.append(moduleSection);
    });
  };

  const toggleCompletion=id=>{
    const updated=completedIds.includes(id)?completedIds.filter(completedId=>completedId!==id):[...completedIds,id];
    try{
      localStorage.setItem(storageKey,JSON.stringify(updated));
      completedIds=updated;
      statusMessage.textContent='Holat ushbu brauzerda saqlandi. Vazifa ustozga yuborilmadi.';
      render();
    }catch(error){
      console.error('Mustaqil vazifa holatini saqlab bo‘lmadi.',error);
      statusMessage.textContent='Holat saqlanmadi. Brauzer xotirasi sozlamalarini tekshiring.';
    }
  };

  try{
    loadProgress();
    render();
  }catch(error){
    console.error('Mustaqil vazifalar holatini yuklab bo‘lmadi.',error);
    statusMessage.textContent='Vazifalar holatini o‘qib bo‘lmadi. Mahalliy brauzer ma’lumotlarini tekshiring.';
  }

  searchInput.addEventListener('input',render);
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
}
