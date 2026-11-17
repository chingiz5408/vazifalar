/* ==========================================================
   Algoritm bajarish dvigateli (DOM bilan ishlamaydi)

   window.AlgorithmEngine:
     getVariables(nodes)          -> ['a','b']   (Kiritish bloklaridagi nomlar)
     run(nodes, edges, input)     -> ['s = 8']   (input: nom => qiymat)
     judge(nodes, edges, tests)   -> [{order, ok, actual, expected, error}]
     parseTestInput(text, vars)   -> {a:'5', b:'3'}
     outputValues(lines)          -> ['8']       ("s = 8" -> "8")
   ========================================================== */
(() => {
  const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/;
  const INPUT_PATTERN = /^Kiritish\s*:?\s*(.*)$/i;
  const OUTPUT_PATTERN = /^Chiqarish\s*:?\s*(.*)$/i;
  const CONDITION_PATTERN = /^Shart\s*:?/i;
  const MAX_STEPS = 1000;

  const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const splitNames = text => text.split(',').map(name => name.trim()).filter(Boolean);
  const splitLines = text => String(text ?? '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  /* ---------- O'zgaruvchilar ---------- */
  function getVariables(nodes) {
    const names = [];
    nodes.filter(node => node.type === 'io').forEach(node => {
      const match = node.text.trim().match(INPUT_PATTERN);
      if (!match) return;
      splitNames(match[1]).forEach(name => {
        if (IDENT.test(name) && !names.includes(name)) names.push(name);
      });
    });
    return names;
  }

  /* ---------- Ifodani hisoblash ---------- */
  function tokenize(source) {
    const tokens = [];
    let rest = source.trim();
    while (rest) {
      const match = rest.match(/^\s*(>=|<=|==|!=|[()+\-*/<>]|(?:\d+(?:\.\d*)?|\.\d+)|[A-Za-z_][A-Za-z0-9_]*)/);
      if (!match) throw new Error(`Ifodada tushunarsiz belgi bor: "${rest[0]}".`);
      tokens.push(match[1]);
      rest = rest.slice(match[0].length);
    }
    return tokens;
  }

  function evaluate(source, values) {
    const tokens = tokenize(source);
    let index = 0;
    const peek = () => tokens[index];
    const take = () => tokens[index++];

    function atom() {
      const token = take();
      if (token === '(') {
        const value = comparison();
        if (take() !== ')') throw new Error('Qavslar to‘liq yopilmagan.');
        return value;
      }
      if (token === '-' || token === '+') return (token === '-' ? -1 : 1) * atom();
      if (token === undefined) throw new Error('Ifoda kiritilmagan.');
      if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return Number(token);
      if (has(values, token)) return values[token];
      throw new Error(`"${token}" o‘zgaruvchisi kiritilmagan.`);
    }

    function product() {
      let value = atom();
      while (peek() === '*' || peek() === '/') {
        const op = take(), right = atom();
        if (op === '/' && right === 0) throw new Error('Nolga bo‘lish mumkin emas.');
        value = op === '*' ? value * right : value / right;
      }
      return value;
    }

    function sum() {
      let value = product();
      while (peek() === '+' || peek() === '-') {
        const op = take(), right = product();
        value = op === '+' ? value + right : value - right;
      }
      return value;
    }

    function comparison() {
      const left = sum(), op = peek();
      if (!['>', '<', '>=', '<=', '==', '!='].includes(op)) return left;
      take();
      const right = sum();
      switch (op) {
        case '>': return left > right;
        case '<': return left < right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '==': return left === right;
        default: return left !== right;
      }
    }

    const result = comparison();
    if (index !== tokens.length) throw new Error(`Ifodada ortiqcha belgi bor: "${peek()}".`);
    if (typeof result === 'number' && !Number.isFinite(result)) throw new Error('Hisoblash natijasi son emas.');
    return result;
  }

  /* ---------- Diagrammani bajarish ---------- */
  function runInputBlock(node, values, input) {
    const match = node.text.trim().match(INPUT_PATTERN);
    const names = splitNames(match[1]);
    if (!names.length || names.some(name => !IDENT.test(name)))
      throw new Error('Kiritish bloki uchun o‘zgaruvchilarni vergul bilan yozing: Kiritish: a, b.');
    for (const name of names) {
      const raw = input(name), value = Number(raw);
      if (String(raw ?? '').trim() === '' || !Number.isFinite(value))
        throw new Error(`"${name}" uchun son kiriting.`);
      values[name] = value;
    }
  }

  function runOutputBlock(node, values, outputs) {
    const match = node.text.trim().match(OUTPUT_PATTERN);
    const names = splitNames(match[1]);
    if (!names.length) throw new Error('Chiqarish blokida o‘zgaruvchi ko‘rsating: Chiqarish: s.');
    names.forEach(name => {
      if (!has(values, name)) throw new Error(`"${name}" o‘zgaruvchisi hali qiymat olmagan.`);
      outputs.push(`${name} = ${values[name]}`);
    });
  }

  function run(nodes, edges, input) {
    const starts = nodes.filter(node => node.type === 'start');
    const byId = new Map(nodes.map(node => [node.id, node]));
    if (starts.length !== 1) throw new Error('Algoritmda bitta “Boshlash” bloki bo‘lishi kerak.');

    const values = Object.create(null), outputs = [];
    let current = starts[0];

    for (let steps = 0; steps < MAX_STEPS; steps++) {
      if (current.type === 'end') return outputs;

      if (current.type === 'io') {
        const text = current.text.trim();
        if (INPUT_PATTERN.test(text)) runInputBlock(current, values, input);
        else if (OUTPUT_PATTERN.test(text)) runOutputBlock(current, values, outputs);
        else throw new Error('Kiritish/chiqarish bloki “Kiritish: a” yoki “Chiqarish: a” shaklida bo‘lsin.');
      } else if (current.type === 'calc') {
        const assignment = current.text.trim().match(ASSIGNMENT);
        if (!assignment) throw new Error('Hisoblash bloki “s = a + b” shaklida bo‘lsin.');
        values[assignment[1]] = evaluate(assignment[2], values);
      }

      const outgoing = edges.filter(edge => edge.from === current.id);
      let nextEdge;

      if (current.type === 'cond') {
        const condition = current.text.trim().replace(CONDITION_PATTERN, '').replace(/\?$/, '').trim();
        const result = evaluate(condition, values);
        if (typeof result !== 'boolean')
          throw new Error('Shartda >, <, >=, <=, == yoki != taqqoslash belgisidan foydalaning.');
        const expected = result ? 'ha' : 'yo';
        nextEdge = outgoing.find(edge => edge.label.toLocaleLowerCase('uz').startsWith(expected));
        if (!nextEdge) throw new Error(`Shartning “${result ? 'Ha' : 'Yo‘q'}” chiqish yo‘li ulanmagan.`);
      } else {
        if (outgoing.length !== 1) throw new Error(`“${current.text}” blokidan keyingi bitta blokni ulang.`);
        nextEdge = outgoing[0];
      }

      current = byId.get(nextEdge.to);
      if (!current) throw new Error('Ulangan keyingi blok topilmadi.');
    }
    throw new Error('Algoritm juda ko‘p takrorlandi; ehtimol cheksiz sikl bor.');
  }

  /* ---------- Testlar ---------- */
  // Nomli ("a=5") yoki pozitsion ("5", "3") kirishni {nom: qiymat} ga aylantiradi
  function parseTestInput(text, variables) {
    const lines = splitLines(text);
    const values = Object.create(null);
    if (lines.some(line => line.includes('='))) {
      lines.forEach(line => {
        const index = line.indexOf('=');
        const name = line.slice(0, index).trim();
        if (name) values[name] = line.slice(index + 1).trim();
      });
    } else {
      variables.forEach((name, index) => {
        if (lines[index] !== undefined) values[name] = lines[index];
      });
    }
    return values;
  }

  // "s = 8" -> "8", "8" -> "8"
  function outputValues(lines) {
    return lines.map(line => {
      const text = String(line).trim(), index = text.lastIndexOf('=');
      return index === -1 ? text : text.slice(index + 1).trim();
    });
  }

  function judge(nodes, edges, tests) {
    const variables = getVariables(nodes);
    return tests.map(test => {
      const order = Number(test.order) || 0;
      try {
        const values = parseTestInput(test.input, variables);
        const actual = outputValues(run(nodes, edges, name => values[name]));
        const expected = outputValues(splitLines(test.expected));
        return { order, ok: actual.join('\n') === expected.join('\n'), actual, expected };
      } catch (error) {
        return { order, ok: false, error: error.message };
      }
    });
  }

  window.AlgorithmEngine = { getVariables, run, judge, parseTestInput, outputValues };
})();
