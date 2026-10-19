const studentEmail=sessionStorage.getItem('studentEmail');

if(!studentEmail){
  window.location.replace('Login.html');
}else{
  const studentName=studentEmail.split('@')[0].replace(/[._-]+/g,' ').trim().replace(/\b\p{L}/gu,letter=>letter.toLocaleUpperCase('uz'));
  document.getElementById('student-name').textContent=studentName||'o‘quvchi';
}

document.getElementById('logout').addEventListener('click',()=>{
  sessionStorage.removeItem('studentEmail');
});