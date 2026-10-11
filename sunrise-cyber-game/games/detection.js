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
          text: 'I am in a meeting. This is urgent: send the full customer list to director@sumrise.net immediately. Do not call me.',
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
          announce(feedback, '<strong>' + (correct ? 'You spotted the suspicious request.' : 'The impostor is the message from “Mark Wilson”.') + '</strong><p>An external contact, pressure to act quickly, a request to send customer data to a lookalike email domain (sumrise.net) and instructions not to call: these are warning signs that need checking. A display name does not prove someone’s identity.</p><p><b>The safe response:</b> verify through a company channel you already know and report the message using your internal procedures.</p>', correct);
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
      var requiredClues = Object.keys(clues).length;
      function mailIcon(name) {
        var paths = {
          launcher: '<circle cx="5" cy="5" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="19" cy="5" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="19" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="19" cy="19" r="1"/>',
          search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
          inbox: '<path d="M4 4h16v16H4Z"/><path d="M4 13h5l2 3h2l2-3h5"/>',
          calendar: '<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M8 3v4m8-4v4M4 10h16M8 14h2m4 0h2m-8 3h2"/>',
          delete: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
          archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8M9 12h6"/>',
          reply: '<path d="m9 5-6 6 6 6M3 11h9c5 0 8 3 8 8"/>',
          forward: '<path d="m15 5 6 6-6 6M21 11h-9c-5 0-8 3-8 8"/>',
          chevron: '<path d="m8 5 7 7-7 7"/>',
          settings: '<path d="m9 3-.6 3-2 .8L4 6l-2 4 2.5 1.8v2.4L2 16l2 4 2.4-.8 2 .8.6 3h6l.6-3 2-.8 2.4.8 2-4-2.5-1.8v-2.4L22 10l-2-4-2.4.8-2-.8L15 3Z"/><circle cx="12" cy="13" r="3"/>',
          more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
        };
        return paths[name] ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>' : api.icon(name,18);
      }
      container.innerHTML = makeIntro('SPOT THE RISK · 3 CLUES', 'The risk is in the details.', 'Find all three warning signs in the email. Click or tap details to investigate. You start with 100 points; each false clue costs 20 points.') +
        '<div class="det-risk-progress" aria-live="polite"><span>' + api.icon('search', 18) + ' <strong class="det-clue-counter">0 of 3 clues</strong></span><span class="det-risk-score">100 points available</span></div>' +
        `<section class="det-outlook" aria-label="Simulated Outlook inbox with a suspicious Microsoft 365 email">
          <header class="det-outlook-bar">
            <span class="det-launcher">${mailIcon('launcher')}</span>
            <img class="det-outlook-logo" src="assets/outlook-logo.png" alt="Outlook" width="30" height="30">
            <strong>Outlook</strong>
            <span class="det-mail-search">${mailIcon('search')}<span>Search</span></span>
            <span class="det-outlook-header-tools">${mailIcon('settings')}${api.icon('help',18)}<span class="det-account-avatar">GB</span></span>
          </header>
          <div class="det-outlook-tabs"><span class="det-outlook-tab-active">Home</span><span>View</span><span>Help</span><span class="det-simulation">SIMULATION</span></div>
          <div class="det-outlook-toolbar" aria-label="Simulated Outlook toolbar">
            <span class="det-new-mail">${api.icon('mail',17)} New mail ${mailIcon('chevron')}</span>
            <span>${mailIcon('delete')}<span>Delete</span></span><span>${mailIcon('archive')}<span>Archive</span></span><span>${api.icon('flag',17)}<span>Report</span></span>
            <i class="det-toolbar-divider"></i><span>${mailIcon('reply')}<span>Reply</span></span><span>${mailIcon('forward')}<span>Forward</span></span><span class="det-toolbar-more">${mailIcon('more')}</span>
          </div>
          <div class="det-mail-layout">
            <aside class="det-outlook-rail" aria-label="Simulated Microsoft 365 apps"><span class="det-outlook-rail-active">${api.icon('mail',20)}</span><span>${mailIcon('calendar')}</span><span>${api.icon('user',20)}</span><span>${api.icon('file',20)}</span></aside>
            <aside class="det-mail-sidebar" aria-label="Simulated mail folders">
              <span class="det-folder-heading">Favourites</span>
              <span class="det-mail-folder det-mail-folder-active">${mailIcon('inbox')}<span>Inbox</span><b>4</b></span>
              <span class="det-mail-folder">${mailIcon('forward')}<span>Sent Items</span></span>
              <span class="det-mail-folder">${api.icon('file',17)}<span>Drafts</span><b>1</b></span>
              <span class="det-mail-folder">${mailIcon('delete')}<span>Deleted Items</span></span>
              <span class="det-folder-heading">Folders</span><span class="det-mail-folder">${mailIcon('archive')}<span>Archive</span></span>
            </aside>
            <section class="det-mail-list" aria-label="Simulated inbox messages">
              <div class="det-mail-list-heading"><strong>Inbox</strong>${mailIcon('more')}</div>
              <div class="det-mail-list-tabs"><span class="det-focused-tab">Focused</span><span>Other</span></div>
              <div class="det-mail-preview selected"><span><b>Microsoft 365</b><time>10:24</time></span><strong>Your Microsoft 365 account is about to be disabled</strong><small>We have detected a synchronisation issue…</small></div>
              <div class="det-mail-preview"><span><b>Laura Bennett</b><time>09:42</time></span><strong>Updated meeting invitation</strong><small>Our check-in is now at 14:30.</small></div>
              <div class="det-mail-preview"><span><b>IT Service Desk</b><time>09:15</time></span><strong>Monthly security newsletter</strong><small>Your security tips for this month.</small></div>
              <div class="det-mail-preview"><span><b>Project team</b><time>Yesterday</time></span><strong>Weekly update</strong><small>The latest slides are in SharePoint.</small></div>
            </section>
            <article class="det-mail-body">
              <h3>Your Microsoft 365 account is about to be disabled</h3>
              <div class="det-email-header">
                <span class="det-mail-avatar" aria-hidden="true">M</span>
                <div class="det-email-sender"><strong>Microsoft 365 · Account support</strong><button type="button" class="det-hotspot det-email-address" data-risk="sender" aria-label="Inspect the sender’s domain">microsoft-security@account-check.example</button><span>To: <button type="button" class="det-hotspot" data-risk="recipient" aria-label="Inspect the recipient">you@sunrise.example</button></span></div>
                <button type="button" class="det-hotspot det-email-date" data-risk="date" aria-label="Inspect the email’s sending time">Today, 10:24</button>
              </div>
              <div class="det-email-text">
                <div class="det-microsoft-lockup"><img class="det-microsoft-logo" src="assets/microsoft-logo.svg" alt="Microsoft" width="24" height="24"><span aria-hidden="true">Microsoft</span></div>
                <h4>Account verification required</h4>
                <p>Dear colleague,</p>
                <p>We have detected a synchronisation issue with your company account.</p>
                <p><button type="button" class="det-hotspot det-urgency" data-risk="urgency">Your account will be disabled in 30 minutes unless you confirm your credentials immediately.</button></p>
                <p>To keep accessing your email and documents, complete the verification:</p>
                <button type="button" class="det-hotspot det-email-cta" data-risk="link" aria-label="Inspect the Confirm account link">Confirm account<small>https://m365-access.example/renew</small></button>
                <p class="det-mail-signature">Kind regards,<br><button type="button" class="det-hotspot" data-risk="signature">Microsoft 365 IT support team</button></p>
              </div>
              <div class="det-mail-simulation-note">The .example domains are fictitious. No external links are active.</div>
            </article>
          </div>
        </section><div class="det-answer-area"><div class="feedback det-feedback" role="status" aria-live="polite" hidden></div><div class="det-risk-recap" hidden><h3>Three warning signs to check</h3><ul><li><b>Sender:</b> unofficial domain.</li><li><b>Urgency:</b> a threatening deadline that pressures you to act.</li><li><b>Link:</b> a destination unrelated to the claimed service.</li></ul><p>Open the service through your usual bookmark, check with IT and report the email. Do not enter credentials through the link.</p></div><div class="det-finish-area" hidden>${finishButton()}</div></div>`;

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
          container.querySelector('.det-clue-counter').textContent = found.size + ' of ' + requiredClues + ' clues';
          container.querySelector('.det-risk-score').textContent = score + ' points available';
          if (found.size === requiredClues) {
            complete = true;
            buttons.forEach(function (item) {
              item.disabled = true;
              if (clues[item.dataset.risk]) item.classList.add('det-hotspot-correct');
            });
            announce(feedback, '<strong>Suspicious email identified · ' + score + '/100 points.</strong><p>You found all three warning signs. Pause and verify the request through a channel you already know.</p>', true);
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
