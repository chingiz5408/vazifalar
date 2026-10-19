const testId=new URLSearchParams(window.location.search).get('test');
const test=window.QuizTests[testId];
const form=document.getElementById('test-form');
const questionsRoot=document.getElementById('test-questions');
const result=document.getElementById('test-result');

if(!test){
  document.getElementById('test-title').textContent='Test topilmadi';
  document.getElementById('test-instruction').textContent='Tanlangan test mavjud emas. Kurs sahifasiga qaytib, testni qayta tanlang.';
  document.getElementById('test-progress').hidden=true;
  form.hidden=true;
}else{
  document.title=test.title;
  document.getElementById('test-title').textContent=test.title;
  document.getElementById('test-instruction').textContent=test.instruction;
  document.getElementById('test-progress').textContent=`${test.questions.length} ta savol · har savolda bitta to‘g‘ri javob`;

  test.questions.forEach((question,index)=>{
    const item=document.createElement('li');item.className='question';
    const fieldset=document.createElement('fieldset');fieldset.className='question-fieldset';
    const legend=document.createElement('legend');
    const number=document.createElement('span');number.className='question-number';number.textContent=String(index+1);
    legend.append(number,document.createTextNode(question.prompt));
    const options=document.createElement('div');options.className='options';
    question.options.forEach((option,optionIndex)=>{
      const label=document.createElement('label');label.className='option';
      const radio=document.createElement('input');radio.type='radio';radio.name=`question-${index}`;radio.value=String(optionIndex);
      radio.setAttribute('aria-label',option);
      const text=document.createElement('span');text.className='option-text';text.textContent=option;
      label.append(radio,text);options.appendChild(label);
    });
    const questionResult=document.createElement('p');questionResult.className='question-result';questionResult.id=`question-result-${index}`;
    questionResult.setAttribute('aria-live','polite');
    fieldset.append(legend,options,questionResult);item.appendChild(fieldset);questionsRoot.appendChild(item);
  });
}

form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!test)return;
  let score=0,unanswered=0;
  test.questions.forEach((question,index)=>{
    const item=questionsRoot.children[index];
    const selected=form.querySelector(`input[name="question-${index}"]:checked`);
    const feedback=item.querySelector('.question-result');
    const isAnswered=Boolean(selected);
    const isCorrect=isAnswered&&Number(selected.value)===question.answer;
    item.classList.toggle('correct',isCorrect);
    item.classList.toggle('incorrect',isAnswered&&!isCorrect);
    item.classList.toggle('unanswered',!isAnswered);
    item.querySelectorAll('input').forEach(radio=>radio.disabled=true);
    if(isCorrect){
      score++;
      feedback.textContent=`To‘g‘ri! ${question.explanation}`;
    }else{
      if(!isAnswered)unanswered++;
      feedback.textContent=`${isAnswered?'Noto‘g‘ri':'Javob tanlanmagan'}. To‘g‘ri javob: ${question.options[question.answer]}. ${question.explanation}`;
    }
  });
  const percent=Math.round(score/test.questions.length*100);
  result.hidden=false;
  result.replaceChildren();
  const summary=document.createElement('strong');summary.textContent=`Natija: ${score} / ${test.questions.length} (${percent}%)`;
  const detail=document.createElement('p');
  detail.textContent=unanswered?`${unanswered} ta savolga javob tanlanmadi. To‘g‘ri javoblar va izohlar yuqorida ko‘rsatilgan.`:score===test.questions.length?'Ajoyib! Barcha savollarga to‘g‘ri javob berdingiz.':'To‘g‘ri javoblar va izohlar bilan javoblaringizni tekshirib chiqing.';
  result.append(summary,detail);
  form.querySelector('button[type="submit"]').disabled=true;
});

form.addEventListener('reset',()=>{
  window.setTimeout(()=>{
    questionsRoot.querySelectorAll('.question').forEach(item=>{
      item.classList.remove('correct','incorrect','unanswered');
      item.querySelectorAll('input').forEach(radio=>{radio.disabled=false});
      item.querySelector('.question-result').textContent='';
    });
    result.hidden=true;result.replaceChildren();
    form.querySelector('button[type="submit"]').disabled=false;
  });
});
