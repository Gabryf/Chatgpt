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
    { id: 'message', title: 'A lookalike email arrives', detail: 'support@rnicrosoft.com asks Mark to verify his account.', icon: 'mail' },
    { id: 'site', title: 'The link opens a fake sign-in page', detail: 'The email points to account.rnicrosoft.com/verify.', icon: 'search' },
    { id: 'credentials', title: 'The fake page captures credentials', detail: 'Sign-in details entered on the imitation page are stolen.', icon: 'lock' },
    { id: 'mfa', title: 'A mismatched MFA request appears', detail: 'Exchange Online on a new Android phone. The user denies and reports it.', icon: 'phone' }
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
          <div class="int-unlock-layout ${stage === 0 ? 'int-outlook-stage' : ''}">
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
        const disabled = solved ? 'disabled' : '';
        const headerHTML = `<div class="det-email-header">
          <span class="det-mail-avatar" aria-hidden="true">M</span>
          <div class="det-email-sender"><strong>Microsoft 365 · Account support</strong>
            <button type="button" class="det-hotspot det-email-address int-detail-hotspot ${solved ? 'det-hotspot-correct' : ''}" data-unlock-answer="sender" data-testid="unlock-anomaly-sender" aria-label="Inspect the sender’s domain" ${disabled}>support@rnicrosoft.com</button>
            <span>To: mark.webber@sunrise.net</span>
          </div>
          <button type="button" class="det-hotspot det-email-date int-detail-hotspot" data-unlock-answer="time" data-testid="unlock-anomaly-time" aria-label="Inspect the email’s sending time" ${disabled}>Today, 08:42</button>
        </div>`;
        const body = `<button type="button" class="det-hotspot int-detail-hotspot int-brand-detail" data-unlock-answer="logo" data-testid="unlock-anomaly-logo" aria-label="Inspect the Microsoft logo" ${disabled}>${window.CyberScreens.microsoftBrand()}</button>
          <h4>Keep your account active</h4>
          <p>Dear Mark,</p>
          <p>Please verify your Microsoft 365 sign-in details today to keep your email access active.</p>
          <p>Complete the account check:</p>
          <p><button type="button" class="det-hotspot int-unlock-phishing-link" data-unlock-inspect-link data-testid="unlock-anomaly-link" aria-label="Inspect the verification link without opening it" ${disabled}>https://account.rnicrosoft.com/verify</button></p>
          <p>Kind regards,<br>Microsoft 365 Account support</p>`;
        return `<h3>Spot the anomaly</h3><p class="int-proof-instruction">An email asks you to check your account. Which detail needs verification? Click or tap a detail to investigate.</p>${window.CyberScreens.outlook({
          subject: 'Microsoft 365 account verification',
          senderName: 'Microsoft 365 · Account support',
          from: 'support@rnicrosoft.com',
          recipient: 'mark.webber@sunrise.net',
          date: 'Today, 08:42',
          headerHTML,
          body
        })}${solved ? domainZoom() : ''}`;
      }

      function domainZoom() {
        return `<section class="int-domain-zoom" data-testid="unlock-domain-zoom" aria-label="Magnified sender domain comparison">
          <div class="int-domain-zoom-heading">${icon(api, 'search', 21)}<h4>A closer look at the sender</h4></div>
          <div class="int-domain-comparison">
            <div class="int-domain-example int-domain-lookalike"><small>LOOKALIKE DOMAIN</small><p class="int-zoom-domain" aria-label="@rnicrosoft.com">@<span class="int-domain-substitution" data-testid="unlock-domain-substitution">rn</span>icrosoft.com</p><span class="int-domain-annotation">The red box contains <strong>r + n</strong>.</span></div>
            <div class="int-domain-example int-domain-official"><small>MICROSOFT DOMAIN</small><p class="int-zoom-domain">@microsoft.com</p><span class="int-domain-annotation">The first letter is a single <strong>m</strong>.</span></div>
          </div>
          <p class="int-domain-explanation">Two ordinary letters, <strong>r + n</strong>, imitate an <strong>m</strong>. The addresses can look similar at a glance, but they are different domains. Open your usual portal or check with a known IT contact before trusting a request.</p>
        </section>`;
      }

      function move() {
        return `<h3>Choose your move</h3><p class="int-proof-instruction">You are signing in to your company portal. A prompt appears on your phone. Check whether its service and device match the sign-in you started.</p>
          <div class="int-login-context" data-testid="unlock-login-context"><span>${icon(api, 'lock', 21)}</span><div><small>THE SIGN-IN YOU STARTED</small><strong>Sunrise Company Portal</strong><p>Your usual Windows PC · Windows 11</p></div></div>
          <div class="int-mfa-phone"><div class="int-phone-status"><span>09:41</span><span>${icon(api, 'wifi', 13)}${icon(api, 'bolt', 12)}</span></div><div class="int-authenticator-app">${icon(api, 'shield', 21)}<strong>Microsoft Authenticator</strong></div>
            <article class="int-phone-request" data-testid="unlock-mfa-notification"><small>SIGN-IN REQUEST</small><h4>Approve sign-in?</h4><p>Check these details before responding.</p><dl><div><dt>Service</dt><dd>Exchange Online</dd></div><div><dt>Device</dt><dd>Android phone <span class="int-phone-new-device">NEW DEVICE</span></dd></div><div><dt>Account</dt><dd>mark.webber@sunrise.net</dd></div></dl><span class="int-phone-request-time">Request received just now</span></article>
            <span class="int-phone-home" aria-hidden="true"></span>
          </div>
          <div class="int-move-options">${[
            ['approve', 'Approve because I am signing in', 'Use this request to finish my current sign-in.'],
            ['ignore', 'Ignore it and try signing in again', 'Leave this request unanswered.'],
            ['report', 'Deny and report the mismatched request', 'Verify the attempt through the company IT channel.']
          ].map(([id, title, detail]) => `<button type="button" class="int-move-option ${solved && id === 'report' ? 'int-choice-correct' : ''}" data-unlock-answer="${id}" data-testid="unlock-move-${id}" ${solved ? 'disabled' : ''}><span class="int-option-dot">${solved && id === 'report' ? icon(api, 'check', 16) : ''}</span><span><strong>${title}</strong><small>${detail}</small></span></button>`).join('')}</div>`;
      }

      function timeline() {
        return `<h3>Rebuild the attack chain</h3><p class="int-proof-instruction">Reconstruct how the email could lead to a mismatched request. Put the events in order; the final MFA is denied and reported.</p><ol class="int-timeline-order" aria-label="Sequence of events">${order.map((item, index) => `
          <li data-event-id="${item.id}"><span class="int-event-number">${index + 1}</span><span class="int-event-icon">${icon(api, item.icon, 19)}</span><div><strong>${item.title}</strong><p>${item.detail}</p></div><span class="int-order-controls"><button type="button" data-order-index="${index}" data-order-direction="up" data-testid="unlock-order-${item.id}-up" aria-label="Move ${escape(item.title)} up" ${solved || index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-order-index="${index}" data-order-direction="down" data-testid="unlock-order-${item.id}-down" aria-label="Move ${escape(item.title)} down" ${solved || index === order.length - 1 ? 'disabled' : ''}>↓</button></span></li>`).join('')}</ol>${!solved ? '<button type="button" class="button button-secondary int-verify-order" data-unlock-verify data-testid="unlock-verify">Check the sequence</button>' : ''}`;
      }

      function solvedMessage() {
        if (stage === 0) return 'rnicrosoft.com replaces the first m in microsoft.com with r + n. The link uses the same lookalike domain. Verify through a known portal and report the email.';
        if (stage === 1) return 'You denied the Exchange Online request from a new Android phone. It does not match Sunrise Company Portal on your usual Windows PC. Report the attempt, even though your own sign-in is in progress.';
        return 'If the email were trusted, the fake page could steal credentials and trigger Exchange Online access from a new Android phone. You blocked the mismatched request. Report both the suspicious email and the MFA attempt.';
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
            api.finish({ score, maxScore: 100, lesson: 'Inspect lookalike domains and match every MFA request to the service and device you actually used. Deny and report mismatches, even during your own sign-in.' });
          } else if (stage < 2) {
            stage += 1;
            solved = false;
            render();
          }
          return;
        }
        const inspectedLink = event.target.closest('[data-unlock-inspect-link]');
        if (inspectedLink && stage === 0 && !solved) {
          event.preventDefault();
          feedback(container.querySelector('[data-unlock-feedback]'), 'The destination uses account.rnicrosoft.com, which resembles a Microsoft address and deserves checking. Nothing was opened. Compare the sender domain to confirm the clue.');
          return;
        }
        const answer = event.target.closest('[data-unlock-answer]');
        if (answer && !solved) {
          const value = answer.dataset.unlockAnswer;
          if (stage === 0 && value === 'sender' || stage === 1 && value === 'report') solve();
          else {
            attempted[stage] = true;
            if (stage === 0) answer.classList.add('det-hotspot-wrong');
            const message = stage === 0
              ? value === 'logo' ? 'A logo can be copied and does not prove who sent the message. Look at the sender domain.' : 'The time does not prove an email is genuine. Check the sender domain.'
              : value === 'approve' ? 'Your portal sign-in does not match Exchange Online on a new Android phone. Approving could authorise someone else’s request. Deny it and report the mismatch.' : 'Ignoring leaves the suspicious request unreported. Its service and device differ from your own sign-in. Deny it and report through your company IT channel.';
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
            feedback(container.querySelector('[data-unlock-feedback]'), 'The sequence is not correct yet. Start with the lookalike email, then its fake sign-in page and stolen credentials. Finally, the mismatched MFA request is denied and reported. Reorder and try again.', 'danger');
          }
        }
      }

      render();
      container.addEventListener('click', onClick);
      return () => container.removeEventListener('click', onClick);
    }
  };
})();
