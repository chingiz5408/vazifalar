const T={
  start:{name:'Boshlash',w:140,h:50,c:'--c-start'},
  io:{name:'Kiritish / Chiqarish',w:160,h:56,c:'--c-io',text:'Kiritish: a, b'},
  calc:{name:'Hisoblash',w:150,h:56,c:'--c-calc',text:'s = a + b'},
  cond:{name:'Shart',w:160,h:90,c:'--c-cond',text:'a > b ?'},
  end:{name:'Tugash',w:140,h:50,c:'--c-end'}
};
const NS='http://www.w3.org/2000/svg',G=20;
const $=id=>document.getElementById(id), ws=$('ws'), gN=$('gN'), gE=$('gE'), tmp=$('tmp'), edit=$('edit'), viewport=$('viewport');
let nodes=[],edges=[],sel=null,uid=1,conn=null,drag=null,pan=null,zoom=1,panX=0,panY=0,droppingVariable=false;
const el=(n,a={},p)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);p&&p.appendChild(e);return e};
const snap=v=>Math.round(v/G)*G;
const pointerPoint=(x,y)=>{const r=ws.getBoundingClientRect();return{x:(x-r.left-panX)/zoom,y:(y-r.top-panY)/zoom}};
function updateViewport(){
  viewport.setAttribute('transform',`translate(${panX} ${panY}) scale(${zoom})`);
  $('zoom-level').value=`${Math.round(zoom*100)}%`;
  $('zoom-level').textContent=`${Math.round(zoom*100)}%`;
}
function zoomAt(next,x,y){
  const scale=Math.max(.25,Math.min(3,next)),r=ws.getBoundingClientRect();
  const px=x-r.left,py=y-r.top,worldX=(px-panX)/zoom,worldY=(py-panY)/zoom;
  zoom=scale;panX=px-worldX*zoom;panY=py-worldY*zoom;updateViewport();
}
function zoomCenter(next){const r=ws.getBoundingClientRect();zoomAt(next,r.left+r.width/2,r.top+r.height/2)}
$('zoom-in').onclick=()=>zoomCenter(zoom*1.2);
$('zoom-out').onclick=()=>zoomCenter(zoom/1.2);
$('zoom-reset').onclick=()=>{zoom=1;panX=0;panY=0;updateViewport()};
ws.addEventListener('wheel',e=>{e.preventDefault();zoomAt(zoom*(e.deltaY<0?1.1:1/1.1),e.clientX,e.clientY)},{passive:false});
updateViewport();

function shape(type,w,h,p,cls){
  const f=`var(${T[type].c})`;let s;
  if(type==='start'||type==='end')s=el('rect',{width:w,height:h,rx:h/2,fill:f},p);
  else if(type==='io'){const k=16;s=el('polygon',{points:`${k},0 ${w},0 ${w-k},${h} 0,${h}`,fill:f},p)}
  else if(type==='cond')s=el('polygon',{points:`${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`,fill:f},p);
  else s=el('rect',{width:w,height:h,fill:f},p);
  s.setAttribute('class',cls||'shape');return s;
}
// palitra
Object.keys(T).forEach(t=>{
  const d=document.createElement('div');d.className='pal';d.draggable=true;d.dataset.t=t;
  const v=el('svg',{viewBox:`-2 -2 ${T[t].w+4} ${T[t].h+4}`});shape(t,T[t].w,T[t].h,v,'shape');
  v.querySelector('.shape').setAttribute('stroke','var(--stroke)');v.querySelector('.shape').setAttribute('stroke-width','2');
  d.appendChild(v);const s=document.createElement('small');s.textContent=T[t].name;d.appendChild(s);
  d.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',t));
  d.addEventListener('click',()=>addNode(t,60+nodes.length%5*30,60+nodes.length%5*30));
  $('pal').appendChild(d);
});
ws.addEventListener('dragover',e=>e.preventDefault());
ws.addEventListener('drop',e=>{e.preventDefault();const t=e.dataTransfer.getData('text/plain');if(!T[t])return;
  const p=pointerPoint(e.clientX,e.clientY);addNode(t,p.x-T[t].w/2,p.y-T[t].h/2)});

function addNode(type,x,y,text){
  const n={id:uid++,type,x:Math.max(0,snap(x)),y:Math.max(0,snap(y)),w:T[type].w,h:T[type].h,text:text||T[type].text||T[type].name};
  nodes.push(n);sel={k:'n',id:n.id};render();return n;
}
const sides=n=>({t:[n.x+n.w/2,n.y,0,-1],r:[n.x+n.w,n.y+n.h/2,1,0],b:[n.x+n.w/2,n.y+n.h,0,1],l:[n.x,n.y+n.h/2,-1,0]});
const nodeById=id=>nodes.find(n=>n.id===id);

function bez(a,b){ // a,b: [x,y,dx,dy]
  const k=Math.max(40,Math.hypot(a[0]-b[0],a[1]-b[1])/3);
  const c1=[a[0]+a[2]*k,a[1]+a[3]*k],c2=[b[0]+b[2]*k,b[1]+b[3]*k];
  return{d:`M${a[0]} ${a[1]} C${c1} ${c2} ${b[0]} ${b[1]}`,m:[(a[0]+3*c1[0]+3*c2[0]+b[0])/8,(a[1]+3*c1[1]+3*c2[1]+b[1])/8]};
}

function render(){
  gN.innerHTML='';gE.innerHTML='';
  edges.forEach(e=>{
    const a=nodeById(e.from),b=nodeById(e.to);if(!a||!b)return;
    const r=bez(sides(a)[e.fs],sides(b)[e.ts]);
    const g=el('g',{},gE);const isSel=sel&&sel.k==='e'&&sel.id===e.id;
    el('path',{d:r.d,class:'edge'+(isSel?' sel':''),'marker-end':'url(#ar)'},g);
    const h=el('path',{d:r.d,class:'hit'},g);
    h.addEventListener('pointerdown',ev=>{ev.stopPropagation();sel={k:'e',id:e.id};render()});
    if(a.type==='cond'){
      const t=el('text',{x:r.m[0],y:r.m[1]-6,class:'lbl'},g);t.textContent=e.label;
      t.addEventListener('pointerdown',ev=>{ev.stopPropagation();e.label=e.label==='Ha'?'Yo‘q':'Ha';render()});
    }
  });
  nodes.forEach(n=>{
    const g=el('g',{class:'node'+(sel&&sel.k==='n'&&sel.id===n.id?' sel':''),transform:`translate(${n.x},${n.y})`,'data-id':n.id},gN);
    shape(n.type,n.w,n.h,g);
    const t=el('text',{x:n.w/2,y:n.h/2},g);t.textContent=n.text;
    const s=sides(n);
    ['t','r','b','l'].forEach(k=>{
      const c=el('circle',{cx:s[k][0]-n.x,cy:s[k][1]-n.y,r:6,class:'port'},g);
      c.addEventListener('pointerdown',ev=>{ev.stopPropagation();ev.preventDefault();conn={from:n.id,fs:k};document.body.classList.add('c')
        ;gN.classList.add('show')});
    });
    g.addEventListener('pointerdown',ev=>{
      if(ev.target.classList.contains('port'))return;
      sel={k:'n',id:n.id};
      gN.querySelectorAll('.node.sel').forEach(node=>node.classList.remove('sel'));
      gE.querySelectorAll('.edge.sel').forEach(edge=>edge.classList.remove('sel'));
      g.classList.add('sel');
      const p=pointerPoint(ev.clientX,ev.clientY);drag={n,dx:p.x-n.x,dy:p.y-n.y};
    });
    g.addEventListener('dblclick',()=>openEdit(n));
  });
  const L=$('links');L.innerHTML='';
  edges.forEach(e=>{const a=nodeById(e.from),b=nodeById(e.to);if(!a||!b)return;
    const li=document.createElement('li');li.textContent=`${a.text} → ${b.text}`+(a.type==='cond'?` (${e.label})`:'');L.appendChild(li)});
  const variables=$('variables');variables.innerHTML='';
  AlgorithmEngine.getVariables(nodes).forEach(name=>{
    const chip=document.createElement('button');chip.type='button';chip.className='variable-chip';chip.textContent=name;chip.draggable=true;
    chip.addEventListener('pointerdown',()=>{droppingVariable=true});
    chip.addEventListener('dragstart',ev=>{ev.dataTransfer.setData('text/plain',name);droppingVariable=true});
    chip.addEventListener('dragend',()=>{droppingVariable=false});
    chip.addEventListener('click',()=>{
      const calc=sel&&sel.k==='n'&&nodeById(sel.id)?.type==='calc'?nodeById(sel.id):[...nodes].reverse().find(n=>n.type==='calc');
      if(!calc)return;
      if(edit.style.display==='block')edit.setRangeText(name,edit.selectionStart,edit.selectionEnd,'end');
      else{openEdit(calc);edit.setRangeText(name,edit.value.length,edit.value.length,'end')}
      droppingVariable=false;edit.focus();
    });
    variables.appendChild(chip);
  });
}

window.addEventListener('pointermove',ev=>{
  if(pan){panX=pan.x+ev.clientX-pan.startX;panY=pan.y+ev.clientY-pan.startY;updateViewport()}
  const p=pointerPoint(ev.clientX,ev.clientY),x=p.x,y=p.y;
  if(drag){drag.n.x=Math.max(0,snap(x-drag.dx));drag.n.y=Math.max(0,snap(y-drag.dy));render()}
  if(conn){const a=sides(nodeById(conn.from))[conn.fs];
    tmp.style.display='block';tmp.setAttribute('d',bez(a,[x,y,-a[2],-a[3]]).d)}
});
window.addEventListener('pointerup',ev=>{
  pan=null;$('main').classList.remove('panning');
  drag=null;
  if(!conn)return;
  tmp.style.display='none';gN.classList.remove('show');
  const hit=document.elementFromPoint(ev.clientX,ev.clientY),g=hit&&hit.closest&&hit.closest('.node');
  if(g){
    const to=+g.dataset.id;
    if(to!==conn.from){
      const b=nodeById(to),p=pointerPoint(ev.clientX,ev.clientY),px=p.x,py=p.y;
      let best='t',bd=1e9;const s=sides(b);
      for(const k in s){const d=Math.hypot(s[k][0]-px,s[k][1]-py);if(d<bd){bd=d;best=k}}
      const a=nodeById(conn.from);
      const outs=edges.filter(e=>e.from===a.id).length;
      if(!edges.some(e=>e.from===a.id&&e.to===to))
        edges.push({id:uid++,from:a.id,fs:conn.fs,to,ts:best,label:outs===0?'Ha':'Yo‘q'});
    }
  }
  conn=null;render();
});
$('bg').addEventListener('pointerdown',ev=>{
  sel=null;render();
  pan={startX:ev.clientX,startY:ev.clientY,x:panX,y:panY};$('main').classList.add('panning');
});

function openEdit(n){
  edit.style.display='block';edit.value=n.text;
  edit.placeholder=n.type==='calc'?'Masalan: s = a + b':'Masalan: Kiritish: a, b yoki Chiqarish: s';
  edit.style.left=(panX+n.x*zoom)+'px';edit.style.top=(panY+(n.y+n.h/2)*zoom-16)+'px';edit.style.width=(n.w*zoom)+'px';edit.focus();edit.select();
  const done=()=>{if(droppingVariable)return;n.text=edit.value||n.text;edit.style.display='none';edit.onblur=edit.onkeydown=null;render()};
  edit.onblur=done;edit.onkeydown=e=>{if(e.key==='Enter')done()};
}
edit.addEventListener('dragover',e=>e.preventDefault());
edit.addEventListener('drop',e=>{
  e.preventDefault();
  const variable=e.dataTransfer.getData('text/plain');
  if(/^[A-Za-z_]\w*$/.test(variable))edit.setRangeText(variable,edit.selectionStart,edit.selectionEnd,'end');
  droppingVariable=false;edit.focus();
});
function remove(){
  if(!sel)return;
  if(sel.k==='n'){nodes=nodes.filter(n=>n.id!==sel.id);edges=edges.filter(e=>e.from!==sel.id&&e.to!==sel.id)}
  else edges=edges.filter(e=>e.id!==sel.id);
  sel=null;render();
}
window.addEventListener('keydown',e=>{if(e.target===edit)return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove()}});
$('del').onclick=remove;
$('clear').onclick=()=>{nodes=[];edges=[];sel=null;render()};
$('run').onclick=()=>{
  const inputs=$('run-inputs');inputs.innerHTML='';
  $('run-result').textContent='';$('run-result').classList.remove('error');
  $('run-submit').hidden=false;
  AlgorithmEngine.getVariables(nodes).forEach(name=>{
    const label=document.createElement('label');label.textContent=`${name} qiymati`;
    const field=document.createElement('input');field.type='number';field.step='any';field.required=true;field.dataset.variable=name;
    label.appendChild(field);inputs.appendChild(label);
  });
  $('run-dialog').showModal();
  inputs.querySelector('input')?.focus();
};
$('run-close').onclick=()=>$('run-dialog').close();
$('run-submit').onclick=()=>{
  const inputs=[...$('run-inputs').querySelectorAll('input')];
  if(inputs.some(field=>!field.reportValidity()))return;
  const values=Object.fromEntries(inputs.map(field=>[field.dataset.variable,field.value]));
  try{
    const outputs=AlgorithmEngine.run(nodes,edges,name=>values[name]);
    $('run-result').textContent=outputs.length?outputs.join('\n'):'Algoritm muvaffaqiyatli bajarildi.';
    $('run-result').classList.remove('error');$('run-submit').hidden=true;
  }catch(error){
    $('run-result').textContent=`Xatolik: ${error.message}`;
    $('run-result').classList.add('error');
  }
};
function link(a,fs,b,ts,label){edges.push({id:uid++,from:a.id,fs,to:b.id,ts,label:label||'Ha'})}
$('demo').onclick=()=>{
  nodes=[];edges=[];sel=null;
  const s=addNode('start',240,20,'Boshlash'),i=addNode('io',230,120,'Kiritish: a, b'),c=addNode('cond',240,220,'a > b ?'),
  y=addNode('calc',60,360,'m = a'),n=addNode('calc',420,360,'m = b'),o=addNode('io',240,480,'Chiqarish: m'),e=addNode('end',240,580,'Tugash');
  link(s,'b',i,'t');link(i,'b',c,'t');link(c,'l',y,'t','Ha');link(c,'r',n,'t','Yo‘q');link(y,'b',o,'l');link(n,'b',o,'r');link(o,'b',e,'t');
  sel=null;render();
};
$('demo').click();
