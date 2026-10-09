(function () {
  'use strict';

  window.CyberGames = window.CyberGames || {};
  const ico = (api, name, size = 20) => api.icon(name, size);
  const intro = (label, title, copy) => `<div class="game-intro"><span class="eyebrow">${label}</span><h2>${title}</h2><p>${copy}</p></div>`;
  const progress = (current, total, score) => `<div class="dec-progress"><span>Scenario ${current} <span class="dec-dim">/ ${total}</span></span><span class="dec-score">${score} points</span></div>`;
  const feedback = (right, title, copy, cta, action = 'next') => `<section class="feedback ${right ? 'success' : 'danger'} dec-feedback" aria-live="polite"><div class="dec-feedback-icon">${right ? '✓' : '!'}</div><div><h3>${title}</h3><p>${copy}</p><button class="button ${right ? 'button-primary' : 'button-secondary'}" data-dec-action="${action}">${cta}</button></div></section>`;

  window.CyberGames.move = {
    mount(container, api) {
      let score = 0;
      let stage = 0;
      let firstWasCorrect = false;
      let answered = false;
      let done = false;
      let destroyed = false;

      function chatMarkup(title, subtitle, message, extra = '') {
        return `<div class="dec-chat"><aside class="dec-chat-rail"><span class="dec-teams-mark">T</span>${ico(api, 'user', 21)}${ico(api, 'mail', 21)}${ico(api, 'file', 21)}</aside><div class="dec-chat-body"><div class="dec-window-bar"><span class="dec-online-dot"></span><strong>${title}</strong><span class="dec-window-dots">•••</span></div><div class="dec-chat-person"><span class="dec-avatar">${stage === 0 ? 'ML' : firstWasCorrect ? 'AC' : 'ML'}</span><div><strong>${title}</strong><small>${subtitle}</small></div><span class="dec-chat-time">09:41</span></div><div class="dec-message">${message}${extra}</div><div class="dec-chat-input">Type a message… <span>↗</span></div></div></div>`;
      }

      function renderStage() {
        if (destroyed) return;
        answered = false;
        let visual, options, title, copy;
        if (stage === 0) {
          title = 'The boss is in a hurry. Your move.';
          copy = 'A message arrives on Teams. Every choice changes what happens next.';
          visual = chatMarkup('Marco · Leadership', 'Direct message', '<p>I need all the customer data for the meeting right now.</p><p>Send it to <strong class="dec-highlight">marco.director@personal-mail.example</strong>. The company portal is down and I cannot answer the phone.</p><span class="dec-urgency">URGENT · within 5 minutes</span>');
          options = [
            ['send', 'Send the file to the personal email address', 'The message appears to come from the director.'],
            ['verify', 'Verify through an established channel', 'Call the number already in my contacts and use approved company channels.'],
            ['link', 'Ask for another link to upload the file', 'That way, I avoid sending it by email.']
          ];
        } else if (firstWasCorrect) {
          title = 'Request checked. What about AI?';
          copy = 'You stopped the impersonation attempt. A colleague has another suggestion.';
          visual = chatMarkup('Anna · Customer Operations', 'Colleague · internal channel', '<p>Shall we upload this customer document to a public AI tool for the report? It can summarise it in a second.</p>', `<div class="dec-attachment">${ico(api, 'file', 25)}<div><strong>Customers_Q4.xlsx</strong><small>Classification: CONFIDENTIAL</small></div></div>`);
          options = [
            ['public', 'Upload it using my personal public AI account', 'My account is protected by a password.'],
            ['anonymous', 'Remove the names and upload it anyway', 'Other confidential data may remain in the document.'],
            ['approved', 'Check approved tools and data policies', 'Proceed only if the tool, data classification and intended use are permitted.']
          ];
        } else {
          title = 'The attack evolves: an MFA request arrives.';
          copy = 'In this scenario, the attacker already has compromised credentials and is trying to complete the sign-in with MFA. You can still stop them.';
          visual = chatMarkup('Marco · Leadership', 'New message · 1 minute later', '<p>Perfect. Now approve this MFA request to finish accessing the file.</p><p>Or send me the 6-digit code instead. This is an exceptional procedure.</p>', `<div class="dec-mfa-preview">${ico(api, 'lock', 25)}<div><strong>Sign-in request</strong><small>You have not started any sign-in</small></div></div>`);
          options = [
            ['approve', 'Approve to finish the task', 'The request seems related to the meeting.'],
            ['recover', 'Deny and contact the security team', 'Report the earlier interaction too and follow their instructions to contain the risk.'],
            ['code', 'Send only the 6-digit code', 'Avoid approving the notification directly.']
          ];
        }
        container.innerHTML = `<div class="dec-game">${intro('CHOOSE YOUR MOVE', title, copy)}${progress(stage + 1, 2, score)}<div class="dec-move-layout">${visual}<div class="dec-options" role="group" aria-label="Choose your action">${options.map((o, i) => `<button class="dec-option" data-dec-choice="${o[0]}"><span class="dec-option-number">0${i + 1}</span><span><strong>${o[1]}</strong><small>${o[2]}</small></span>${ico(api, 'arrow', 18)}</button>`).join('')}</div></div><div class="dec-feedback-slot"></div></div>`;
      }

      function choose(choice) {
        if (answered || destroyed) return;
        answered = true;
        const right = stage === 0 ? choice === 'verify' : firstWasCorrect ? choice === 'approved' : choice === 'recover';
        if (right) score += 50;
        let title, copy;
        if (stage === 0) {
          firstWasCorrect = right;
          title = right ? 'You stopped the attempt.' : 'Urgency opened a door.';
          copy = right ? 'The number already in your contacts lets you verify the identity. The real director did not request that data: report the message and follow company procedures.' : choice === 'send' ? 'The data could leave authorised channels. A name and photo on Teams are not enough to confirm an identity. The attacker now tries to gain account access too.' : 'A link supplied by the same suspicious sender does not verify the request. It could lead to a fake sign-in page. The attacker now tries to obtain an MFA approval.';
        } else if (firstWasCorrect) {
          title = right ? 'Confidential data, appropriate tools.' : 'A protected account is not enough.';
          copy = right ? 'Using AI requires an approved tool and a permitted use for the document’s classification. If either condition is missing, do not upload the data.' : 'A protected personal account or removing names alone does not authorise an upload. The file may contain other identifying or confidential data: check the policies and approved tools.';
        } else {
          title = right ? 'You stopped the escalation.' : 'The attacker can access the account.';
          copy = right ? 'Denying the MFA request and reporting it immediately helps the security team contain the incident. Tell them what you have already sent or opened, without delay.' : 'An MFA approval or code can complete the attacker’s sign-in. Never share them in chat: deny unexpected requests and report them promptly.';
        }
        container.querySelectorAll('[data-dec-choice]').forEach(button => {
          button.disabled = true;
          if (button.dataset.decChoice === choice) button.classList.add(right ? 'dec-selected-correct' : 'dec-selected-wrong');
        });
        container.querySelector('.dec-score').textContent = `${score} points`;
        container.querySelector('.dec-feedback-slot').innerHTML = feedback(right, title, copy, stage === 0 ? 'Continue the story' : 'Complete the challenge', stage === 0 ? 'next' : 'finish');
        container.querySelector('.dec-feedback button').focus({ preventScroll: true });
      }

      const listener = event => {
        const choice = event.target.closest('[data-dec-choice]');
        const action = event.target.closest('[data-dec-action]');
        if (choice && container.contains(choice)) choose(choice.dataset.decChoice);
        if (!action || destroyed || !container.contains(action)) return;
        if (action.dataset.decAction === 'next' && answered) { stage = 1; renderStage(); }
        if (action.dataset.decAction === 'finish' && answered && !done) {
          done = true;
          api.finish({ score, maxScore: 100, lesson: 'Verify requests through an established channel, protect MFA approvals and use only approved tools for company data.' });
        }
      };
      container.addEventListener('click', listener);
      renderStage();
      return () => { destroyed = true; container.removeEventListener('click', listener); };
    }
  };

  window.CyberGames.mfa = {
    mount(container, api) {
      const rounds = [
        { context: 'You have just entered your credentials in the company portal on this PC.', app: 'Company portal', device: 'Your browser · this PC', time: 'Now', expected: true },
        { context: 'You are reading a document. You have not started any sign-in.', app: 'Microsoft 365', device: 'Unknown browser · another device', time: 'Now', expected: false },
        { context: 'You are not signing in. This is the fifth request in two minutes.', app: 'Microsoft 365', device: 'Repeated requests · another device', time: '5 requests in 2 minutes', expected: false },
        { context: 'You opened the company portal, but this notification is for another service you did not request.', app: 'Admin console', device: 'Different session from the one you started', time: 'Now', expected: false },
        { context: 'You have just started signing in to the approved VPN. The service and device match.', app: 'Company VPN', device: 'Your laptop · this sign-in', time: 'Now', expected: true }
      ];
      let index = 0, score = 0, answered = false, started = false, destroyed = false, finished = false;
      let interval = null, enableTimer = null, seconds = 16, denialPending = false, untimedMode = false;
      const clearTimers = () => {
        if (interval !== null) clearInterval(interval);
        if (enableTimer !== null) clearTimeout(enableTimer);
        interval = null; enableTimer = null;
      };

      function phone(round, preview = false) {
        return `<div class="dec-phone"><div class="dec-phone-top"><span>09:41</span><span class="dec-phone-notch"></span><span>▰</span></div><div class="dec-phone-screen"><div class="dec-phone-lock">${ico(api, 'lock', 25)}</div><span class="dec-phone-clock">09:41</span><span class="dec-phone-date">A new request</span><div class="dec-push"><div class="dec-push-app"><span class="dec-auth-icon">${ico(api, 'shield', 18)}</span><strong>Authenticator</strong><span>now</span></div><h3>Approve this sign-in?</h3><strong class="dec-push-service">${round.app}</strong><p>${round.device}</p><span class="dec-push-status">${round.time}</span>${preview ? '<div class="dec-push-preview">Check the context before reacting</div>' : ''}</div><div class="dec-phone-home"></div></div></div>`;
      }

      function renderIntro() {
        container.innerHTML = `<div class="dec-game">${intro('MFA REFLEX', 'One tap can make a difference.', 'Check what you are doing, read the notification, then choose. A good decision matters more than a fast approval.')}<div class="dec-mfa-layout">${phone(rounds[0], true)}<div class="dec-mfa-instructions"><span class="dec-tag">5 notifications · optional 16-second timer</span><h3>Approve. Deny. Report.</h3><p><strong>Approve</strong> only a sign-in you started and that matches the context.</p><p>In this simulation, <strong>Report</strong> denies the request and informs the security team. You can also <strong>Deny</strong> first and then report.</p><p class="dec-small">Options in real MFA tools may vary: follow company procedures. Each complete decision is worth 20 points; you can read the feedback at your own pace before the next notification.</p><label class="dec-timer-option"><input type="checkbox" data-dec-untimed><span>Play without a time limit<small>Same challenges, same scoring.</small></span></label><button class="button button-primary" data-dec-action="start">Start the notifications ${ico(api, 'arrow', 18)}</button></div></div></div>`;
      }

      function renderRound() {
        if (destroyed) return;
        clearTimers(); answered = false; denialPending = false; seconds = 16;
        const round = rounds[index];
        const timerMarkup = untimedMode ? `<div class="dec-timer dec-untimed">${ico(api, 'clock', 20)}<span>No time limit · take your time</span></div>` : `<div class="dec-timer" aria-label="Time available">${ico(api, 'clock', 20)}<strong class="dec-seconds">16</strong><span>seconds to decide</span></div><div class="dec-timer-track"><span style="width:100%"></span></div>`;
        container.innerHTML = `<div class="dec-game">${intro('MFA REFLEX', 'Is this request really yours?', 'Each notification is a new situation: use the context rather than habit.')}${progress(index + 1, rounds.length, score)}<div class="dec-mfa-layout">${phone(round)}<div class="dec-mfa-controls"><div class="dec-context"><span class="eyebrow">WHAT YOU ARE DOING</span><p>${round.context}</p></div>${timerMarkup}<div class="dec-mfa-actions"><button class="button dec-approve" data-dec-answer="approve" disabled>${ico(api, 'check', 19)} Approve</button><button class="button button-secondary" data-dec-answer="deny" disabled>${ico(api, 'close', 19)} Deny</button><button class="button dec-report" data-dec-answer="report" disabled>${ico(api, 'flag', 19)} Report</button></div><p class="dec-small">In this simulation, Report denies the request and informs the security team.</p><div class="dec-feedback-slot"></div></div></div></div>`;
        enableTimer = setTimeout(() => {
          enableTimer = null;
          if (destroyed || answered) return;
          container.querySelectorAll('[data-dec-answer]').forEach(button => { button.disabled = false; });
          if (untimedMode) return;
          interval = setInterval(() => {
            if (destroyed || answered || document.querySelector('dialog[open]')) return;
            seconds -= 1;
            const number = container.querySelector('.dec-seconds');
            const fill = container.querySelector('.dec-timer-track span');
            if (number) number.textContent = String(seconds);
            if (fill) fill.style.width = `${Math.max(seconds, 0) / 16 * 100}%`;
            if (seconds <= 0) answer('timeout');
          }, 1000);
        }, 650);
      }

      function showAnswer(right, title, copy, awaitingReport = false) {
        const last = index === rounds.length - 1;
        container.querySelector('.dec-score').textContent = `${score} points`;
        const action = awaitingReport ? 'complete-report' : last ? 'finish' : 'next';
        const cta = awaitingReport ? 'Report to the security team · +8 points' : last ? 'Complete the challenge' : 'Next notification';
        container.querySelector('.dec-feedback-slot').innerHTML = feedback(right, title, copy, cta, action) + (awaitingReport ? `<button class="dec-text-button" data-dec-action="skip-report">Continue without reporting · 12/20 points</button>` : '');
        container.querySelector('.dec-feedback button').focus({ preventScroll: true });
      }

      function answer(action) {
        if (destroyed || answered) return;
        const enabledButton = container.querySelector(`[data-dec-answer="${action}"]`);
        if (action !== 'timeout' && (!enabledButton || enabledButton.disabled)) return;
        answered = true; clearTimers();
        container.querySelectorAll('[data-dec-answer]').forEach(button => { button.disabled = true; });
        const round = rounds[index];
        if (round.expected && action === 'approve') {
          score += 20;
          showAnswer(true, 'Sign-in recognised · +20 points', 'You started the sign-in and the service and device match. The approval fits what you are doing.');
        } else if (!round.expected && action === 'report') {
          score += 20;
          showAnswer(true, 'Request denied and reported · +20 points', 'This was not your sign-in. Denying blocks this request; reporting helps check whether your credentials have been compromised.');
        } else if (!round.expected && action === 'deny') {
          score += 12; denialPending = true;
          showAnswer(true, 'Request denied · +12 points', 'You blocked the approval. Complete the action by reporting the attempt: unexpected or repeated requests may indicate an attack.', true);
        } else if (action === 'timeout') {
          showAnswer(false, 'Time is up · 0 points', round.expected ? 'You can restart your sign-in through the company service. In this simulation, time ran out before you made a decision.' : 'You did not approve the request, but the attempt still needs reporting. Even after a request expires, report the attempt to the security team and deny any new requests you did not initiate.');
        } else if (round.expected) {
          showAnswer(false, 'This was your sign-in · 0 points', 'In this scenario, you started the sign-in and all the details match. Always check; here, you could approve. If you have doubts in real life, stop and verify.');
        } else {
          showAnswer(false, 'Access approved for the attacker · 0 points', 'Never approve an unexpected MFA request, even to stop the notifications. Deny and report it; if you have already approved, alert the security team immediately.');
        }
      }

      function continueRound() {
        denialPending = false;
        if (index < rounds.length - 1) { index += 1; renderRound(); }
        else finish();
      }
      function finish() {
        if (finished || destroyed) return;
        finished = true; clearTimers();
        api.finish({ score, maxScore: 100, lesson: 'Approve only a sign-in you started and recognise. Deny and report unexpected MFA requests: do not give in to the pressure of repeated notifications.' });
      }
      const listener = event => {
        const answerButton = event.target.closest('[data-dec-answer]');
        const action = event.target.closest('[data-dec-action]');
        if (answerButton && container.contains(answerButton)) answer(answerButton.dataset.decAnswer);
        if (!action || destroyed || !container.contains(action)) return;
        switch (action.dataset.decAction) {
          case 'start':
            if (!started) {
              untimedMode = Boolean(container.querySelector('[data-dec-untimed]').checked);
              started = true; renderRound();
            }
            break;
          case 'complete-report':
            if (denialPending) { denialPending = false; score += 8; showAnswer(true, 'Action complete · 20/20 points', 'You denied the request and then reported it: two correct steps that block the request and allow an investigation.'); }
            break;
          case 'skip-report': if (denialPending) continueRound(); break;
          case 'next': if (answered && !denialPending) continueRound(); break;
          case 'finish': if (answered && !denialPending) finish(); break;
        }
      };
      container.addEventListener('click', listener); renderIntro();
      return () => { destroyed = true; clearTimers(); container.removeEventListener('click', listener); };
    }
  };

  window.CyberGames.classify = {
    mount(container, api) {
      const cases = api.shuffle([
        { id: 'qr', safe: false, label: 'A poster in reception', title: 'A gift, a QR code, no source.', rationale: 'A prize and a QR code do not prove that something is trustworthy. Verify who put up the poster and check the destination through an official source before opening links or entering data.', visual: () => `<div class="dec-poster"><span class="dec-poster-star">✦</span><span class="dec-poster-kicker">TODAY ONLY</span><h3>Your next gift<br>is waiting.</h3><div class="dec-qr" aria-label="Illustrative QR code, not scannable"><i></i><i></i><i></i><span></span></div><strong>€50 shopping voucher</strong><span>Scan and sign in with your company email</span><small>Promoter not identified</small></div>` },
        { id: 'wifi', safe: false, label: 'At the airport', title: 'Which network is actually official?', rationale: 'Two almost identical names do not tell you which network is legitimate. Check the name using official signs or ask airport staff, and follow company rules for connections.', visual: () => `<div class="dec-settings"><div class="dec-settings-header">${ico(api, 'wifi', 24)}<strong>Wi-Fi</strong><span class="dec-toggle"></span></div><div class="dec-settings-caption">AVAILABLE NETWORKS</div><div class="dec-network">${ico(api, 'wifi', 24)}<div><strong>Airport_Free_WiFi</strong><small>Open network · source unverified</small></div><span>ⓘ</span></div><div class="dec-network">${ico(api, 'wifi', 24)}<div><strong>Airport_Free_WiFi_5G</strong><small>Open network · source unverified</small></div><span>ⓘ</span></div><p class="dec-settings-note">No official source has been checked yet.</p></div>` },
        { id: 'ai', safe: true, label: 'Preparing a presentation', title: 'AI, with the right checks.', rationale: 'In this scenario, the tool is approved, the document is public and the use is permitted by policy. Those conditions make the action appropriate; do not automatically assume the same for confidential documents.', visual: () => `<div class="dec-ai-window"><div class="dec-window-bar">${ico(api, 'bolt', 19)}<strong>Company AI assistant</strong><span class="dec-approved-badge">IT approved</span></div><div class="dec-ai-content"><span class="dec-tag dec-tag-green">Use permitted by policy</span><div class="dec-attachment">${ico(api, 'file', 29)}<div><strong>Public_presentation.pdf</strong><small>Classification: PUBLIC</small></div></div><div class="dec-ai-prompt">Summarise the key points of this presentation, already published on the company website.</div><span class="dec-ai-policy">${ico(api, 'check', 16)} Tool, data and purpose checked</span></div></div>` },
        { id: 'password', safe: true, label: 'Creating a new account', title: 'Long, unique and stored securely.', rationale: 'A long, unpredictable and unique passphrase is a good choice. Here, it is generated and saved in the approved manager, without reuse. The string shown is only an example: do not use it as a real password.', visual: () => `<div class="dec-vault"><span class="dec-vault-icon">${ico(api, 'lock', 28)}</span><h3>Approved password manager</h3><small>NEW PASSWORD · FICTIONAL EXAMPLE</small><div class="dec-passphrase">orbit-COPPER-cedar-47-mist</div><div class="dec-strength"><i></i><i></i><i></i><i></i><i></i></div><div class="dec-password-checks"><span>${ico(api, 'check', 16)} Randomly generated</span><span>${ico(api, 'check', 16)} Unique to this account</span><span>${ico(api, 'check', 16)} Saved in the approved manager</span></div></div>` },
        { id: 'attachment', safe: false, label: 'An invoice by email', title: 'An attachment that asks too much.', rationale: 'An unexpected invoice asking you to enable macros or active content is a warning sign. Do not enable them: verify the request through an established channel and report the email according to company procedures.', visual: () => `<div class="dec-email"><div class="dec-window-bar">${ico(api, 'mail', 19)}<strong>Inbox</strong><span class="dec-window-dots">•••</span></div><div class="dec-email-content"><span class="dec-email-from">From: Billing &lt;payments@urgent-invoices.example&gt;</span><h3>Overdue payment — action required</h3><p>Open the attached document to view the invoice.</p><div class="dec-attachment">${ico(api, 'file', 26)}<div><strong>October_invoice.xlsm</strong><small>Excel file with macros</small></div></div><div class="dec-macro-banner">⚠ To view the invoice, enable content and macros.</div></div></div>` }
      ]);
      let index = 0, score = 0, answered = false, destroyed = false, finished = false;
      function render() {
        if (destroyed) return;
        answered = false;
        const scenario = cases[index];
        container.innerHTML = `<div class="dec-game" data-dec-case="${scenario.id}">${intro('SAFE OR SUSPICIOUS?', 'Would you trust this scene?', 'Look at the details. “Safe” means the necessary checks have been made in the context shown.')}${progress(index + 1, cases.length, score)}<div class="dec-classify-layout"><div class="dec-visual-frame">${scenario.visual()}</div><div class="dec-classify-controls"><span class="eyebrow">${scenario.label}</span><h3>${scenario.title}</h3><p>How would you classify this situation?</p><div class="dec-classify-actions" role="group" aria-label="Classify the situation"><button class="button dec-safe" data-dec-classify="safe">${ico(api, 'shield', 22)} Safe</button><button class="button dec-suspicious" data-dec-classify="suspicious">${ico(api, 'flag', 22)} Suspicious</button></div><div class="dec-feedback-slot"></div></div></div></div>`;
      }
      function answer(value) {
        if (answered || destroyed) return;
        answered = true;
        const scenario = cases[index];
        const right = (value === 'safe') === scenario.safe;
        if (right) score += 20;
        container.querySelectorAll('[data-dec-classify]').forEach(button => {
          button.disabled = true;
          if (button.dataset.decClassify === value) button.classList.add(right ? 'dec-selected-correct' : 'dec-selected-wrong');
        });
        container.querySelector('.dec-score').textContent = `${score} points`;
        const last = index === cases.length - 1;
        container.querySelector('.dec-feedback-slot').innerHTML = feedback(right, `${right ? 'You read the details well' : 'Take another look at the context'} · ${right ? '+20' : '0'} points`, scenario.rationale, last ? 'Complete the challenge' : 'Next scene', last ? 'finish' : 'next');
        container.querySelector('.dec-feedback button').focus({ preventScroll: true });
      }
      const listener = event => {
        const choice = event.target.closest('[data-dec-classify]');
        const action = event.target.closest('[data-dec-action]');
        if (choice && container.contains(choice)) answer(choice.dataset.decClassify);
        if (!action || destroyed || !answered || !container.contains(action)) return;
        if (action.dataset.decAction === 'next') { index += 1; render(); }
        if (action.dataset.decAction === 'finish' && !finished) {
          finished = true;
          api.finish({ score, maxScore: 100, lesson: 'Assess the source and context: verify QR codes and networks, avoid unexpected macros, use unique passwords and approved AI tools with permitted data.' });
        }
      };
      container.addEventListener('click', listener); render();
      return () => { destroyed = true; container.removeEventListener('click', listener); };
    }
  };
})();
