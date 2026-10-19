const authForm=document.getElementById('auth-form');
const formMessage=document.getElementById('form-message');

authForm.addEventListener('submit',event=>{
  event.preventDefault();
  formMessage.textContent='';

  if(authForm.dataset.mode==='register'){
    const password=authForm.elements.password.value;
    const passwordConfirm=authForm.elements['password-confirm'].value;
    if(password!==passwordConfirm){
      formMessage.textContent='Kiritilgan parollar bir-biriga mos kelmadi.';
      authForm.elements['password-confirm'].focus();
      return;
    }
  }

  if(authForm.dataset.mode==='login'){
    sessionStorage.setItem('studentEmail',authForm.elements.email.value.trim());
    window.location.href='Oquvchi.html';
    return;
  }

  formMessage.textContent='Ro‘yxatdan o‘tish uchun server xizmati ulanmagan.';
});