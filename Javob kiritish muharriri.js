const taskId=new URLSearchParams(window.location.search).get('task');
const task=window.AnswerFormTasks[taskId];
const form=document.getElementById('answers');
const questionList=document.getElementById('questions');
const feedback=document.getElementById('feedback');

if(!task){
  document.getElementById('exercise-title').textContent='Topshiriq topilmadi';
  document.getElementById('exercise-instruction').textContent='Tanlangan topshiriq mavjud emas. Kurs sahifasiga qaytib, topshiriqni qayta tanlang.';
  document.getElementById('answer-hint').hidden=true;
  form.hidden=true;
}else{
  document.title=task.title;
  document.getElementById('exercise-title').textContent=task.title;
  document.getElementById('exercise-instruction').textContent=task.instruction;
  document.getElementById('answer-hint').textContent=task.hint;

  task.questions.forEach((question,index)=>{
    const item=document.createElement('li');item.className='question';
    const label=document.createElement('label');label.className='question-label';label.htmlFor=`answer-${index}`;
    const number=document.createElement('span');number.className='question-number';number.textContent=String(index+1);
    const prompt=document.createElement('span');prompt.textContent=question.prompt;
    label.append(number,prompt);
    const input=document.createElement('input');input.type='text';input.id=`answer-${index}`;input.className='answer-input';
    input.name=`answer-${index}`;input.autocomplete='off';input.placeholder='Algoritm turini yozing';input.setAttribute('aria-describedby',`result-${index}`);
    const result=document.createElement('p');result.id=`result-${index}`;result.className='question-result';result.setAttribute('aria-live','polite');
    item.append(label,input,result);questionList.appendChild(item);
  });
}

function normalizeAnswer(answer){
  return answer.trim().toLocaleLowerCase('uz').replace(/[‘’ʻ`´]/g,"'").replace(/\s+/g,' ').replace(/[.!?,:;]+$/,'');
}

form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!task)return;
  let correctCount=0,allFilled=true;
  task.questions.forEach((question,index)=>{
    const item=questionList.children[index],input=item.querySelector('input'),result=item.querySelector('.question-result');
    const value=normalizeAnswer(input.value);
    const correct=question.aliases.some(alias=>normalizeAnswer(alias)===value);
    item.classList.toggle('correct',correct);item.classList.toggle('incorrect',!correct);
    input.setAttribute('aria-invalid',String(!correct));
    if(!value){
      allFilled=false;result.textContent=`Javob kiriting. To‘g‘ri javob: ${question.answer}.`;
    }else if(correct){
      correctCount++;result.textContent='To‘g‘ri!';
    }else{
      result.textContent=`Bu javob to‘g‘ri emas. To‘g‘ri javob: ${question.answer}.`;
    }
  });
  const perfect=correctCount===task.questions.length;
  feedback.classList.toggle('success',perfect);feedback.classList.toggle('error',!perfect);
  feedback.textContent=perfect
    ?'Barakalla! Barcha javoblar to‘g‘ri.'
    :`${task.questions.length} ta savoldan ${correctCount} tasi to‘g‘ri.${allFilled?'':' Barcha maydonlarga javob kiriting.'}`;
});

form.addEventListener('reset',()=>{
  window.setTimeout(()=>{
    questionList.querySelectorAll('.question').forEach(item=>{
      item.classList.remove('correct','incorrect');
      item.querySelector('input').removeAttribute('aria-invalid');
      item.querySelector('.question-result').textContent='';
    });
    feedback.textContent='';feedback.classList.remove('success','error');
  });
});
