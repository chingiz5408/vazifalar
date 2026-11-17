const params=new URLSearchParams(window.location.search);
const taskId=params.get('task');
const task=window.OrderingTasks[taskId];
const stepList=document.getElementById('steps');
const feedback=document.getElementById('feedback');
let order=task?task.initialOrder.slice():[];
let draggedStep=null;

if(!task){
  document.getElementById('exercise-title').textContent='Topshiriq topilmadi';
  document.getElementById('exercise-instruction').textContent='Tanlangan topshiriq mavjud emas. Kurs sahifasiga qaytib, topshiriqni qayta tanlang.';
  document.querySelector('.tip').hidden=true;
  document.getElementById('reset').hidden=true;
  document.getElementById('check').hidden=true;
}else{
  document.getElementById('exercise-title').textContent=task.title;
  document.getElementById('exercise-instruction').textContent=task.instruction;
  renderSteps();
}

function renderSteps(){
  stepList.replaceChildren();
  order.forEach((stepId,index)=>{
    const step=task.steps.find(item=>item.id===stepId);
    const item=document.createElement('li');
    item.className='step';item.draggable=true;item.dataset.stepId=stepId;
    const number=document.createElement('span');number.className='step-number';number.textContent=String(index+1);
    const text=document.createElement('span');text.className='step-text';text.textContent=step.text;
    const controls=document.createElement('span');controls.className='step-controls';
    const up=createMoveButton('↑',`“${step.text}” qadamini yuqoriga ko‘chirish`,index===0,()=>moveStep(index,-1));
    const down=createMoveButton('↓',`“${step.text}” qadamini pastga ko‘chirish`,index===order.length-1,()=>moveStep(index,1));
    controls.append(up,down);item.append(number,text,controls);
    item.addEventListener('dragstart',event=>{
      draggedStep=stepId;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',stepId);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend',()=>{
      item.classList.remove('dragging');stepList.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
      draggedStep=null;syncOrderFromList();
    });
    item.addEventListener('dragover',event=>{
      event.preventDefault();
      const source=draggedStep||event.dataTransfer.getData('text/plain');
      if(!source||source===stepId)return;
      event.dataTransfer.dropEffect='move';
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave',()=>item.classList.remove('drag-over'));
    item.addEventListener('drop',event=>{
      event.preventDefault();item.classList.remove('drag-over');
      const source=draggedStep||event.dataTransfer.getData('text/plain');
      if(!source||source===stepId)return;
      const sourceElement=stepList.querySelector(`[data-step-id="${CSS.escape(source)}"]`);
      if(!sourceElement)return;
      const bounds=item.getBoundingClientRect();
      const insertAfter=event.clientY>bounds.top+bounds.height/2;
      stepList.insertBefore(sourceElement,insertAfter?item.nextSibling:item);
      syncOrderFromList();
    });
    stepList.appendChild(item);
  });
}

function createMoveButton(label,description,disabled,action){
  const button=document.createElement('button');
  button.type='button';button.className='move-button';button.textContent=label;
  button.setAttribute('aria-label',description);button.disabled=disabled;
  button.addEventListener('click',action);
  return button;
}

function syncOrderFromList(){
  order=Array.from(stepList.children,item=>item.dataset.stepId);
  renderSteps();
}

function moveStep(index,direction){
  const target=index+direction;
  if(target<0||target>=order.length)return;
  [order[index],order[target]]=[order[target],order[index]];
  clearFeedback();renderSteps();
}

function clearFeedback(){
  feedback.textContent='';feedback.classList.remove('success','error');
}

document.getElementById('reset').addEventListener('click',()=>{
  if(!task)return;
  order=task.initialOrder.slice();clearFeedback();renderSteps();
});

document.getElementById('check').addEventListener('click',()=>{
  if(!task)return;
  const correct=task.steps.map(step=>step.id);
  const isCorrect=order.length===correct.length&&order.every((id,index)=>id===correct[index]);
  feedback.classList.toggle('success',isCorrect);feedback.classList.toggle('error',!isCorrect);
  feedback.textContent=isCorrect
    ?'Barakalla! Qadamlar to‘g‘ri tartiblangan.'
    :'Hali to‘g‘ri tartib emas. Qadamlarni yana bir bor tekshirib ko‘ring.';
});
