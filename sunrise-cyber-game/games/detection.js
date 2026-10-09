(function () {
  'use strict';

  window.CyberGames = window.CyberGames || {};

  function makeIntro(eyebrow, title, description) {
    return '<div class="game-intro"><p class="eyebrow">' + eyebrow + '</p><h2>' + title + '</h2><p>' + description + '</p></div>';
  }

  function finishButton(label) {
    return '<button class="button button-primary det-finish" type="button">' + (label || 'Continue your journey') + '<span aria-hidden="true"> →</span></button>';
  }

  function listen(el, handler, listeners) {
    el.addEventListener('click', handler);
    listeners.push(function () { el.removeEventListener('click', handler); });
  }

  function announce(element, html, success) {
    element.className = 'feedback det-feedback ' + (success ? 'success' : 'danger');
    element.innerHTML = html;
    element.hidden = false;
  }

  function cleanup(listeners) {
    return function () { listeners.forEach(function (remove) { remove(); }); };
  }

  window.CyberGames.impostor = {
    mount: function (container, api) {
      var listeners = [];
      var settled = false;
      var finished = false;
      var score = 0;
      var messages = [
        {
          id: 'meeting', initials: 'LB', name: 'Laura Bennett', channel: 'Project team', time: '09:42', color: 'purple',
          text: 'I have moved our check-in to 14:30. The updated invitation is in your company calendar.',
          tag: 'Company calendar', suspicious: false
        },
        {
          id: 'policy', initials: 'IT', name: 'IT Service Desk', channel: 'Company IT channel', time: '09:44', color: 'blue',
          text: 'The security update is ready. Install it through the Software Center already on your PC.',
          tag: 'Software Center', suspicious: false
        },
        {
          id: 'impostor', initials: 'MW', name: 'Mark Wilson', channel: 'External contact · director’s display name', time: '09:45', color: 'coral',
          text: 'I am in a meeting. This is urgent: send the full customer list to director.private@example.com immediately. Do not call me.',
          tag: 'Urgent request', suspicious: true
        },
        {
          id: 'document', initials: 'SM', name: 'Sophie Moore', channel: 'Project team', time: '09:47', color: 'teal',
          text: 'I have updated the slides in our project folder on SharePoint. Open them from the Files tab in our channel.',
          tag: 'Project folder', suspicious: false
        }
      ];
      var ordered = api.shuffle(messages);
      container.innerHTML = makeIntro('CYBER IMPOSTOR · 1 CHOICE', 'Four messages. One impostor.', 'Which request needs checking before you act? Select the suspicious message. Your first choice counts.') +
        '<section class="det-teams" aria-label="Simulation of four Microsoft Teams messages"><div class="det-app-bar"><span class="det-teams-logo" aria-hidden="true">T</span><strong>Teams</strong><span class="det-app-divider"></span><span>Recent activity</span><span class="det-simulation">SIMULATION</span></div><div class="det-message-grid">' +
        ordered.map(function (message, index) {
          return '<button class="det-message" type="button" data-message="' + message.id + '" aria-label="Select the message from ' + message.name + '"><span class="det-message-head"><span class="det-avatar det-avatar-' + message.color + '" aria-hidden="true">' + message.initials + '</span><span class="det-sender"><strong>' + message.name + '</strong><span>' + message.channel + '</span></span><span class="det-message-time">' + message.time + '</span></span><span class="det-message-text">' + message.text + '</span><span class="det-message-bottom"><span class="det-message-tag">' + message.tag + '</span><span class="det-message-select">Message ' + (index + 1) + '<span aria-hidden="true"> ↗</span></span></span></button>';
        }).join('') + '</div></section><div class="det-answer-area"><div class="feedback det-feedback" role="status" aria-live="polite" hidden></div><div class="det-finish-area" hidden>' + finishButton() + '</div></div>';

      var feedback = container.querySelector('.det-feedback');
      var buttons = Array.from(container.querySelectorAll('[data-message]'));
      buttons.forEach(function (button) {
        listen(button, function () {
          if (settled) return;
          settled = true;
          var correct = button.dataset.message === 'impostor';
          score = correct ? 100 : 0;
          buttons.forEach(function (item) {
            item.disabled = true;
            if (item.dataset.message === 'impostor') {
              item.classList.add('det-choice-correct');
              item.querySelector('.det-message-select').textContent = 'Impostor identified';
            } else if (item === button) {
              item.classList.add('det-choice-wrong');
              item.querySelector('.det-message-select').textContent = 'Your choice';
            }
          });
          announce(feedback, '<strong>' + (correct ? 'You spotted the suspicious request.' : 'The impostor is the message from “Mark Wilson”.') + '</strong><p>An external contact, pressure to act quickly, a request to send customer data to a personal email address and instructions not to call: these are warning signs that need checking. A display name does not prove someone’s identity.</p><p><b>The safe response:</b> verify through a company channel you already know and report the message using your internal procedures.</p>', correct);
          container.querySelector('.det-finish-area').hidden = false;
        }, listeners);
      });
      listen(container.querySelector('.det-finish'), function () {
        if (!settled || finished) return;
        finished = true;
        api.finish({ score: score, maxScore: 100, lesson: 'A sender’s display name does not prove their identity. Verify unusual requests through a known channel and protect customer data.' });
      }, listeners);
      return cleanup(listeners);
    }
  };

  window.CyberGames.risk = {
    mount: function (container, api) {
      var listeners = [];
      var found = new Set();
      var attempted = new Set();
      var errors = 0;
      var finished = false;
      var complete = false;
      var clues = {
        sender: 'The sender uses account-check.example. The display name “Microsoft 365” does not make this an official domain.',
        urgency: 'The threat of deactivation within 30 minutes pressures you to act without checking.',
        link: 'The button points to m365-access.example. The appearance of the message does not prove where a link leads.'
      };
      var neutral = {
        date: 'The time of sending is not enough to identify a threat. Look for clues in the sender, the link or the request.',
        recipient: 'A fraudulent email can still have the correct recipient. This detail alone does not identify the risk.',
        signature: 'A signature can be copied and does not prove identity. On its own, it is not the decisive clue. Check the domain and link destination.'
      };
      container.innerHTML = makeIntro('SPOT THE RISK · 2 CLUES', 'The risk is in the details.', 'Find at least two warning signs in the email. Select details to investigate. You start with 100 points; each false clue costs 20 points.') +
        '<div class="det-risk-progress" aria-live="polite"><span>' + api.icon('search', 18) + ' <strong class="det-clue-counter">0 of 2 clues</strong></span><span class="det-risk-score">100 points available</span></div>' +
        '<section class="det-outlook" aria-label="Simulation of a Microsoft 365 email"><div class="det-app-bar det-outlook-bar"><span class="det-outlook-logo" aria-hidden="true">O</span><strong>Outlook</strong><span class="det-mail-search">Search mail</span><span class="det-simulation">SIMULATION</span></div><div class="det-mail-layout"><aside class="det-mail-sidebar" aria-label="Simulated folders"><span class="det-mail-folder det-mail-folder-active">Inbox <b>4</b></span><span class="det-mail-folder">Sent Items</span><span class="det-mail-folder">Drafts</span><span class="det-mail-folder">Archive</span></aside><article class="det-mail-body"><div class="det-mail-tools"><span>Reply</span><span>Forward</span><span>Archive</span></div><h3>Your Microsoft 365 account is about to be disabled</h3><div class="det-email-header"><span class="det-mail-avatar" aria-hidden="true">M</span><div class="det-email-sender"><strong>Microsoft 365 · Account support</strong><button type="button" class="det-hotspot det-email-address" data-risk="sender" aria-label="Inspect the sender’s domain">microsoft-security@account-check.example</button><span>To: <button type="button" class="det-hotspot" data-risk="recipient" aria-label="Inspect the recipient">you@sunrise.example</button></span></div><button type="button" class="det-hotspot det-email-date" data-risk="date" aria-label="Inspect the email’s sending time">Today, 10:24</button></div><div class="det-email-text"><p>Dear colleague,</p><p>We have detected a synchronisation issue with your company account.</p><p><button type="button" class="det-hotspot det-urgency" data-risk="urgency">Your account will be disabled in 30 minutes unless you confirm your credentials immediately.</button></p><p>To keep accessing your email and documents, complete the verification:</p><button type="button" class="det-hotspot det-email-cta" data-risk="link" aria-label="Inspect the Confirm account link">Confirm account <span aria-hidden="true">↗</span><small>https://m365-access.example/renew</small></button><p class="det-mail-signature">Kind regards,<br><button type="button" class="det-hotspot" data-risk="signature">Microsoft 365 IT support team</button></p></div><div class="det-mail-simulation-note">The .example domains are fictitious. No external links are active.</div></article></div></section><div class="det-answer-area"><div class="feedback det-feedback" role="status" aria-live="polite" hidden></div><div class="det-risk-recap" hidden><h3>Three warning signs to check</h3><ul><li><b>Sender:</b> unofficial domain.</li><li><b>Urgency:</b> a threatening deadline that pressures you to act.</li><li><b>Link:</b> a destination unrelated to the claimed service.</li></ul><p>Open the service through your usual bookmark, check with IT and report the email. Do not enter credentials through the link.</p></div><div class="det-finish-area" hidden>' + finishButton() + '</div></div>';

      var feedback = container.querySelector('.det-feedback');
      var buttons = Array.from(container.querySelectorAll('[data-risk]'));
      buttons.forEach(function (button) {
        listen(button, function () {
          var id = button.dataset.risk;
          if (complete || attempted.has(id)) return;
          attempted.add(id);
          button.disabled = true;
          if (clues[id]) {
            found.add(id);
            button.classList.add('det-hotspot-correct');
            announce(feedback, '<strong>Clue found.</strong><p>' + clues[id] + '</p>', true);
          } else {
            errors += 1;
            button.classList.add('det-hotspot-wrong');
            announce(feedback, '<strong>This detail is not enough. −20 points</strong><p>' + neutral[id] + '</p>', false);
          }
          var score = Math.max(0, 100 - errors * 20);
          container.querySelector('.det-clue-counter').textContent = found.size + ' of 2 clues';
          container.querySelector('.det-risk-score').textContent = score + ' points available';
          if (found.size >= 2) {
            complete = true;
            buttons.forEach(function (item) {
              item.disabled = true;
              if (clues[item.dataset.risk]) item.classList.add('det-hotspot-correct');
            });
            announce(feedback, '<strong>Suspicious email identified · ' + score + '/100 points.</strong><p>You found two warning signs. Pause and verify the request through a channel you already know.</p>', true);
            container.querySelector('.det-risk-recap').hidden = false;
            container.querySelector('.det-finish-area').hidden = false;
          }
        }, listeners);
      });
      listen(container.querySelector('.det-finish'), function () {
        if (!complete || finished) return;
        finished = true;
        api.finish({ score: Math.max(0, 100 - errors * 20), maxScore: 100, lesson: 'Check the sender’s domain, link destination and urgent requests. Open services through your usual bookmarks and report suspicious emails.' });
      }, listeners);
      return cleanup(listeners);
    }
  };

  window.CyberGames.timeline = {
    mount: function (container, api) {
      var listeners = [];
      var settled = false;
      var finished = false;
      var score = 0;
      var events = [
        { id: 'known', time: '08:58', icon: 'lock', title: 'Company portal sign-in', source: 'Sign-in log', text: 'You start the sign-in yourself on your registered company laptop, using your usual network.' },
        { id: 'entry', time: '09:06', icon: 'mail', title: 'A new Teams message', source: 'Message history', text: 'An external contact claims to be from IT: “New policy: verify your account”. You open login-sunrise.example.' },
        { id: 'credentials', time: '09:09', icon: 'user', title: 'A familiar-looking page', source: 'Browser history', text: 'The message link takes you to a page that looks like Microsoft. You enter your company password.' },
        { id: 'control', time: '09:11', icon: 'phone', title: 'An unexpected MFA request', source: 'Notifications and mail log', text: 'You approve a request you did not initiate. A mail-forwarding rule appears immediately afterwards.' }
      ];
      container.innerHTML = makeIntro('CYBER TIMELINE · 4 PIECES OF EVIDENCE', 'Where did the attack begin?', 'Reconstruct the morning. Select the event that first introduced the attack. Your first choice counts.') +
        '<section class="det-investigation" aria-label="Timeline of events to investigate"><div class="det-investigation-header"><span>' + api.icon('search', 19) + '<strong>Incident case file</strong></span><span class="det-simulation">4 EVENTS · CHRONOLOGICAL ORDER</span></div><div class="det-timeline">' +
        events.map(function (event, index) {
          return '<button class="det-timeline-event" type="button" data-event="' + event.id + '" aria-label="The attack starts at ' + event.time + ': ' + event.title + '"><span class="det-timeline-time">' + event.time + '<span class="det-timeline-dot" aria-hidden="true"></span></span><span class="det-event-icon" aria-hidden="true">' + api.icon(event.icon, 20) + '</span><span class="det-event-content"><span class="det-event-source">' + event.source + '</span><strong>' + event.title + '</strong><span class="det-event-description">' + event.text + '</span><span class="det-event-verdict" hidden></span></span><span class="det-event-number" aria-hidden="true">0' + (index + 1) + '</span></button>';
        }).join('') + '</div></section><div class="det-answer-area"><div class="feedback det-feedback" role="status" aria-live="polite" hidden></div><div class="det-chain" hidden aria-label="Reconstructed attack chain"><div><span>01</span><strong>Fake message</strong><small>Attack entry point</small></div><span class="det-chain-arrow" aria-hidden="true">→</span><div><span>02</span><strong>Stolen credentials</strong><small>Phishing page</small></div><span class="det-chain-arrow" aria-hidden="true">→</span><div><span>03</span><strong>MFA approved</strong><small>Attacker signs in</small></div><span class="det-chain-arrow" aria-hidden="true">→</span><div><span>04</span><strong>Mailbox exposed</strong><small>Unauthorised forwarding</small></div></div><div class="det-finish-area" hidden>' + finishButton() + '</div></div>';

      var buttons = Array.from(container.querySelectorAll('[data-event]'));
      var verdicts = {
        known: 'Context: a legitimate sign-in you initiated',
        entry: 'Entry point: a phishing message',
        credentials: 'Consequence: credentials exposed',
        control: 'Consequence: sign-in and mail forwarding'
      };
      buttons.forEach(function (button) {
        listen(button, function () {
          if (settled) return;
          settled = true;
          var correct = button.dataset.event === 'entry';
          score = correct ? 100 : 0;
          buttons.forEach(function (item) {
            item.disabled = true;
            var id = item.dataset.event;
            var verdict = item.querySelector('.det-event-verdict');
            verdict.textContent = verdicts[id];
            verdict.hidden = false;
            if (id === 'entry') item.classList.add('det-choice-correct');
            else if (item === button) item.classList.add('det-choice-wrong');
            else item.classList.add('det-timeline-resolved');
          });
          announce(container.querySelector('.det-feedback'), '<strong>' + (correct ? 'Chain reconstructed: the entry point is at 09:06.' : 'The attack enters through the message at 09:06.') + '</strong><p>You initiated the first sign-in. The external message led to the fake page; the password and MFA approval then gave the attacker access to your mailbox.</p><p><b>Where to break the chain:</b> verify the message before opening the link. If you have already entered data, contact IT immediately and reject any MFA requests you did not initiate.</p>', correct);
          container.querySelector('.det-chain').hidden = false;
          container.querySelector('.det-finish-area').hidden = false;
        }, listeners);
      });
      listen(container.querySelector('.det-finish'), function () {
        if (!settled || finished) return;
        finished = true;
        api.finish({ score: score, maxScore: 100, lesson: 'Phishing can trigger a chain: fake page, stolen credentials, unexpected MFA and access to data. Verify at the entry point and report immediately if you have already interacted.' });
      }, listeners);
      return cleanup(listeners);
    }
  };
}());
