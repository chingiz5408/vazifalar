const taskId=new URLSearchParams(window.location.search).get('task');
const task=window.CodeWritingTasks[taskId];
const languageSelect=document.getElementById('language');
const codeInput=document.getElementById('source-code');
const lineNumbers=document.getElementById('line-numbers');
const highlightedCode=document.getElementById('highlighted-code');
const saveIndicator=document.getElementById('save-indicator');
const status=document.getElementById('submit-status');
const consoleBanner=document.getElementById('console-banner');
const consoleMessage=document.getElementById('console-message');
const codeByLanguage={};
const languages={
  python:{name:'Python',extension:'py'},
  javascript:{name:'JavaScript',extension:'js'},
  cpp:{name:'C++',extension:'cpp'},
  java:{name:'Java',extension:'java'}
};
const storageKey=`bilimlab-code-${taskId||'unknown'}`;
let saveTimer;
let editorFontSize=13;
let elapsedSeconds=0;
let activeFile='solution';

function showStatus(message,isError=false){
  status.textContent=message;
  status.classList.toggle('status-error',isError);
}

function setSavedState(saved,message){
  saveIndicator.classList.toggle('is-unsaved',!saved);
  saveIndicator.querySelector('i').style.background=saved?'':'#df8a00';
  saveIndicator.lastChild.textContent=saved?' Saqlandi':' Saqlanmadi';
  document.getElementById('last-saved').textContent=message;
}

function loadStoredData(){
  try{
    const value=localStorage.getItem(storageKey);
    if(!value)return {};
    const data=JSON.parse(value);
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Saqlangan ma’lumot formati noto‘g‘ri.');
    return data;
  }catch(error){
    setSavedState(false,'Saqlash mavjud emas');
    showStatus(`Saqlangan ma’lumotni o‘qib bo‘lmadi: ${error.message}`,true);
    return {};
  }
}

function storeData(data){
  try{
    data.savedAt=new Date().toISOString();
    localStorage.setItem(storageKey,JSON.stringify(data));
    const now=new Date();
    setSavedState(true,`Hozir saqlandi · ${now.toLocaleTimeString('uz',{hour:'2-digit',minute:'2-digit'})}`);
    return true;
  }catch(error){
    setSavedState(false,'Brauzerda saqlanmadi');
    showStatus(`Brauzer xotirasiga saqlab bo‘lmadi: ${error.message}`,true);
    return false;
  }
}

function currentData(){
  const data=loadStoredData();
  data.codeByLanguage={...data.codeByLanguage,[languageSelect.value]:codeInput.value};
  data.language=languageSelect.value;
  data.notes=document.getElementById('task-notes').value;
  return data;
}

function scheduleSave(){
  setSavedState(false,'Saqlanmoqda…');
  window.clearTimeout(saveTimer);
  saveTimer=window.setTimeout(()=>storeData(currentData()),350);
}

function escapeHtml(value){
  return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function highlightSource(source){
  const language=languageSelect.value;
  const keywords={
    python:/^(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)$/,
    javascript:/^(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|true|try|typeof|var|void|while|yield)$/,
    cpp:/^(?:auto|bool|break|case|char|class|const|continue|default|do|double|else|false|float|for|if|int|long|namespace|new|nullptr|return|short|signed|sizeof|static|std|string|struct|switch|true|unsigned|using|void|while)$/,
    java:/^(?:abstract|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|new|null|package|private|protected|public|return|short|static|super|switch|this|throw|throws|transient|try|void|volatile|while|true|false)$/
  }[language];
  const builtins=/^(?:print|input|len|range|list|map|filter|sum|int|str|float|bool|enumerate|zip|abs|round|sorted|type|console|Math|Scanner|System|cout|cin|endl|fs)$/;
  const tokenPattern=/(#[^\n]*|\/\/[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;
  let html='';
  let previousEnd=0;
  for(const match of source.matchAll(tokenPattern)){
    const token=match[0];
    const index=match.index;
    html+=escapeHtml(source.slice(previousEnd,index));
    let className='';
    if(token.startsWith('#')||token.startsWith('//'))className='syntax-comment';
    else if(/^["'`]/.test(token))className='syntax-string';
    else if(/^\d/.test(token))className='syntax-number';
    else if(keywords.test(token))className='syntax-keyword';
    else if(builtins.test(token))className='syntax-builtin';
    else if(/^(?:def|function|class)$/.test(source.slice(0,index).trimEnd().split(/\s+/).pop()))className='syntax-function';
    if(className)html+=`<span class="${className}">${escapeHtml(token)}</span>`;
    else html+=escapeHtml(token);
    previousEnd=index+token.length;
  }
  html+=escapeHtml(source.slice(previousEnd));
  highlightedCode.innerHTML=html||' ';
}

function updateEditor(){
  const lines=codeInput.value.split('\n');
  lineNumbers.textContent=Array.from({length:lines.length},(_,index)=>index+1).join('\n');
  highlightSource(codeInput.value);
  syncEditorScroll();
  const language=languages[languageSelect.value];
  const fileName=`solution.${language.extension}`;
  document.getElementById('file-name').textContent=fileName;
  document.querySelector('.python-icon').textContent=languageSelect.value==='python'?'🐍':languageSelect.value==='javascript'?'JS':languageSelect.value==='cpp'?'C++':'☕';
  document.getElementById('code-info').textContent=`${language.name} · ${lines.length} qator · ${codeInput.value.length} belgi`;
  document.getElementById('runtime-name').textContent=language.name;
  document.getElementById('runtime-version').textContent=languageSelect.value==='python'?'3.11.4':'Bajarish muhiti ulanmagan';
}

function syncEditorScroll(){
  lineNumbers.scrollTop=codeInput.scrollTop;
  highlightedCode.style.transform=`translate(${-codeInput.scrollLeft}px, ${-codeInput.scrollTop}px)`;
}

function showLesson(){
  if(!task){
    document.title='Topshiriq topilmadi · Sputnik Academy';
    document.getElementById('problem-title').textContent='Topshiriq topilmadi';
    const description=document.getElementById('problem-description');
    description.textContent='Tanlangan kod yozish topshirig‘i mavjud emas. Amaliy topshiriqlar sahifasiga qaytib, topshiriqni qayta tanlang. ';
    const returnLink=document.createElement('a');
    returnLink.href='Topshiriqlar.html';
    returnLink.textContent='Topshiriqlar ro‘yxatiga qaytish →';
    description.appendChild(returnLink);
    document.querySelector('.problem-identifiers').hidden=true;
    document.getElementById('page-range').hidden=true;
    document.getElementById('problem-topic').hidden=true;
    document.querySelector('.problem-progress').hidden=true;
    document.querySelector('.panel-tabs').hidden=true;
    document.querySelector('.io-details').hidden=true;
    document.querySelector('.examples-heading').hidden=true;
    document.querySelector('.example-card').hidden=true;
    document.querySelector('.hint-card').hidden=true;
    document.querySelector('.complexity-card').hidden=true;
    document.querySelector('.action-bar').hidden=true;
    document.querySelector('.workspace').classList.add('task-missing');
    document.querySelector('.editor-panel').hidden=true;
    showStatus('Topshiriq havolasi yaroqsiz.',true);
    return;
  }
  document.title=`${task.title} · Sputnik Academy`;
  document.getElementById('problem-title').textContent=task.title;
  document.getElementById('problem-code').textContent=task.code||'KOD';
  document.getElementById('problem-level').textContent=task.level;
  const pointsBadge=document.getElementById('points-badge');
  pointsBadge.hidden=!task.points;
  pointsBadge.textContent=task.points||'';
  document.getElementById('page-range').textContent=`▤ ${task.pages||'Amaliy mashq'}`;
  document.getElementById('problem-topic').textContent=`Mavzu: ${task.topic||task.title}`;
  document.getElementById('problem-description').textContent=task.description;
  document.getElementById('function-name').textContent=task.functionName||'Yechim funksiyasini yozing';
  document.getElementById('problem-input').textContent=task.input;
  document.getElementById('problem-output').textContent=task.output;
  document.getElementById('sample-input').textContent=task.sampleInput;
  document.getElementById('sample-output').textContent=task.sampleOutput;
  document.getElementById('console-sample-input').textContent=task.sampleInput;
  document.getElementById('console-sample-output').textContent=task.sampleOutput;
  document.getElementById('test-file-content').textContent=`Kirish:\n${task.sampleInput}\n\nKutilgan chiqish:\n${task.sampleOutput}\n\nEslatma: test bajarilmagan.`;
  document.getElementById('language-hint').textContent=languageSelect.value==='python'?'Python’da ro‘yxatni bosqichma-bosqich yig‘ish uchun yangi bo‘sh ro‘yxat yarating.':'Tanlangan tilda kirish ma’lumotini o‘qib, natijani standart chiqishga yozing.';
  Object.assign(codeByLanguage,task.starterCode);

  const saved=loadStoredData();
  const savedCodes=saved.codeByLanguage||{};
  if(languages[saved.language])languageSelect.value=saved.language;
  languageSelect.dataset.previousLanguage=languageSelect.value;
  codeInput.value=savedCodes[languageSelect.value]??codeByLanguage[languageSelect.value]??'';
  document.getElementById('task-notes').value=saved.notes||'';
  if(savedCodes[languageSelect.value]!==undefined){
    const savedAt=saved.savedAt?new Date(saved.savedAt).toLocaleTimeString('uz',{hour:'2-digit',minute:'2-digit'}):'oldinroq';
    setSavedState(true,`Oxirgi saqlash · ${savedAt}`);
  }else{
    setSavedState(true,'Boshlang‘ich kod');
  }
  updateEditor();
}

function switchLeftTab(name){
  document.querySelectorAll('[data-left-tab]').forEach(tab=>{
    const selected=tab.dataset.leftTab===name;
    tab.classList.toggle('is-active',selected);
    tab.setAttribute('aria-selected',String(selected));
    document.getElementById(`pane-${tab.dataset.leftTab}`).hidden=!selected;
  });
}

function switchFile(name){
  activeFile=name;
  document.querySelectorAll('[data-file-tab]').forEach(tab=>{
    const selected=tab.dataset.fileTab===name;
    tab.classList.toggle('is-active',selected);
    tab.setAttribute('aria-selected',String(selected));
  });
  document.getElementById('solution-file').hidden=name!=='solution';
  document.getElementById('tests-file').hidden=name!=='tests';
  document.getElementById('readme-file').hidden=name!=='readme';
}

function switchConsole(name){
  document.querySelectorAll('[data-console-tab]').forEach(tab=>{
    const selected=tab.dataset.consoleTab===name;
    tab.classList.toggle('is-active',selected);
  });
  const content=document.getElementById('console-content');
  if(name==='tests'){
    content.innerHTML='<article class="test-result-card"><div><strong>Berilgan namuna</strong><span class="test-pending">Bajarilmagan</span></div><p>Kirish: <code id="console-sample-input"></code></p><p>Kutilgan chiqish: <code id="console-sample-output"></code></p></article><p class="console-disclaimer">Bu namuna — topshiriqdagi kutilgan natija. Kod avtomatik ishga tushirilmadi.</p>';
    document.getElementById('console-sample-input').textContent=task?.sampleInput||'';
    document.getElementById('console-sample-output').textContent=task?.sampleOutput||'';
  }else if(name==='output'){
    content.innerHTML='<pre class="console-empty">Konsol bo‘sh.\nKod bajarish xizmati ulanmagani sababli natija hosil qilinmadi.</pre>';
  }else{
    content.innerHTML='<pre class="console-empty">Debug ma’lumoti yo‘q.\nKod bajarish xizmati ulanmagani sababli debug seansi ochilmadi.</pre>';
  }
}

function showExecutionUnavailable(){
  consoleBanner.hidden=false;
  consoleBanner.classList.add('is-warning');
  consoleMessage.textContent='Kod bajarilmadi: serverdagi bajarish muhiti hali ulanmagan.';
  switchConsole('output');
  showStatus('Ishga tushirish muhiti ulanmagan. Kodingiz bajarilmadi.',true);
}

showLesson();

document.getElementById('logout')?.addEventListener('click',()=>sessionStorage.removeItem('studentEmail'));

document.querySelectorAll('[data-left-tab]').forEach(tab=>tab.addEventListener('click',()=>switchLeftTab(tab.dataset.leftTab)));
document.querySelectorAll('[data-file-tab]').forEach(tab=>tab.addEventListener('click',()=>switchFile(tab.dataset.fileTab)));
document.querySelectorAll('[data-console-tab]').forEach(tab=>tab.addEventListener('click',()=>switchConsole(tab.dataset.consoleTab)));

document.getElementById('hint-toggle').addEventListener('click',event=>{
  const button=event.currentTarget;
  const open=button.getAttribute('aria-expanded')==='true';
  button.setAttribute('aria-expanded',String(!open));
  document.getElementById('hint-content').hidden=open;
  document.getElementById('hint-icon').textContent=open?'⌄':'⌃';
  if(open)document.getElementById('hint-content').classList.remove('is-open');
  else document.getElementById('hint-content').classList.add('is-open');
});

document.getElementById('help-button').addEventListener('click',()=>{
  switchLeftTab('problem');
  document.getElementById('hint-toggle').setAttribute('aria-expanded','true');
  document.getElementById('hint-content').hidden=false;
  document.getElementById('hint-content').classList.add('is-open');
  document.getElementById('hint-icon').textContent='⌃';
  document.getElementById('problem-panel').scrollIntoView({behavior:'smooth',block:'start'});
});

languageSelect.addEventListener('change',()=>{
  codeByLanguage[languageSelect.dataset.previousLanguage]=codeInput.value;
  const stored=loadStoredData();
  if(stored.codeByLanguage)Object.assign(codeByLanguage,stored.codeByLanguage);
  languageSelect.dataset.previousLanguage=languageSelect.value;
  codeInput.value=stored.codeByLanguage?.[languageSelect.value]??codeByLanguage[languageSelect.value]??'';
  document.getElementById('language-hint').textContent=languageSelect.value==='python'?'Python’da ro‘yxatni bosqichma-bosqich yig‘ish uchun yangi bo‘sh ro‘yxat yarating.':'Tanlangan tilda kirish ma’lumotini o‘qib, natijani standart chiqishga yozing.';
  showStatus('');
  updateEditor();
  scheduleSave();
});

codeInput.addEventListener('input',()=>{
  codeByLanguage[languageSelect.value]=codeInput.value;
  showStatus('');
  updateEditor();
  scheduleSave();
});
codeInput.addEventListener('scroll',syncEditorScroll);
codeInput.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  event.preventDefault();
  const start=codeInput.selectionStart;
  const end=codeInput.selectionEnd;
  codeInput.setRangeText('    ',start,end,'end');
  codeByLanguage[languageSelect.value]=codeInput.value;
  updateEditor();
  scheduleSave();
});

document.getElementById('save-code').addEventListener('click',()=>{
  window.clearTimeout(saveTimer);
  const data=currentData();
  data.savedAt=new Date().toISOString();
  if(storeData(data))showStatus('Javob ushbu brauzerda saqlandi.');
});

document.getElementById('save-notes').addEventListener('click',()=>{
  const data=currentData();
  data.savedAt=new Date().toISOString();
  if(storeData(data))document.getElementById('notes-status').textContent='Qayd brauzeringizda saqlandi.';
});

document.getElementById('task-notes').addEventListener('input',()=>{
  document.getElementById('notes-status').textContent='Saqlanmagan o‘zgarishlar';
  scheduleSave();
});

document.getElementById('reset-code').addEventListener('click',()=>{
  if(!task)return;
  if(!window.confirm('Joriy tildagi kodingizni boshlang‘ich holatga qaytarasizmi?'))return;
  codeInput.value=task.starterCode[languageSelect.value]||'';
  codeByLanguage[languageSelect.value]=codeInput.value;
  updateEditor();
  showStatus('Boshlang‘ich kod tiklandi.');
  scheduleSave();
});

document.getElementById('font-size-button').addEventListener('click',()=>{
  editorFontSize=editorFontSize>=16?12:editorFontSize+1;
  document.querySelectorAll('.highlighted-code,#source-code,.line-numbers').forEach(element=>{element.style.fontSize=`${editorFontSize}px`});
});

document.getElementById('submit-code').addEventListener('click',()=>{
  if(!task)return;
  if(!codeInput.value.trim()){
    showStatus('Yuborishdan oldin kod yozing.',true);
    codeInput.focus();
    return;
  }
  showExecutionUnavailable();
});

document.getElementById('dismiss-console').addEventListener('click',()=>{
  consoleBanner.hidden=true;
});

window.setInterval(()=>{
  elapsedSeconds++;
  const minutes=String(Math.floor(elapsedSeconds/60)).padStart(2,'0');
  const seconds=String(elapsedSeconds%60).padStart(2,'0');
  document.getElementById('elapsed-time').textContent=`${minutes}:${seconds}`;
},1000);
