(function () {
  'use strict';
  const icon = window.CyberIcons;
  const games = [
    {id:'impostor', title:'Cyber Impostor', short:['Cyber','Impostor'], description:'Four messages. One doesn’t add up.', category:'OBSERVE · SOCIAL ENGINEERING', icon:'user', color:'#89a7ff', fill:'#253353'},
    {id:'risk', title:'Spot the Risk', short:['Spot','the Risk'], description:'The risk is hiding in the details.', category:'INVESTIGATE · PHISHING', icon:'search', color:'#77d8ce', fill:'#21474b'},
    {id:'timeline', title:'Cyber Timeline', short:['Cyber','Timeline'], description:'Trace the attack back to its source.', category:'RECONSTRUCT · THE ATTACK CHAIN', icon:'timeline', color:'#c6a2ff', fill:'#433355'},
    {id:'move', title:'Choose Your Move', short:['Choose','Your Move'], description:'One choice changes the story.', category:'DECIDE · DATA AND IDENTITY', icon:'split', color:'#ffad83', fill:'#573b34'},
    {id:'mfa', title:'MFA Reflex', short:['MFA','Reflex'], description:'Every sign-in deserves attention.', category:'REACT · AUTHENTICATION', icon:'bolt', color:'#f3d589', fill:'#504530'},
    {id:'classify', title:'Safe or Suspicious?', short:['Safe or','Suspicious?'], description:'Before you trust it, take a look.', category:'ASSESS · EVERYDAY CHOICES', icon:'eye', color:'#8dc6ff', fill:'#2e4563'},
    {id:'memory', title:'Cyber Memory', short:['Cyber','Memory'], description:'Match the risk to the right defence.', category:'CONNECT · GOOD HABITS', icon:'cards', color:'#eaa1c6', fill:'#513347'},
    {id:'drag', title:'Drag & Drop Security', short:['Drag & Drop','Security'], description:'The right move, in the right place.', category:'MATCH · SECURE BEHAVIOURS', icon:'drag', color:'#91d8aa', fill:'#284b3f'},
    {id:'unlock', title:'Unlock the Screen', short:['Unlock','the Screen'], description:'Three tasks. One screen to unlock.', category:'UNLOCK · A MINI MISSION', icon:'lock', color:'#ffa29c', fill:'#573438'},
  ];
  const $ = selector => document.querySelector(selector);
  const byId = id => games.find(game => game.id === id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {selected:[], results:[], round:0, phase:'wheel', spinning:false, rotation:0};
  let cleanup = null;
  let generation = 0;
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });

  function escape(text) {
    return String(text).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  }
  function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function save() {
    try { sessionStorage.setItem('cyberplay-session-en-v2', JSON.stringify({selected:state.selected, results:state.results, round:state.round, phase:state.phase})); } catch (_) { /* Offline storage may be unavailable. */ }
  }
  function restore() {
    try {
      const data = JSON.parse(sessionStorage.getItem('cyberplay-session-en-v2'));
      if (!data || !Array.isArray(data.selected) || data.selected.length > 3 || !data.selected.every(byId) || new Set(data.selected).size !== data.selected.length) return;
      if (!['wheel','game','results'].includes(data.phase)) return;
      if (data.phase !== 'wheel' && data.selected.length !== 3) return;
      if (!Number.isInteger(data.round) || data.round < 0 || data.round > 3 || !Array.isArray(data.results) || data.results.length !== data.round) return;
      if (data.phase === 'game' && data.round >= 3 || data.phase === 'results' && data.round !== 3) return;
      if (data.results.some((r,i) => r.id !== data.selected[i] || !Number.isFinite(r.percent) || r.percent < 0 || r.percent > 100 || typeof r.lesson !== 'string')) return;
      Object.assign(state, data);
      if (state.selected.length) state.rotation = (360 - games.findIndex(game => game.id === state.selected.at(-1)) * 40) % 360;
    } catch (_) { /* Start a new session if saved progress is unavailable. */ }
  }
  function point(radius, angle) {
    const radians = angle * Math.PI / 180;
    return [250 + radius * Math.cos(radians), 250 + radius * Math.sin(radians)];
  }
  function drawWheel() {
    $('#wheel').innerHTML = '<circle cx="250" cy="250" r="232" fill="#111d30" stroke="#6b7c9855" stroke-width="1.5"/><circle cx="250" cy="250" r="225" fill="#0a101c"/>' + games.map((game,index) => {
      const angle = -90 + index * 40;
      const [x1,y1] = point(221, angle - 20);
      const [x2,y2] = point(221, angle + 20);
      const [tx,ty] = point(177,angle);
      const rotate = -state.rotation;
      return `<g class="wheel-sector ${state.selected.includes(game.id) ? 'drawn' : ''}" data-sector="${game.id}"><path d="M250 250L${x1} ${y1}A221 221 0 0 1 ${x2} ${y2}Z" fill="${game.fill}"/><path d="M${x1} ${y1}A221 221 0 0 1 ${x2} ${y2}" stroke="${game.color}" style="stroke:${game.color};stroke-width:3;opacity:.6;fill:none"/><g transform="translate(${tx} ${ty}) rotate(${rotate})"><g class="sector-icon" transform="translate(-11 -37)" style="color:${game.color}">${icon(game.icon,22)}</g><text class="sector-title" text-anchor="middle"><tspan x="0" y="-4">${game.short[0]}</tspan><tspan x="0" y="13">${game.short[1]}</tspan></text></g></g>`;
    }).join('') + '<circle cx="250" cy="250" r="226" fill="none" stroke="#9db1cc33" stroke-width="1"/>';
  }
  function cardMarkup(game,index) {
    return `<span class="selection-number">0${index+1}</span><span class="selection-icon">${icon(game ? game.icon : 'lock')}</span><div><h3>${game ? game.title : ['Your first challenge awaits','Another spin, another game','Your journey is taking shape'][index]}</h3><p>${game ? game.description : 'Spin the wheel to reveal it'}</p></div>`;
  }
  function renderSelections(pending = -1) {
    $('#selection-list').innerHTML = [0,1,2].map(index => {
      const game = byId(state.selected[index]);
      return `<li class="selection-card ${game ? 'picked' : ''} ${pending === index ? 'card-pending' : ''}" ${game ? `style="--game-color:${game.color}"` : ''}>${cardMarkup(game,index)}</li>`;
    }).join('');
    $('#selection-count').innerHTML = `${state.selected.length}<span>/3</span>`;
    $('#spin-dots').setAttribute('aria-label', `${state.selected.length} of 3 games drawn`);
    [...$('#spin-dots').children].forEach((dot,index) => dot.classList.toggle('filled',index < state.selected.length));
    const ready = state.selected.length === 3 && !state.spinning;
    $('#start-button').disabled = !ready;
    $('#spin-button').disabled = state.spinning || state.selected.length === 3;
    $('#spin-center').disabled = state.spinning || state.selected.length === 3;
    $('#spin-center strong').textContent = state.selected.length === 3 ? 'READY' : 'SPIN';
    $('#spin-label').textContent = state.spinning ? 'The wheel is spinning…' : state.selected.length === 3 ? 'Journey ready' : state.selected.length === 0 ? 'Spin the wheel' : `Spin again · ${state.selected.length + 1}/3`;
    $('#ready-icon').innerHTML = icon(ready ? 'check' : 'lock');
    $('#ready-icon').style.color = ready ? 'var(--green)' : '';
    $('#ready-note').innerHTML = ready ? 'Your journey is ready.<br><span>Three challenges, in the order you drew them.</span>' : 'Draw three games to get started.<br><span>You’ll play them from top to bottom.</span>';
  }
  async function transferCard(game,index) {
    if (reducedMotion.matches) return;
    const source = $('#wheel-stage').getBoundingClientRect();
    const target = $('#selection-list').children[index].getBoundingClientRect();
    const flying = document.createElement('div');
    flying.className = 'flying-card';
    flying.style.cssText = `left:${target.left}px;top:${target.top}px;width:${target.width}px;min-height:${target.height}px;--game-color:${game.color}`;
    flying.innerHTML = cardMarkup(game,index);
    document.body.appendChild(flying);
    const dx = source.left + source.width / 2 - target.left - target.width / 2;
    const dy = source.top + source.height / 2 - target.top - target.height / 2;
    try {
      await flying.animate([{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.55)`},{opacity:1,offset:.15,transform:`translate(${dx*.85}px,${dy*.85}px) scale(.7)`},{opacity:1,transform:'translate(0,0) scale(1)'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'}).finished;
    } finally { flying.remove(); }
  }
  async function spin() {
    if (state.spinning || state.selected.length >= 3 || state.phase !== 'wheel') return;
    state.spinning = true;
    renderSelections();
    $('#spin-status').textContent = 'A new game is about to join your journey…';
    $('#wheel-stage').classList.add('spinning');
    const available = games.filter(game => !state.selected.includes(game.id));
    const random = new Uint32Array(1);
    let index;
    if (window.crypto && window.crypto.getRandomValues) {
      const limit = 2 ** 32 - (2 ** 32 % available.length);
      do { crypto.getRandomValues(random); } while (random[0] >= limit);
      index = random[0] % available.length;
    } else { index = Math.floor(Math.random() * available.length); }
    const game = available[index];
    const sector = games.findIndex(item => item.id === game.id);
    const currentMod = ((state.rotation % 360) + 360) % 360;
    const wantedMod = ((-sector * 40 % 360) + 360) % 360;
    const target = state.rotation + 360 * 5 + ((wantedMod - currentMod + 360) % 360);
    try {
      await $('#wheel').animate([{transform:`rotate(${state.rotation}deg)`},{transform:`rotate(${target}deg)`}],{duration:reducedMotion.matches ? 60 : 3100,easing:'cubic-bezier(.12,.72,.08,1)'}).finished;
      $('#wheel').style.transform = `rotate(${target}deg)`;
      state.rotation = target;
      $('#wheel-stage').classList.remove('spinning');
      state.selected.push(game.id);
      renderSelections(state.selected.length-1);
      $('#spin-status').textContent = `You drew ${game.title}.`;
      await transferCard(game,state.selected.length-1);
      state.spinning = false;
      renderSelections();
      drawWheel();
      save();
      $('#spin-status').textContent = state.selected.length === 3 ? 'Three games, one journey. Now press Start.' : `${game.title} has joined your journey. Spin again!`;
      $('#live-announcement').textContent = `Game ${state.selected.length} of 3: ${game.title}. ${state.selected.length === 3 ? 'The Start button is now available.' : 'You can spin again.'}`;
      // The native spin button becomes disabled after the last draw; move focus to the next action.
      if (state.selected.length === 3) $('#start-button').focus({preventScroll:true});
    } catch (error) {
      state.spinning = false;
      $('#wheel-stage').classList.remove('spinning');
      renderSelections();
      $('#spin-status').textContent = 'The spin was interrupted. Please try again.';
      console.error(error);
    }
  }
  function showScreen(phase) {
    state.phase = phase;
    for (const name of ['wheel','game','results']) $(`#${name}-screen`).hidden = name !== phase;
    window.scrollTo({top:0,behavior:'instant'});
  }
  function teardown() {
    generation++;
    if (cleanup) { cleanup(); cleanup = null; }
    $('#game-content').innerHTML = '';
  }
  function showGame() {
    teardown();
    const game = byId(state.selected[state.round]);
    showScreen('game');
    $('#game-title').textContent = game.title;
    $('#game-category').textContent = game.category;
    $('#game-heading-icon').innerHTML = icon(game.icon,32);
    $('#game-heading-icon').style.color = game.color;
    $('#game-step').textContent = `CHALLENGE 0${state.round+1} / 03`;
    $('#journey-progress').innerHTML = state.selected.map((_,i) => `<span class="progress-step ${i === state.round ? 'active' : i < state.round ? 'complete' : ''}" aria-label="Challenge ${i+1}: ${i === state.round ? 'in progress' : i < state.round ? 'completed' : 'up next'}"></span>`).join('');
    $('#game-path').innerHTML = state.selected.map((id,index) => `<li class="game-path-item ${index === state.round ? 'active' : index < state.round ? 'complete' : ''}"><span class="path-number">${index < state.round ? icon('check') : `0${index+1}`}</span><span><strong>${byId(id).title}</strong><small>${index === state.round ? 'Playing now' : index < state.round ? 'Challenge complete' : 'The next move'}</small></span></li>`).join('');
    const mountedGeneration = generation;
    let completed = false;
    const api = {
      icon, shuffle, reducedMotion:reducedMotion.matches,
      finish(result) {
        if (completed || mountedGeneration !== generation || state.phase !== 'game') return;
        if (!result || !Number.isFinite(result.score) || !Number.isFinite(result.maxScore) || result.maxScore <= 0) throw new Error('Invalid game result.');
        completed = true;
        state.results.push({id:game.id, percent:Math.round(Math.max(0,Math.min(1,result.score/result.maxScore))*100), lesson:String(result.lesson || 'Observe, check the source and follow company procedures.')});
        state.round++;
        if (state.round < 3) showGame(); else showResults();
        save();
      }
    };
    try {
      if (!window.CyberGames || !window.CyberGames[game.id]) throw new Error(`Game ${game.id} is unavailable.`);
      cleanup = window.CyberGames[game.id].mount($('#game-content'),api) || null;
    } catch (error) {
      $('#game-content').innerHTML = '<p class="error-message">This challenge could not be loaded. Check that the ZIP was fully extracted, then reload the page. Your journey is saved in this tab.</p>';
      console.error(error);
    }
    $('#game-title').focus({preventScroll:true});
  }
  function showResults() {
    teardown();
    showScreen('results');
    const percent = Math.round(state.results.reduce((sum,result) => sum+result.percent,0) / 3);
    $('#total-score').textContent = percent;
    $('#result-badge').textContent = percent >= 80 ? 'CYBER DEFENDER' : percent >= 50 ? 'CYBER EXPLORER' : 'CYBER STARTER';
    $('#result-caption').textContent = percent >= 80 ? 'You spotted the warning signs and chose carefully. Keep checking, even when everything looks normal.' : percent >= 50 ? 'You have good instincts. The tips below will help you make your next decision even safer.' : 'Every challenge is a chance to learn. Start with the warning signs and safe choices you’ve discovered.';
    $('#result-cards').innerHTML = state.results.map((result,index) => {
      const game = byId(result.id);
      return `<article class="result-card" style="--game-color:${game.color}"><div class="result-card-top"><span>${icon(game.icon)}</span><small>CHALLENGE 0${index+1}</small></div><h2>${game.title}</h2><p>${escape(result.lesson)}</p><div class="result-pct"><strong>${result.percent}%</strong> in this challenge</div></article>`;
    }).join('');
    $('#results-title').focus({preventScroll:true});
  }
  function reset() {
    if (state.spinning) return;
    teardown();
    Object.assign(state,{selected:[], results:[], round:0, phase:'wheel', spinning:false, rotation:0});
    $('#wheel').style.transform = 'rotate(0deg)';
    showScreen('wheel');
    drawWheel(); renderSelections(); save();
    $('#spin-status').textContent = 'Your first challenge is one spin away.';
    $('#spin-button').focus({preventScroll:true});
  }
  $('#spin-button').addEventListener('click',spin);
  $('#spin-center').addEventListener('click',spin);
  $('#start-button').addEventListener('click',() => {
    if (state.selected.length !== 3 || state.spinning) return;
    showGame(); save();
  });
  $('#help-button').addEventListener('click',() => $('#help-dialog').showModal());
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click',() => button.closest('dialog').close()));
  $('#exit-game').addEventListener('click',() => $('#exit-dialog').showModal());
  $('#confirm-exit').addEventListener('click',() => { $('#exit-dialog').close(); reset(); });
  $('#play-again').addEventListener('click',reset);
  $('#brand-home').addEventListener('click',event => {
    event.preventDefault();
    if (state.spinning) return;
    if (state.selected.length > 0 && state.phase !== 'results') $('#exit-dialog').showModal(); else reset();
  });
  restore();
  $('#wheel').style.transform = `rotate(${state.rotation}deg)`;
  drawWheel(); renderSelections();
  if (state.phase === 'game') showGame();
  else if (state.phase === 'results') showResults();
  else if (state.selected.length === 3) $('#spin-status').textContent = 'Your journey is ready. Press Start.';
  else if (state.selected.length > 0) $('#spin-status').textContent = 'Your journey is saved. Spin again!';
})();
