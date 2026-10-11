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
      var chatContent = messages.map(function (message) {
        return '<button class="det-message" type="button" data-message="' + message.id + '" aria-label="Select the message from ' + message.name + '">' +
          window.CyberScreens.teamsMessage({sender: message.name, initials: message.initials, time: message.time, body: '<p>' + message.text + '</p>', external: message.suspicious}) +
          '<span class="det-message-verdict" hidden></span></button>';
      }).join('');
      container.innerHTML = makeIntro('CYBER IMPOSTOR · 1 CHOICE', 'Four messages. One impostor.', 'Which request needs checking before you act? Select the suspicious message. Your first choice counts.') +
        window.CyberScreens.teams({title: 'Project coordination', subtitle: 'Group chat · 4 participants', initials: 'PC', content: chatContent, chats: [
          {name: 'Project coordination', initials: 'PC', preview: 'Sophie: The project slides are ready', active: true},
          {name: 'Laura Bennett', initials: 'LB', preview: 'Updated meeting invitation'},
          {name: 'IT Service Desk', initials: 'IT', preview: 'Security update'},
          {name: 'Sophie Moore', initials: 'SM', preview: 'Project slides on SharePoint'}
        ]}) + '<div class="det-answer-area"><div class="feedback det-feedback" role="status" aria-live="polite" hidden></div><div class="det-finish-area" hidden>' + finishButton() + '</div></div>';

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
              item.querySelector('.det-message-verdict').textContent = 'Suspicious request identified';
              item.querySelector('.det-message-verdict').hidden = false;
            } else if (item === button) {
              item.classList.add('det-choice-wrong');
              item.querySelector('.det-message-verdict').textContent = 'Your choice';
              item.querySelector('.det-message-verdict').hidden = false;
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
        `<section class="det-outlook" data-simulation="outlook" aria-label="Simulated Outlook inbox with a suspicious Microsoft 365 email">
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
      var finished = false;
      var completed = [];
      var wrongAttempts = new Set();
      var penalties = 0;
      var order = ['entry', 'credentials', 'mfa', 'control'];
      var events = [
        { id: 'control', icon: 'mail', title: 'Mailbox forwarding enabled', source: 'Mailbox audit', text: 'A new rule sends incoming messages to an outside address.', explanation: 'With access to the mailbox, the attacker created a forwarding rule. Incoming messages could now be copied outside the company.' },
        { id: 'entry', icon: 'user', title: 'A message from “IT”', source: 'Teams conversation', text: 'An external contact shares a link to a “new account policy” page.', explanation: 'The phishing message introduced the lure. Its link led the employee towards a fake sign-in page.' },
        { id: 'mfa', icon: 'phone', title: 'An unexpected approval', source: 'Authenticator activity', text: 'An MFA prompt the employee did not initiate is approved.', explanation: 'The stolen credentials let the attacker attempt a real sign-in. Approving the unexpected MFA request allowed that sign-in to succeed.' },
        { id: 'credentials', icon: 'lock', title: 'A password captured', source: 'Browser evidence', text: 'A Microsoft-lookalike site receives the employee’s company password.', explanation: 'Following the message link led to the cloned page. Entering the password there gave the attacker the credentials needed for a real sign-in.' }
      ];
      var pool = api.shuffle(events);
      container.innerHTML = makeIntro('CYBER TIMELINE · BUILD THE CHAIN', 'Reconstruct the whole attack.', 'Choose the event that starts the attack, then add what happens next. Every new out-of-order choice costs 10 points at that step. Repeating the same choice at the same step costs nothing more.') +
        '<div class="det-timeline-progress" aria-live="polite"><span>' + api.icon('search', 18) + ' <strong class="det-timeline-counter">0 of 4 steps</strong></span><span class="det-timeline-score">100 points available</span></div>' +
        '<div class="det-timeline-workspace"><section class="det-investigation" aria-label="Unordered attack evidence"><div class="det-investigation-header"><span>' + api.icon('search', 19) + '<strong>Evidence board</strong></span><span class="det-simulation">4 UNORDERED EVENTS</span></div><p class="det-timeline-prompt">Which event starts the attack?</p><div class="det-timeline-pool">' +
        pool.map(function (event) {
          return '<button class="det-timeline-event" type="button" data-event="' + event.id + '" aria-label="Add to the attack chain: ' + event.title + '"><span class="det-event-icon" aria-hidden="true">' + api.icon(event.icon, 21) + '</span><span class="det-event-content"><span class="det-event-source">' + event.source + '</span><strong>' + event.title + '</strong><span class="det-event-description">' + event.text + '</span><span class="det-event-status">Add to the chain <span aria-hidden="true">→</span></span></span></button>';
        }).join('') + '</div></section><section class="det-timeline-chain" aria-labelledby="det-chain-title"><div class="det-chain-heading"><span>' + api.icon('timeline', 21) + '</span><h3 id="det-chain-title">Your reconstructed chain</h3></div><p class="det-chain-empty">Your first correct event will appear here. Build the links one step at a time.</p><ol class="det-ordered-chain" aria-label="Completed attack stages in the order selected"></ol></section></div><div class="det-answer-area"><div class="feedback det-feedback" role="status" aria-live="polite" hidden></div><div class="det-finish-area" hidden>' + finishButton() + '</div></div>';

      var feedback = container.querySelector('.det-feedback');
      var buttons = Array.from(container.querySelectorAll('[data-event]'));
      var finish = container.querySelector('.det-finish');
      finish.disabled = true;
      function updateProgress() {
        container.querySelector('.det-timeline-counter').textContent = completed.length + ' of 4 steps';
        container.querySelector('.det-timeline-score').textContent = Math.max(0, 100 - penalties) + ' points available';
      }
      buttons.forEach(function (button) {
        listen(button, function () {
          if (finished || completed.length === order.length || button.disabled) return;
          var id = button.dataset.event;
          var step = completed.length;
          if (id !== order[step]) {
            var attempt = step + ':' + id;
            var repeated = wrongAttempts.has(attempt);
            if (!repeated) {
              wrongAttempts.add(attempt);
              penalties += 10;
            }
            button.classList.add('det-choice-wrong');
            updateProgress();
            announce(feedback, '<strong>' + (repeated ? 'Already tried at this step · no additional penalty.' : 'Not the next event · −10 points.') + '</strong><p>Nothing has been added to the chain. Look at the events and choose the action that makes the next stage possible.</p>', false);
            return;
          }
          var event = events.find(function (item) { return item.id === id; });
          completed.push(id);
          buttons.forEach(function (item) { item.classList.remove('det-choice-wrong'); });
          button.disabled = true;
          button.classList.add('det-choice-correct');
          button.querySelector('.det-event-status').textContent = 'Added to your chain';
          container.querySelector('.det-chain-empty').hidden = true;
          container.querySelector('.det-ordered-chain').insertAdjacentHTML('beforeend', '<li data-chain-event="' + id + '"><span class="det-chain-step" aria-label="Step ' + completed.length + '">0' + completed.length + '</span><div><strong>' + event.title + '</strong><p>' + event.explanation + '</p></div></li>');
          updateProgress();
          if (completed.length < order.length) {
            container.querySelector('.det-timeline-prompt').textContent = 'Which event happens next?';
            announce(feedback, '<strong>Step added to the chain.</strong><p>' + event.explanation + '</p><p>Choose the event that follows from this step.</p>', true);
            var next = buttons.find(function (item) { return !item.disabled; });
            if (next) next.focus({preventScroll: true});
          } else {
            container.querySelector('.det-timeline-prompt').textContent = 'The full attack chain is reconstructed.';
            announce(feedback, '<strong>Four steps connected · ' + Math.max(0, 100 - penalties) + '/100 points.</strong><p>Phishing led to stolen credentials, an unexpected MFA approval and mailbox forwarding. Each step made the next one possible.</p><p><b>Break the chain:</b> verify unexpected messages, avoid sign-in links you have not checked, deny and report unexpected MFA requests, and contact IT immediately if you have already interacted.</p>', true);
            finish.disabled = false;
            container.querySelector('.det-finish-area').hidden = false;
            finish.focus({preventScroll: true});
          }
        }, listeners);
      });
      listen(finish, function () {
        if (completed.length !== order.length || finished) return;
        finished = true;
        api.finish({ score: Math.max(0, 100 - penalties), maxScore: 100, lesson: 'Phishing can start a chain: a fake sign-in page captures a password, an unexpected MFA approval grants access, and a forwarding rule exposes the mailbox. Verify early, deny unexpected MFA and report immediately if you have interacted.' });
      }, listeners);
      return cleanup(listeners);
    }
  };
}());
