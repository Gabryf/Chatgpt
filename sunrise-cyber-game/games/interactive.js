(function () {
  'use strict';

  window.CyberGames = window.CyberGames || {};

  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const icon = (api, name, size = 24) => api.icon(name, size);
  const shuffle = (api, list) => api.shuffle(list.slice());

  function feedback(node, message, type = '') {
    node.className = 'feedback int-feedback' + (type ? ' ' + type : '');
    node.textContent = message;
  }

  const pairs = [
    { id: 'mfa', icon: 'phone', risk: 'An MFA request you did not initiate', action: 'Deny and report', explanation: 'An unexpected sign-in request should be denied and reported through your company IT channel.' },
    { id: 'qr', icon: 'search', risk: 'A QR code from an unknown source', action: 'Check the source and destination', explanation: 'A QR code hides its destination: check its source and where it leads before continuing.' },
    { id: 'usb', icon: 'file', risk: 'A USB drive you found', action: 'Do not plug it in. Tell IT', explanation: 'An unknown USB drive may contain malware. Do not connect it to your computer.' },
    { id: 'ai', icon: 'shield', risk: 'Confidential data in public AI', action: 'Use only authorised tools', explanation: 'Data classification and company policies determine which AI tools you can use.' }
  ];

  window.CyberGames.memory = {
    mount(container, api) {
      let disposed = false;
      let first = null;
      let busy = false;
      let mistakes = 0;
      let matched = 0;
      let finished = false;
      const timers = new Set();
      const cards = shuffle(api, pairs.flatMap((pair) => [
        { ...pair, kind: 'risk', label: pair.risk },
        { ...pair, kind: 'action', label: pair.action }
      ]));

      container.innerHTML = `
        <div class="game-intro"><p class="eyebrow">MATCH THE RISK TO THE RIGHT ACTION</p><h2>Cyber Memory</h2><p>Turn over two cards at a time. Find all 4 pairs: each situation has a safe response.</p></div>
        <div class="int-game-meta"><span>${icon(api, 'search', 18)} <strong data-memory-count>0 / 4 pairs</strong></span><span data-memory-attempts>0 attempts</span></div>
        <div class="int-memory-grid" aria-label="Memory cards">${cards.map((card, index) => `
          <button type="button" class="int-memory-card" data-card-index="${index}" data-pair="${card.id}" data-kind="${card.kind}" data-testid="memory-card-${card.id}-${card.kind}" aria-label="Card ${index + 1}, face down" aria-pressed="false">
            <span class="int-memory-flipper">
              <span class="int-memory-back" aria-hidden="true">${icon(api, 'shield', 28)}<span>CYBER<br>MEMORY</span><small>TURN THE CARD</small></span>
              <span class="int-memory-front" aria-hidden="true"><small>${card.kind === 'risk' ? 'SITUATION' : 'SAFE ACTION'}</small><span class="int-card-icon">${icon(api, card.icon, 25)}</span><strong>${escape(card.label)}</strong><span class="int-match-check">${icon(api, 'check', 16)}</span></span>
            </span>
          </button>`).join('')}</div>
        <p class="feedback int-feedback" role="status" aria-live="polite" data-memory-feedback>Match each situation card with its safe action card.</p>
        <div class="int-memory-end" data-memory-end hidden></div>`;

      const board = container.querySelector('.int-memory-grid');
      const status = container.querySelector('[data-memory-feedback]');
      const count = container.querySelector('[data-memory-count]');
      const attempts = container.querySelector('[data-memory-attempts]');
      const end = container.querySelector('[data-memory-end]');
      let turns = 0;

      function reveal(button, card) {
        button.classList.add('int-revealed');
        button.setAttribute('aria-pressed', 'true');
        button.setAttribute('aria-label', `${card.kind === 'risk' ? 'Situation' : 'Safe action'}: ${card.label}`);
      }

      function cover(button) {
        button.classList.remove('int-revealed');
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', `Card ${Number(button.dataset.cardIndex) + 1}, face down`);
      }

      function onClick(event) {
        const finishButton = event.target.closest('[data-memory-finish]');
        if (finishButton && !finished) {
          finished = true;
          api.finish({ score: Math.max(60, 100 - mistakes * 5), maxScore: 100, lesson: 'Recognising a risk is the first step. Follow it with a safe action: verify, deny or report through company channels.' });
          return;
        }
        const button = event.target.closest('[data-card-index]');
        if (!button || !board.contains(button) || busy || button.disabled || button === first?.button || disposed) return;
        const card = cards[Number(button.dataset.cardIndex)];
        reveal(button, card);
        if (!first) {
          first = { button, card };
          feedback(status, 'Now find the card that completes this pair.');
          return;
        }

        turns += 1;
        attempts.textContent = `${turns} ${turns === 1 ? 'attempt' : 'attempts'}`;
        const previous = first;
        first = null;
        if (previous.card.id === card.id && previous.card.kind !== card.kind) {
          matched += 1;
          [button, previous.button].forEach((matchedButton) => {
            matchedButton.classList.add('int-matched');
            matchedButton.disabled = true;
            matchedButton.setAttribute('aria-label', matchedButton.getAttribute('aria-label') + ', pair found');
          });
          count.textContent = `${matched} / 4 pairs`;
          feedback(status, card.explanation, 'success');
          if (matched === 4) {
            end.hidden = false;
            end.innerHTML = `<div class="int-complete-badge">${icon(api, 'check', 22)}<div><strong>All 4 pairs are matched.</strong><p>Make these safe choices part of your everyday habits.</p></div></div><button type="button" class="button button-primary" data-memory-finish data-testid="memory-finish">Finish game ${icon(api, 'arrow', 18)}</button>`;
          }
        } else {
          mistakes += 1;
          busy = true;
          feedback(status, 'These cards do not make a pair. Remember their positions and try again: each risk has its own safe action.');
          const timer = setTimeout(() => {
            timers.delete(timer);
            if (disposed) return;
            cover(previous.button);
            cover(button);
            busy = false;
          }, 1300);
          timers.add(timer);
        }
      }

      container.addEventListener('click', onClick);
      return () => {
        disposed = true;
        timers.forEach(clearTimeout);
        container.removeEventListener('click', onClick);
      };
    }
  };

  const situations = [
    { id: 'wifi', icon: 'wifi', title: 'Public Wi-Fi', detail: 'At the airport, you need to open a confidential company document.', action: 'Verify the network. Use a hotspot or company VPN.', hint: 'Verify a public network through an official source and use a protected connection in line with company policy.', matched: 'Network verified and connection protected.' },
    { id: 'mfa', icon: 'phone', title: 'Unexpected MFA', detail: 'Your phone asks you to approve a sign-in you did not initiate.', action: 'Deny the request and report it to IT.', hint: 'Do not approve an unexpected MFA request: deny it and report it through your company channel.', matched: 'Request denied and IT informed.' },
    { id: 'usb', icon: 'file', title: 'Found USB drive', detail: 'An unclaimed USB drive has been left in a meeting room.', action: 'Do not plug it in. Hand it to IT.', hint: 'Do not test an unknown USB drive on your computer. Hand it to IT without connecting it.', matched: 'USB isolated without putting the computer at risk.' },
    { id: 'ai', icon: 'shield', title: 'Confidential document + AI', detail: 'A colleague wants to summarise client data using a public AI tool.', action: 'Use only AI approved for this data.', hint: 'Confidential data requires a tool authorised for that classification, in line with company policies.', matched: 'Data handled only with authorised tools.' }
  ];

  window.CyberGames.drag = {
    mount(container, api) {
      const done = new Set();
      const attempted = new Set();
      let selected = null;
      let finished = false;
      let dragging = null;
      let score = 0;
      const actions = shuffle(api, situations);

      container.innerHTML = `
        <div class="game-intro"><p class="eyebrow">ONE SITUATION. THE RIGHT ACTION.</p><h2>Drag &amp; Drop Security</h2><p>Match all 4 situations with a safe response. Drag an action, or select it and then tap the situation.</p></div>
        <div class="int-game-meta"><span>${icon(api, 'shield', 18)} <strong data-drag-count>0 / 4 situations protected</strong></span><span>Also works with Tab and Enter</span></div>
        <div class="int-drag-board">
          <section class="int-drag-situations" aria-label="Situations to protect"><h3>The situations</h3>${situations.map((item, index) => `
            <button type="button" class="int-drop-target" data-target="${item.id}" data-testid="drag-target-${item.id}" aria-label="Situation ${index + 1}: ${escape(item.title)}. ${escape(item.detail)}">
              <span class="int-situation-top"><span class="int-card-icon">${icon(api, item.icon, 23)}</span><span class="int-situation-number">0${index + 1}</span></span>
              <strong>${escape(item.title)}</strong><span class="int-situation-detail">${escape(item.detail)}</span><span class="int-drop-slot">${icon(api, 'arrow', 17)} Match a safe action</span>
            </button>`).join('')}</section>
          <section class="int-drag-actions" aria-label="Safe actions"><h3>Your actions</h3><p class="int-drag-help">Choose an action, then a situation.</p>${actions.map((item) => `
            <button type="button" class="int-drag-action" draggable="true" data-action-id="${item.id}" data-testid="drag-action-${item.id}" aria-pressed="false">
              <span class="int-drag-grip" aria-hidden="true">⠿</span><span>${escape(item.action)}</span><span class="int-action-check">${icon(api, 'check', 18)}</span>
            </button>`).join('')}</section>
        </div>
        <p class="feedback int-feedback" role="status" aria-live="polite" data-drag-feedback>Four simple actions can stop four everyday risks.</p>
        <div data-drag-end hidden></div>`;

      const status = container.querySelector('[data-drag-feedback]');
      const count = container.querySelector('[data-drag-count]');
      const end = container.querySelector('[data-drag-end]');

      function setSelected(id) {
        selected = id;
        container.querySelectorAll('[data-action-id]').forEach((button) => {
          const isSelected = button.dataset.actionId === id;
          button.classList.toggle('int-selected', isSelected);
          button.setAttribute('aria-pressed', String(isSelected));
        });
      }

      function match(targetId, actionId) {
        if (done.has(targetId) || done.has(actionId)) return;
        const situation = situations.find((item) => item.id === targetId);
        const action = situations.find((item) => item.id === actionId);
        if (!situation || !action) return;
        if (targetId !== actionId) {
          attempted.add(targetId);
          feedback(status, `This is not the right match. ${situation.hint}`, 'danger');
          const target = container.querySelector(`[data-target="${targetId}"]`);
          target.classList.remove('int-mismatch');
          void target.offsetWidth;
          target.classList.add('int-mismatch');
          return;
        }
        done.add(targetId);
        score += attempted.has(targetId) ? 20 : 25;
        const target = container.querySelector(`[data-target="${targetId}"]`);
        const button = container.querySelector(`[data-action-id="${actionId}"]`);
        target.classList.add('int-target-matched');
        target.disabled = true;
        target.setAttribute('aria-label', `${situation.title}: ${situation.matched}`);
        target.querySelector('.int-drop-slot').innerHTML = `${icon(api, 'check', 17)} <span>${escape(action.action)}</span>`;
        button.classList.add('int-action-used');
        button.disabled = true;
        button.draggable = false;
        button.setAttribute('aria-label', `${action.action}, match completed`);
        setSelected(null);
        count.textContent = `${done.size} / 4 situations protected`;
        feedback(status, `${situation.title}: ${situation.matched}`, 'success');
        if (done.size === 4) {
          end.hidden = false;
          end.innerHTML = `<div class="int-complete-badge">${icon(api, 'shield', 23)}<div><strong>You have protected every situation.</strong><p>If in doubt, pause and check through your company channel.</p></div></div><button type="button" class="button button-primary" data-drag-finish data-testid="drag-finish">Finish game ${icon(api, 'arrow', 18)}</button>`;
        }
      }

      function onClick(event) {
        if (event.target.closest('[data-drag-finish]') && !finished) {
          finished = true;
          api.finish({ score, maxScore: 100, lesson: 'The safe action depends on the situation: protect your connection, deny unexpected sign-ins, avoid unknown USB drives and use only AI authorised for the data.' });
          return;
        }
        const action = event.target.closest('[data-action-id]');
        if (action && !action.disabled) {
          setSelected(selected === action.dataset.actionId ? null : action.dataset.actionId);
          feedback(status, selected ? `Action selected: ${situations.find((item) => item.id === selected).action} Now choose the situation.` : 'Selection cleared. You can choose another action.');
          return;
        }
        const target = event.target.closest('[data-target]');
        if (target && !target.disabled) {
          if (selected) match(target.dataset.target, selected);
          else feedback(status, 'First select an action from the action cards, then choose this situation.');
        }
      }

      function onDragStart(event) {
        const action = event.target.closest('[data-action-id]');
        if (!action || action.disabled) return;
        dragging = action.dataset.actionId;
        setSelected(dragging);
        if (event.dataTransfer) {
          event.dataTransfer.setData('text/plain', dragging);
          event.dataTransfer.effectAllowed = 'move';
        }
        action.classList.add('int-dragging');
      }

      function onDragOver(event) {
        const target = event.target.closest('[data-target]');
        if (!target || target.disabled) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        target.classList.add('int-drag-over');
      }

      function onDragLeave(event) {
        const target = event.target.closest('[data-target]');
        if (target && !target.contains(event.relatedTarget)) target.classList.remove('int-drag-over');
      }

      function clearDragging() {
        dragging = null;
        container.querySelectorAll('.int-dragging,.int-drag-over').forEach((node) => node.classList.remove('int-dragging', 'int-drag-over'));
      }

      function onDrop(event) {
        const target = event.target.closest('[data-target]');
        if (!target || target.disabled) return;
        event.preventDefault();
        const id = dragging || (event.dataTransfer && event.dataTransfer.getData('text/plain'));
        clearDragging();
        if (id) match(target.dataset.target, id);
      }

      const handlers = { click: onClick, dragstart: onDragStart, dragover: onDragOver, dragleave: onDragLeave, drop: onDrop, dragend: clearDragging };
      Object.entries(handlers).forEach(([type, handler]) => container.addEventListener(type, handler));
      return () => Object.entries(handlers).forEach(([type, handler]) => container.removeEventListener(type, handler));
    }
  };

  const chain = [
    { id: 'message', title: 'A fake text message arrives', detail: '“Verify your company account now.”', icon: 'mail' },
    { id: 'site', title: 'A lookalike website opens', detail: 'The link leads to a fake sign-in page.', icon: 'search' },
    { id: 'credentials', title: 'Credentials are entered', detail: 'The website captures the sign-in details.', icon: 'lock' },
    { id: 'mfa', title: 'An unexpected MFA request appears', detail: 'The attacker tries to sign in using the stolen details.', icon: 'phone' }
  ];

  window.CyberGames.unlock = {
    mount(container, api) {
      let stage = 0;
      let solved = false;
      let finished = false;
      let score = 0;
      const attempted = [false, false, false];
      let order = shuffle(api, chain);
      if (order.every((item, index) => item.id === chain[index].id)) order = [order[1], order[0], order[3], order[2]];

      function render() {
        container.innerHTML = `
          <div class="game-intro"><p class="eyebrow">THREE CHALLENGES. A SAFER SIGN-IN.</p><h2>Unlock the Screen</h2><p>Unlock the computer by completing three mini challenges. Each choice reveals part of the attack chain.</p></div>
          <div class="int-unlock-layout">
            <aside class="int-lock-panel ${stage === 2 && solved ? 'int-unlocked' : ''}" aria-label="Computer status">
              <div class="int-lock-orbit">${icon(api, stage === 2 && solved ? 'shield' : 'lock', 36)}</div>
              <span class="int-lock-time">09:41</span><strong>${stage === 2 && solved ? 'Access protected' : 'Session locked'}</strong><p>${stage === 2 && solved ? 'You have completed every check.' : 'Unlock better security one choice at a time.'}</p>
              <ol class="int-unlock-steps">${['Spot the anomaly', 'Choose your move', 'Rebuild the attack chain'].map((label, index) => `<li class="${index < stage || index === stage && solved ? 'int-step-complete' : index === stage ? 'int-step-current' : ''}"><span>${index < stage || index === stage && solved ? icon(api, 'check', 15) : index + 1}</span><strong>${label}</strong></li>`).join('')}</ol>
            </aside>
            <section class="int-unlock-challenge" aria-label="Challenge ${stage + 1}"><div class="int-challenge-label">CHALLENGE 0${stage + 1} <span>/ 03</span></div>${stage === 0 ? anomaly() : stage === 1 ? move() : timeline()}
              <p class="feedback int-feedback" role="status" aria-live="polite" data-unlock-feedback>${solved ? solvedMessage() : 'Look at the details before making your choice.'}</p>
              ${solved ? `<button type="button" class="button button-primary int-next-proof" data-unlock-next data-testid="unlock-next">${stage === 2 ? 'Unlock and finish' : `Go to challenge ${stage + 2}`} ${icon(api, 'arrow', 18)}</button>` : ''}
            </section>
          </div>`;
        if (solved) container.querySelector('[data-unlock-feedback]').classList.add('success');
      }

      function anomaly() {
        return `<h3>Spot the anomaly</h3><p class="int-proof-instruction">A notification asks you to check your account. Which detail needs verification?</p>
          <div class="int-mail-window"><div class="int-window-bar"><span></span><span></span><span></span><strong>NOTIFICATION · SIMULATION</strong></div><div class="int-mail-body">
            <div class="int-mail-app">${icon(api, 'mail', 22)}<strong>Microsoft 365</strong></div><h4>Check your account</h4><p>Please verify your company account.</p>
            <button type="button" class="int-detail-hotspot ${solved ? 'int-hotspot-correct' : ''}" data-unlock-answer="sender" data-testid="unlock-anomaly-sender" ${solved ? 'disabled' : ''}><small>SENDER</small><strong>support@sunrise-verify.example</strong><span>${icon(api, 'search', 17)}</span></button>
            <div class="int-mail-details"><button type="button" class="int-detail-hotspot" data-unlock-answer="time" data-testid="unlock-anomaly-time" ${solved ? 'disabled' : ''}><small>TIME</small><strong>08:42</strong></button><button type="button" class="int-detail-hotspot" data-unlock-answer="logo" data-testid="unlock-anomaly-logo" ${solved ? 'disabled' : ''}><small>APPEARANCE</small><strong>Microsoft 365 logo</strong></button></div>
            <p class="int-simulation-note">Fictional message. No link opens an external page.</p>
          </div></div>`;
      }

      function move() {
        return `<h3>Choose your move</h3><p class="int-proof-instruction">You have not started a sign-in, but you have already received 5 MFA requests.</p>
          <div class="int-mfa-banner"><span class="int-card-icon">${icon(api, 'phone', 27)}</span><div><small>SIGN-IN REQUEST</small><strong>Approve this sign-in?</strong><p>New device · unknown location</p></div><span class="int-mfa-count">×5</span></div>
          <div class="int-move-options">${[
            ['approve', 'Approve to stop the notifications', 'Acting in a hurry can help someone trying to access your account.'],
            ['ignore', 'Ignore them and keep working', 'The potential attack remains unreported.'],
            ['report', 'Deny and report through the company IT channel', 'Block the request and tell the team that can investigate.']
          ].map(([id, title, detail]) => `<button type="button" class="int-move-option ${solved && id === 'report' ? 'int-choice-correct' : ''}" data-unlock-answer="${id}" data-testid="unlock-move-${id}" ${solved ? 'disabled' : ''}><span class="int-option-dot">${solved && id === 'report' ? icon(api, 'check', 16) : ''}</span><span><strong>${title}</strong><small>${detail}</small></span></button>`).join('')}</div>`;
      }

      function timeline() {
        return `<h3>Rebuild the attack chain</h3><p class="int-proof-instruction">Where did the attack start? Put the events in order using the arrows, then check the sequence.</p><ol class="int-timeline-order" aria-label="Sequence of events">${order.map((item, index) => `
          <li data-event-id="${item.id}"><span class="int-event-number">${index + 1}</span><span class="int-event-icon">${icon(api, item.icon, 19)}</span><div><strong>${item.title}</strong><p>${item.detail}</p></div><span class="int-order-controls"><button type="button" data-order-index="${index}" data-order-direction="up" data-testid="unlock-order-${item.id}-up" aria-label="Move ${escape(item.title)} up" ${solved || index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-order-index="${index}" data-order-direction="down" data-testid="unlock-order-${item.id}-down" aria-label="Move ${escape(item.title)} down" ${solved || index === order.length - 1 ? 'disabled' : ''}>↓</button></span></li>`).join('')}</ol>${!solved ? '<button type="button" class="button button-secondary int-verify-order" data-unlock-verify data-testid="unlock-verify">Check the sequence</button>' : ''}`;
      }

      function solvedMessage() {
        if (stage === 0) return 'The domain imitates Sunrise. A logo does not prove authenticity: verify through a known portal or contact and report the suspicious message.';
        if (stage === 1) return 'The request has been denied. Reporting lets IT investigate the attempt and help protect your account.';
        return 'It starts with the fake message. The website captures credentials and the attacker tries to sign in. Stop the chain as early as possible; deny and report unexpected MFA requests too.';
      }

      function solve() {
        if (solved) return;
        solved = true;
        score += [35, 35, 30][stage] - (attempted[stage] ? 10 : 0);
        render();
        container.querySelector('[data-unlock-next]').focus({ preventScroll: true });
      }

      function onClick(event) {
        const next = event.target.closest('[data-unlock-next]');
        if (next && solved) {
          if (stage === 2 && !finished) {
            finished = true;
            api.finish({ score, maxScore: 100, lesson: 'An attack often starts with a message. Verify the source, deny and report unexpected MFA requests, and recognise the chain before it is complete.' });
          } else if (stage < 2) {
            stage += 1;
            solved = false;
            render();
          }
          return;
        }
        const answer = event.target.closest('[data-unlock-answer]');
        if (answer && !solved) {
          const value = answer.dataset.unlockAnswer;
          if (stage === 0 && value === 'sender' || stage === 1 && value === 'report') solve();
          else {
            attempted[stage] = true;
            const message = stage === 0
              ? value === 'logo' ? 'A logo can be copied and does not prove who sent the message. Look at the sender domain.' : 'The time does not prove a notification is genuine. Check the sender domain.'
              : value === 'approve' ? 'Approving could let someone who has your credentials into your account. Try again: you can still block the request.' : 'Ignoring the requests does not help IT investigate. Deny them and report through your company channel.';
            feedback(container.querySelector('[data-unlock-feedback]'), message, 'danger');
          }
          return;
        }
        const orderButton = event.target.closest('[data-order-index]');
        if (orderButton && stage === 2 && !solved && !orderButton.disabled) {
          const index = Number(orderButton.dataset.orderIndex);
          const direction = orderButton.dataset.orderDirection;
          const destination = index + (direction === 'up' ? -1 : 1);
          if (destination < 0 || destination >= order.length) return;
          const movedId = order[index].id;
          [order[index], order[destination]] = [order[destination], order[index]];
          render();
          const sameDirection = container.querySelector(`[data-testid="unlock-order-${movedId}-${direction}"]`);
          const otherDirection = container.querySelector(`[data-testid="unlock-order-${movedId}-${direction === 'up' ? 'down' : 'up'}"]`);
          (sameDirection && !sameDirection.disabled ? sameDirection : otherDirection).focus({ preventScroll: true });
          feedback(container.querySelector('[data-unlock-feedback]'), `${order[destination].title}: position ${destination + 1}. Check when the sequence is ready.`);
          return;
        }
        if (event.target.closest('[data-unlock-verify]') && stage === 2 && !solved) {
          if (order.every((item, index) => item.id === chain[index].id)) solve();
          else {
            attempted[stage] = true;
            feedback(container.querySelector('[data-unlock-feedback]'), 'The sequence is not correct yet. Start with the text message: the link leads to the fake website, credentials are stolen, and then the MFA request appears. Reorder and try again.', 'danger');
          }
        }
      }

      render();
      container.addEventListener('click', onClick);
      return () => container.removeEventListener('click', onClick);
    }
  };
})();
