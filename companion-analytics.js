(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const colors = ['#a8cee8','#f3b980','#a0dfb8','#dbadee','#f590a0','#73d5d7','#dbd780','#98a7ef','#e9c2b1','#b0d097','#ec9ee0','#e5a465','#a9b8c5','#78c7b3','#ceab89','#bcb3e7','#d4dcaa','#e7b4c4','#9cd9ef','#d3c6a1'];
  const number = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(n);
  const monthName = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let data = null;
  let selected = new Set();

  function chart() {
    const platforms = data.platforms.filter((_, i) => selected.has(i));
    $('selection-status').textContent = `${platforms.length} of ${data.platforms.length} platforms shown.`;
    if (!platforms.length) {
      $('traffic-chart').innerHTML = '<p class="empty-chart">Select a platform to view its traffic trend.</p>';
      return;
    }
    const log = $('chart-scale').value === 'log';
    const values = platforms.flatMap((p) => p.visits.filter((v) => v !== null));
    const max = Math.max(...values);
    const min = Math.min(...values);
    const upper = log ? 10 ** Math.ceil(Math.log10(max)) : Math.ceil(max / 5) * 5 || 5;
    const lower = log ? 10 ** Math.floor(Math.log10(min)) : 0;
    const w = 1000, h = 440, left = 68, right = 32, top = 28, bottom = 65;
    const dates = data.months.map((m) => Date.parse(`${m}-01T00:00:00Z`));
    const x = (i) => left + (dates[i] - dates[0]) / (dates.at(-1) - dates[0] || 1) * (w - left - right);
    const y = (v) => top + (1 - (log ? (Math.log10(v) - Math.log10(lower)) / (Math.log10(upper) - Math.log10(lower) || 1) : v / upper)) * (h - top - bottom);
    const ticks = log ? Array.from({length: Math.round(Math.log10(upper) - Math.log10(lower)) + 1}, (_, i) => lower * 10 ** i) : Array.from({length: 6}, (_, i) => upper * i / 5);
    let svg = `<svg viewBox="0 0 ${w} ${h}" role="group" aria-labelledby="traffic-svg-title traffic-svg-desc"><title id="traffic-svg-title">Monthly website visits in millions</title><desc id="traffic-svg-desc">${escape(platforms.map((p) => p.name).join(', '))}. ${log ? 'Logarithmic' : 'Linear'} scale. Exact observations are also available in the data table.</desc>`;
    ticks.forEach((v) => { svg += `<line x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}" class="chart-grid"/><text x="${left-12}" y="${y(v)+5}" text-anchor="end">${number(v)}</text>`; });
    data.months.forEach((m, i) => { svg += `<text x="${x(i)}" y="${h-22}" text-anchor="${i===0?'start':i===data.months.length-1?'end':'middle'}">${escape(monthName(m))}</text>`; });
    platforms.forEach((p) => {
      const color = colors[data.platforms.indexOf(p) % colors.length];
      p.visits.forEach((v, i) => {
        if (v === null) return;
        if (i > 0 && p.visits[i-1] !== null) {
          const gap = (Number(data.months[i].slice(0,4))*12+Number(data.months[i].slice(5))) - (Number(data.months[i-1].slice(0,4))*12+Number(data.months[i-1].slice(5))) > 1;
          svg += `<line x1="${x(i-1)}" y1="${y(p.visits[i-1])}" x2="${x(i)}" y2="${y(v)}" stroke="${color}" stroke-width="2.5" ${gap?'stroke-dasharray="7 6"':''}/>`;
        }
        const label = `${p.name}, ${monthName(data.months[i])}: ${number(v)} million visits`;
        svg += `<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="${color}" tabindex="0" role="img" aria-label="${escape(label)}"><title>${escape(label)}</title></circle>`;
      });
    });
    $('traffic-chart').innerHTML = svg + '</svg>';
  }

  function choose(indices) {
    selected = new Set(indices);
    $('platform-options').querySelectorAll('input').forEach((input) => { input.checked = selected.has(Number(input.value)); });
    chart();
  }

  function render() {
    const latest = data.months.length - 1;
    const stats = data.months.map((_, i) => {
      const values = data.platforms.map((p) => p.visits[i]).filter((v) => v !== null).sort((a,b) => a-b);
      const sum = values.reduce((a,b) => a+b, 0);
      return { count: values.length, sum, mean: sum / values.length, median: (values[Math.floor((values.length-1)/2)] + values[Math.floor(values.length/2)]) / 2 };
    });
    const matched = data.platforms.filter((p) => p.visits[0] !== null && p.visits[latest] !== null);
    const start = matched.reduce((sum,p) => sum+p.visits[0],0);
    const end = matched.reduce((sum,p) => sum+p.visits[latest],0);
    const change = (end/start-1)*100;
    $('last-updated').dateTime = data.updated;
    $('last-updated').textContent = new Date(`${data.updated}T12:00:00Z`).toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
    $('coverage-label').textContent = `${data.platforms.length} platforms · ${data.months.length} recorded months · ${monthName(data.months[0])}–${monthName(data.months[latest])}`;
    const cards = [
      ['Latest recorded total', `${number(stats[latest].sum)}M`, `${monthName(data.months[latest])} · ${stats[latest].count} platforms`],
      ['Platforms recorded', `${stats[0].count} → ${stats[latest].count}`, 'First month → latest month'],
      ['Same-platform change', `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`, `${matched.length} platforms · first → latest month`]
    ];
    $('summary-cards').innerHTML = cards.map(([label,value,note]) => `<article><p>${escape(label)}</p><strong>${escape(value)}</strong><small>${escape(note)}</small></article>`).join('');
    $('platform-options').innerHTML = data.platforms.map((p,i) => `<label><input type="checkbox" value="${i}"/><span class="platform-swatch" style="background:${colors[i%colors.length]}"></span>${escape(p.name)}</label>`).join('');
    $('traffic-table').innerHTML = `<caption>Similarweb monthly website visits (millions)</caption><thead><tr><th scope="col">Platform / statistic</th>${data.months.map((m) => `<th scope="col">${escape(monthName(m))}</th>`).join('')}</tr></thead><tbody>${data.platforms.map((p) => `<tr><th scope="row">${escape(p.name)}</th>${p.visits.map((v) => `<td>${v===null?'<span class="missing-value">Not recorded</span>':number(v)}</td>`).join('')}</tr>`).join('')}</tbody><tfoot>${[['Platforms recorded','count'],['Total','sum'],['Mean','mean'],['Median','median']].map(([label,key]) => `<tr><th scope="row">${label}</th>${stats.map((s) => `<td>${number(s[key])}</td>`).join('')}</tr>`).join('')}</tfoot>`;
    const top = data.platforms.map((p,i) => [i,p.visits[latest]??-1]).sort((a,b) => b[1]-a[1]).slice(0,5).map(([i]) => i);
    $('select-top').onclick = () => choose(top);
    choose(top);
  }

  function validate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.updated) || !Array.isArray(value.months) || value.months.length<2 || !value.months.every((m,i,a) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && (!i || m>a[i-1])) || !Array.isArray(value.platforms) || !value.platforms.length || !value.platforms.every((p) => typeof p.name==='string' && Array.isArray(p.visits) && p.visits.length===value.months.length && p.visits.some((v) => v!==null) && p.visits.every((v) => v===null || typeof v==='number' && Number.isFinite(v) && v>0)) || value.months.some((_,i) => value.platforms.every((p) => p.visits[i]===null))) throw new Error('Invalid dashboard data');
    return value;
  }

  $('unlock-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    $('access-message').textContent = 'Unlocking…';
    let stage = 'load';
    try {
      if (!window.crypto?.subtle) throw new Error('Secure browser required');
      const response = await fetch('data/companion-traffic.encrypted.json', {cache:'no-store'});
      if (!response.ok) throw new Error('Data unavailable');
      const encrypted = await response.json();
      const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
      const material = await crypto.subtle.importKey('raw', new TextEncoder().encode($('dashboard-password').value), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(encrypted.salt),iterations:encrypted.iterations,hash:'SHA-256'}, material, {name:'AES-GCM',length:256}, false, ['decrypt']);
      stage = 'decrypt';
      const clear = await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(encrypted.iv)},key,bytes(encrypted.ciphertext));
      stage = 'render';
      data = validate(JSON.parse(new TextDecoder().decode(clear)));
      render();
      $('dashboard-password').value = '';
      $('access-message').textContent = '';
      $('access-gate').hidden = true;
      $('access-screen').hidden = true;
      $('dashboard').hidden = false;
      $('lock-dashboard').focus();
    } catch (_) {
      data = null;
      $('access-message').textContent = stage==='decrypt' ? 'Unable to unlock. Check your password and try again.' : stage==='load' ? 'The dashboard could not be loaded. Use HTTPS or localhost, then try again.' : 'The dashboard data could not be displayed. Please contact Tyler.';
    } finally { button.disabled = false; }
  });
  $('platform-options').addEventListener('change', (event) => {
    if (event.target.type !== 'checkbox') return;
    const i = Number(event.target.value);
    event.target.checked ? selected.add(i) : selected.delete(i);
    chart();
  });
  $('chart-scale').addEventListener('change', () => { if (data) chart(); });
  $('select-all').addEventListener('click', () => choose(data.platforms.map((_,i) => i)));
  $('select-none').addEventListener('click', () => choose([]));
  $('lock-dashboard').addEventListener('click', () => {
    data = null; selected.clear();
    ['summary-cards','platform-options','traffic-chart','traffic-table','coverage-label','selection-status'].forEach((id) => { $(id).replaceChildren(); });
    $('select-top').onclick = null;
    $('dashboard').hidden = true;
    $('access-gate').hidden = false;
    $('access-screen').hidden = false;
    $('dashboard-password').focus();
  });
})();
