const taskId=new URLSearchParams(window.location.search).get('task');
const task=window.CodeWritingTasks[taskId];
const languageSelect=document.getElementById('language');
const codeInput=document.getElementById('source-code');
const lineNumbers=document.getElementById('line-numbers');
const whitespaceGuides=document.getElementById('whitespace-guides');
const status=document.getElementById('submit-status');
const codeByLanguage={};
const languages={
  python:{name:'Python',extension:'py'},
  javascript:{name:'JavaScript',extension:'js'},
  cpp:{name:'C++',extension:'cpp'},
  java:{name:'Java',extension:'java'}
};

if(!task){
  document.getElementById('problem-title').textContent='Topshiriq topilmadi';
  document.getElementById('problem-description').textContent='Tanlangan kod yozish topshirig‘i mavjud emas. Kurs sahifasiga qaytib, topshiriqni qayta tanlang.';
  document.querySelector('.editor-panel').hidden=true;
}else{
  document.title=task.title;
  document.getElementById('problem-title').textContent=task.title;
  document.getElementById('problem-level').textContent=task.level;
  document.getElementById('problem-description').textContent=task.description;
  document.getElementById('problem-input').textContent=task.input;
  document.getElementById('problem-output').textContent=task.output;
  document.getElementById('sample-input').textContent=task.sampleInput;
  document.getElementById('sample-output').textContent=task.sampleOutput;
  Object.assign(codeByLanguage,task.starterCode);
  codeInput.value=codeByLanguage[languageSelect.value]||'';
  updateEditor();
}

function updateEditor(){
  const lines=codeInput.value.split('\n');
  lineNumbers.textContent=Array.from({length:lines.length},(_,index)=>index+1).join('\n');
  whitespaceGuides.replaceChildren();
  lines.forEach((line,index)=>{
    const indent=line.match(/^ */)[0].length;
    const dots=document.createElement('span');dots.className='indent-dots';dots.textContent='·'.repeat(indent);
    const rest=document.createElement('span');rest.className='code-ghost';rest.textContent=line.slice(indent);
    whitespaceGuides.append(dots,rest);
    if(index<lines.length-1)whitespaceGuides.appendChild(document.createTextNode('\n'));
  });
  syncEditorScroll();
  const language=languages[languageSelect.value];
  document.getElementById('file-name').textContent=`main.${language.extension}`;
  document.getElementById('code-info').textContent=`${language.name} · ${lines.length} qator · ${codeInput.value.length} belgi`;
}

function syncEditorScroll(){
  lineNumbers.scrollTop=codeInput.scrollTop;
  whitespaceGuides.style.transform=`translate(${-codeInput.scrollLeft}px, ${-codeInput.scrollTop}px)`;
}

languageSelect.addEventListener('change',()=>{
  if(!task)return;
  codeByLanguage[languageSelect.dataset.previousLanguage]=codeInput.value;
  languageSelect.dataset.previousLanguage=languageSelect.value;
  codeInput.value=codeByLanguage[languageSelect.value]||'';
  codeInput.focus();status.textContent='';status.style.color='';updateEditor();
});

languageSelect.dataset.previousLanguage=languageSelect.value;
codeInput.addEventListener('input',()=>{status.textContent='';status.style.color='';updateEditor()});
codeInput.addEventListener('scroll',syncEditorScroll);
codeInput.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  event.preventDefault();
  const start=codeInput.selectionStart,end=codeInput.selectionEnd;
  codeInput.setRangeText('    ',start,end,'end');updateEditor();
});

document.getElementById('submit-code').addEventListener('click',()=>{
  if(!task)return;
  if(!codeInput.value.trim()){
    status.textContent='Yuborishdan oldin kod yozing.';
    status.style.color='#b42335';
    codeInput.focus();return;
  }
  status.style.color='';
  status.textContent=`Kod ${languages[languageSelect.value].name} tilida yuborishga tayyor. Hozircha backend ulanmagan — kod bajarilmadi.`;
});
