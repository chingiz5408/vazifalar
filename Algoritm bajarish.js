(()=>{
  const identifier='[A-Za-z_][A-Za-z0-9_]*';
  const inputPattern=new RegExp(`^Kiritish\\s*:?\\s*(.*)$`,'i');
  const outputPattern=new RegExp(`^Chiqarish\\s*:?\\s*(.*)$`,'i');
  const conditionPattern=/^Shart\s*:?/i;

  function getVariables(nodes){
    const names=[];
    nodes.filter(node=>node.type==='io').forEach(node=>{
      const match=node.text.trim().match(inputPattern);
      if(!match)return;
      match[1].split(',').map(name=>name.trim()).filter(Boolean).forEach(name=>{
        if(new RegExp(`^${identifier}$`).test(name)&&!names.includes(name))names.push(name);
      });
    });
    return names;
  }

  function tokenize(source){
    const tokens=[];
    let rest=source.trim();
    while(rest){
      const match=rest.match(/^\s*(>=|<=|==|!=|[()+\-*/<>]|(?:\d+(?:\.\d*)?|\.\d+)|[A-Za-z_][A-Za-z0-9_]*)/);
      if(!match)throw new Error(`Ifodada tushunarsiz belgi bor: "${rest[0]}".`);
      tokens.push(match[1]);rest=rest.slice(match[0].length);
    }
    return tokens;
  }

  function evaluate(source,values){
    const tokens=tokenize(source);
    let index=0;
    const peek=()=>tokens[index];
    const take=()=>tokens[index++];
    function atom(){
      const token=take();
      if(token==='('){
        const value=comparison();
        if(take()!==')')throw new Error('Qavslar to‘liq yopilmagan.');
        return value;
      }
      if(token==='-'||token==='+')return (token==='-'?-1:1)*atom();
      if(token===undefined)throw new Error('Ifoda kiritilmagan.');
      if(/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token))return Number(token);
      if(Object.prototype.hasOwnProperty.call(values,token))return values[token];
      throw new Error(`"${token}" o‘zgaruvchisi kiritilmagan.`);
    }
    function product(){
      let value=atom();
      while(peek()==='*'||peek()==='/'){
        const op=take(),right=atom();
        if(op==='/'&&right===0)throw new Error('Nolga bo‘lish mumkin emas.');
        value=op==='*'?value*right:value/right;
      }
      return value;
    }
    function sum(){
      let value=product();
      while(peek()==='+'||peek()==='-'){
        const op=take(),right=product();value=op==='+'?value+right:value-right;
      }
      return value;
    }
    function comparison(){
      const left=sum(),op=peek();
      if(!['>','<','>=','<=','==','!='].includes(op))return left;
      take();const right=sum();
      switch(op){
        case '>':return left>right;
        case '<':return left<right;
        case '>=':return left>=right;
        case '<=':return left<=right;
        case '==':return left===right;
        default:return left!==right;
      }
    }
    const result=comparison();
    if(index!==tokens.length)throw new Error(`Ifodada ortiqcha belgi bor: "${peek()}".`);
    if(typeof result==='number'&&!Number.isFinite(result))throw new Error('Hisoblash natijasi son emas.');
    return result;
  }

  function run(nodes,edges,input){
    const starts=nodes.filter(node=>node.type==='start'),byId=new Map(nodes.map(node=>[node.id,node]));
    if(starts.length!==1)throw new Error('Algoritmda bitta “Boshlash” bloki bo‘lishi kerak.');
    const values=Object.create(null),outputs=[];
    let current=starts[0];
    for(let steps=0;steps<1000;steps++){
      if(current.type==='end')return outputs;
      if(current.type==='io'){
        const inputMatch=current.text.trim().match(inputPattern);
        const outputMatch=current.text.trim().match(outputPattern);
        if(inputMatch){
          const names=inputMatch[1].split(',').map(name=>name.trim()).filter(Boolean);
          if(!names.length||names.some(name=>!new RegExp(`^${identifier}$`).test(name)))
            throw new Error('Kiritish bloki uchun o‘zgaruvchilarni vergul bilan yozing: Kiritish: a, b.');
          for(const name of names){
            const raw=input(name),value=Number(raw);
            if(String(raw).trim()===''||!Number.isFinite(value))throw new Error(`"${name}" uchun son kiriting.`);
            values[name]=value;
          }
        }else if(outputMatch){
          const names=outputMatch[1].split(',').map(name=>name.trim()).filter(Boolean);
          if(!names.length)throw new Error('Chiqarish blokida o‘zgaruvchi ko‘rsating: Chiqarish: s.');
          names.forEach(name=>{
            if(!Object.prototype.hasOwnProperty.call(values,name))throw new Error(`"${name}" o‘zgaruvchisi hali qiymat olmagan.`);
            outputs.push(`${name} = ${values[name]}`);
          });
        }else throw new Error('Kiritish/chiqarish bloki “Kiritish: a” yoki “Chiqarish: a” shaklida bo‘lsin.');
      }else if(current.type==='calc'){
        const assignment=current.text.trim().match(new RegExp(`^(${identifier})\\s*=\\s*(.+)$`));
        if(!assignment)throw new Error('Hisoblash bloki “s = a + b” shaklida bo‘lsin.');
        values[assignment[1]]=evaluate(assignment[2],values);
      }

      const outgoing=edges.filter(edge=>edge.from===current.id);
      let nextEdge;
      if(current.type==='cond'){
        const condition=current.text.trim().replace(conditionPattern,'').replace(/\?$/,'').trim();
        const result=evaluate(condition,values);
        if(typeof result!=='boolean')throw new Error('Shartda >, <, >=, <=, == yoki != taqqoslash belgisidan foydalaning.');
        const expected=result?'ha':'yo';
        nextEdge=outgoing.find(edge=>edge.label.toLocaleLowerCase('uz').startsWith(expected));
        if(!nextEdge)throw new Error(`Shartning “${result?'Ha':'Yo‘q'}” chiqish yo‘li ulanmagan.`);
      }else{
        if(outgoing.length!==1)throw new Error(`“${current.text}” blokidan keyingi bitta blokni ulang.`);
        nextEdge=outgoing[0];
      }
      current=byId.get(nextEdge.to);
      if(!current)throw new Error('Ulangan keyingi blok topilmadi.');
    }
    throw new Error('Algoritm juda ko‘p takrorlandi; ehtimol cheksiz sikl bor.');
  }

  window.AlgorithmEngine={getVariables,run};
})();
