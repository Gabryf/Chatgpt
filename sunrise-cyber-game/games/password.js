(function () {
  'use strict';

  window.CyberGames = window.CyberGames || {};
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const labels = ['Very guessable', 'Guessable', 'Needs work', 'Good estimate', 'Strong estimate'];
  // zxcvbn supports contextual words in addition to its built-in dictionaries.
  const contextWords = ['sunrise', 'bip', 'estate', 'summer', 'winter', 'spring', 'autumn', '2026'];

  window.CyberGames.password = {
    mount(container, api) {
      let step = 0;
      let report = null;
      let solved = false;
      let disposed = false;
      let finished = false;
      const mistakes = new Set();
      const icon = (name, size = 20) => api.icon(name, size);
      const score = () => 100 - mistakes.size * 10;

      function estimate(value) {
        const result = window.zxcvbn(value, contextWords);
        // Keep only generic feedback and numbers. Passwords and match tokens
        // never become game state, session data, scores or completion lessons.
        return {
          score: result.score,
          length: Array.from(value).length,
          warning: result.feedback.warning,
          suggestions: result.feedback.suggestions.slice(),
          patterns: [...new Set(result.sequence.map(match => match.pattern))]
        };
      }

      function meter(result, baseline = false) {
        const qualified = result.score >= 3 && result.length >= 15;
        return `<section class="pass-strength" data-testid="${baseline ? 'password-baseline-strength' : 'password-strength'}" data-score="${result.score}" data-length="${result.length}" aria-label="Estimated password strength"><div class="pass-strength-heading"><span>MODEL ESTIMATE</span><strong>${result.score} <small>/ 4</small> · ${labels[result.score]}</strong></div><div class="pass-meter" role="meter" aria-label="Offline strength estimate" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${result.score}" aria-valuetext="${escape(labels[result.score])}">${Array.from({ length: 5 }, (_, i) => `<i class="${i <= result.score ? 'is-filled' : ''}"></i>`).join('')}</div><div class="pass-checks"><span class="${result.length >= 15 ? 'is-met' : ''}">${icon(result.length >= 15 ? 'check' : 'close', 16)} ${result.length} characters · lab target: at least 15</span><span class="${result.score >= 3 ? 'is-met' : ''}">${icon(result.score >= 3 ? 'check' : 'close', 16)} Lab target: model score of at least 3</span></div>${!baseline ? `<p class="pass-target ${qualified ? 'is-met' : ''}">${qualified ? 'Lab target reached. Next, protect it properly.' : 'Keep experimenting. There is no penalty for practice.'}</p>` : ''}</section>`;
      }

      function header(title, copy) {
        return `<div class="game-intro"><span class="eyebrow">PASSWORD LAB</span><h2>${title}</h2><p>${copy}</p></div><ol class="pass-steps" aria-label="Lab progress">${['Inspect', 'Improve', 'Protect'].map((label, index) => `<li class="${index === step ? 'is-current' : index < step ? 'is-complete' : ''}" ${index === step ? 'aria-current="step"' : ''}><span>${index < step ? icon('check', 14) : `0${index + 1}`}</span>${label}</li>`).join('')}</ol>`;
      }

      function renderBaseline() {
        step = 0;
        let baseline;
        try { baseline = estimate('Estate2026!'); }
        catch (_) { renderUnavailable(); return; }
        container.innerHTML = `<div class="pass-game">${header('Looks complex. Is it unpredictable?', 'A capital letter, a year and a symbol can still form a familiar pattern.')}<div class="pass-inspect-grid"><section class="pass-example"><span class="pass-mini-label">FICTIONAL EXAMPLE · DO NOT USE</span><div class="pass-example-password"><span>Estate</span><span>2026</span><span>!</span></div><div class="pass-patterns"><span>Common word</span><span>Predictable year</span><span>Familiar ending</span></div>${meter(baseline, true)}</section><section class="pass-lesson"><span class="pass-lesson-icon">${icon('search', 30)}</span><h3>Patterns matter more than decoration.</h3><p>This candidate is only 11 characters long and follows a word–year–symbol pattern. Adding a symbol does not automatically make it hard to guess.</p><p>Long, unpredictable passwords or passphrases work better. Each account needs its own password.</p><button type="button" class="button button-primary" data-password-action="start" data-testid="password-start">Open the lab ${icon('arrow', 18)}</button></section></div><p class="pass-limit-note">Offline estimate powered by zxcvbn. It checks familiar patterns and context; it cannot certify a password or check whether you reuse it.</p></div>`;
      }

      function renderUnavailable() {
        container.innerHTML = `<div class="pass-game">${header('The lab needs its strength engine.', 'Reload the complete game package to use the offline password lab.')}<p class="feedback danger" role="alert">The local zxcvbn engine could not be loaded. No password has been submitted or saved.</p></div>`;
      }

      function renderLab() {
        step = 1;
        report = null;
        container.innerHTML = `<div class="pass-game">${header('Build a better fictional password.', 'Try, analyse and improve. Practice attempts are free: aim for at least 15 characters and an estimated score of 3 or 4.')}<div class="pass-lab-grid"><section class="pass-input-panel"><span class="pass-local-tag">${icon('lock', 15)} LOCAL PRACTICE ONLY</span><p class="pass-privacy">Use a made-up candidate. <strong>Do not enter a real password.</strong> This game sends and saves nothing you type.</p><form class="pass-form" data-password-form autocomplete="off"><label for="password-lab-input">Your fictional candidate</label><input id="password-lab-input" data-testid="password-input" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="128" aria-describedby="password-lab-hint password-lab-error"><p id="password-lab-hint" class="pass-input-hint">Try unrelated words or a random candidate. Spaces are allowed.</p><label class="pass-show"><input type="checkbox" data-password-show data-testid="password-show"><span>Show fictional candidate</span></label><p id="password-lab-error" class="pass-input-error" role="status" aria-live="polite"></p><button type="submit" class="button button-primary" data-testid="password-analyze">Analyse candidate ${icon('search', 18)}</button></form></section><section class="pass-analysis-panel" aria-label="Analysis result"><div data-password-analysis aria-live="polite"><div class="pass-analysis-empty">${icon('bolt', 34)}<h3>Ready for your experiment.</h3><p>Length, common words, repetition and keyboard patterns influence the estimate. Symbols alone are not the goal.</p></div></div><button type="button" class="button button-secondary pass-continue" data-password-action="continue" data-testid="password-continue" disabled>Choose how to protect it ${icon('arrow', 18)}</button></section></div><p class="pass-limit-note">This is a training target, not a guarantee of security. The estimate cannot confirm randomness, uniqueness, breaches or how an account is protected.</p></div>`;
        container.querySelector('[data-testid="password-input"]').focus({ preventScroll: true });
      }

      function analyse() {
        if (disposed || step !== 1) return;
        const input = container.querySelector('[data-testid="password-input"]');
        const error = container.querySelector('#password-lab-error');
        if (!input.value.length) {
          error.textContent = 'Enter a fictional candidate before analysing it.';
          input.setAttribute('aria-invalid', 'true');
          input.focus({ preventScroll: true });
          return;
        }
        try { report = estimate(input.value); }
        catch (_) { error.textContent = 'The local estimate is unavailable. Reload the complete game file.'; return; }
        error.textContent = '';
        input.removeAttribute('aria-invalid');
        const tips = report.suggestions.length ? report.suggestions : ['Use an approved manager to generate a unique password for each account.', 'For a passphrase, choose unrelated, unpredictable words rather than a familiar quote.'];
        container.querySelector('[data-password-analysis]').innerHTML = `${meter(report)}<div class="pass-analysis-tips"><h3>${report.warning ? 'A pattern to avoid' : 'Keep the bigger picture in mind'}</h3>${report.warning ? `<p>${escape(report.warning)}</p>` : ''}<ul>${tips.map(tip => `<li>${escape(tip)}</li>`).join('')}</ul></div>`;
        container.querySelector('[data-testid="password-continue"]').disabled = !(report.score >= 3 && report.length >= 15);
      }

      function renderManager() {
        const input = container.querySelector('[data-testid="password-input"]');
        if (input) input.value = '';
        report = null;
        step = 2;
        container.innerHTML = `<div class="pass-game">${header('Strong is a start. Unique is essential.', 'Choose the workflow that protects separate passwords for every account.')}<div class="pass-manager-meta"><span>FINAL DECISION</span><strong data-password-score>${score()} points available</strong></div><div class="pass-manager-grid"><section class="pass-vault"><div class="pass-vault-heading"><span class="pass-vault-icon">${icon('lock', 28)}</span><div><h3>KeePass</h3><span>Example · use only if company-approved</span></div></div><div class="pass-vault-status">${icon('shield', 16)} Encrypted password vault</div><div class="pass-vault-entries">${['Company portal', 'Travel account', 'Project workspace'].map((label, index) => `<div><span class="pass-vault-entry-icon">${icon(index === 0 ? 'user' : 'lock', 16)}</span><strong>${label}</strong><span>••••••••</span></div>`).join('')}</div><p>A manager can generate and store different passwords in an encrypted vault. Protect the vault with a strong master passphrase, lock it when away, and follow company rules for backups and any required key file.</p><span class="pass-vault-demo">ILLUSTRATION · NO PASSWORDS ARE SAVED HERE</span></section><section class="pass-manager-actions" role="group" tabindex="-1" aria-label="Choose a password management workflow"><button type="button" class="pass-manager-choice" data-password-manager="reuse" data-testid="password-manager-reuse"><span class="pass-choice-number">01</span><span><strong>Reuse one strong password everywhere</strong><small>It is long, so separate passwords seem unnecessary.</small></span></button><button type="button" class="pass-manager-choice" data-password-manager="approved" data-testid="password-manager-approved"><span class="pass-choice-number">02</span><span><strong>Generate unique passwords in the approved manager</strong><small>Use KeePass if approved; protect the encrypted vault with a strong master key.</small></span></button><button type="button" class="pass-manager-choice" data-password-manager="public" data-testid="password-manager-public"><span class="pass-choice-number">03</span><span><strong>Keep passwords in an unprotected shared note</strong><small>Copying them is convenient for everyone.</small></span></button></section></div><section class="pass-manager-feedback" data-password-feedback aria-live="polite"></section></div>`;
        container.querySelector('.pass-manager-actions').focus({ preventScroll: true });
      }

      function chooseManager(choice) {
        if (disposed || step !== 2 || solved || !['reuse', 'approved', 'public'].includes(choice)) return;
        const button = container.querySelector(`[data-password-manager="${choice}"]`);
        if (!button || button.disabled) return;
        const feedback = container.querySelector('[data-password-feedback]');
        if (choice !== 'approved') {
          mistakes.add(choice);
          button.disabled = true;
          button.classList.add('is-wrong');
          container.querySelector('[data-password-score]').textContent = `${score()} points available`;
          const explanation = choice === 'reuse' ? 'If one service is compromised, a reused password can put your other accounts at risk too. Use a different password for each account.' : 'An unprotected shared note exposes passwords to anyone who can access it. Use the company-approved manager and authorised sharing methods.';
          feedback.className = 'pass-manager-feedback feedback danger';
          feedback.innerHTML = `<h3>Change the workflow · −10 points</h3><p>${explanation} Try another choice.</p>`;
          return;
        }
        solved = true;
        button.classList.add('is-correct');
        container.querySelectorAll('[data-password-manager]').forEach(item => { item.disabled = true; });
        feedback.className = 'pass-manager-feedback feedback success';
        feedback.innerHTML = `<h3>Unique passwords. Protected vault.</h3><p>Use an approved password manager, generate a separate password for every account and protect the vault with a strong master passphrase. KeePass is one example when company policy allows it. Keep MFA enabled where available.</p><button type="button" class="button button-primary" data-password-action="finish" data-testid="password-finish">Complete the challenge ${icon('check', 18)}</button>`;
        feedback.querySelector('button').focus({ preventScroll: true });
      }

      const onClick = event => {
        if (disposed) return;
        const choice = event.target.closest('[data-password-manager]');
        if (choice && container.contains(choice)) chooseManager(choice.dataset.passwordManager);
        const action = event.target.closest('[data-password-action]');
        if (!action || !container.contains(action)) return;
        if (action.dataset.passwordAction === 'start' && step === 0) renderLab();
        if (action.dataset.passwordAction === 'continue' && step === 1 && report && report.score >= 3 && report.length >= 15) renderManager();
        if (action.dataset.passwordAction === 'finish' && step === 2 && solved && !finished) {
          finished = true;
          api.finish({ score: score(), maxScore: 100, lesson: 'Use long, unpredictable, unique passwords and an approved password manager. KeePass is one example when permitted: generate separate passwords and protect the encrypted vault with a strong master passphrase.' });
        }
      };
      const onSubmit = event => {
        if (!event.target.matches('[data-password-form]')) return;
        event.preventDefault();
        analyse();
      };
      const onInput = event => {
        if (disposed || step !== 1 || !event.target.matches('[data-testid="password-input"]')) return;
        report = null;
        event.target.removeAttribute('aria-invalid');
        container.querySelector('#password-lab-error').textContent = '';
        container.querySelector('[data-testid="password-continue"]').disabled = true;
        container.querySelector('[data-password-analysis]').innerHTML = `<div class="pass-analysis-empty">${icon('search', 32)}<h3>Analyse your new candidate.</h3><p>The estimate applies to the exact candidate you analyse. Changing it clears the previous result.</p></div>`;
      };
      const onChange = event => {
        if (disposed || !event.target.matches('[data-password-show]')) return;
        const input = container.querySelector('[data-testid="password-input"]');
        if (input) input.type = event.target.checked ? 'text' : 'password';
      };
      container.addEventListener('click', onClick);
      container.addEventListener('submit', onSubmit);
      container.addEventListener('input', onInput);
      container.addEventListener('change', onChange);
      renderBaseline();
      return () => {
        disposed = true;
        const input = container.querySelector('[data-testid="password-input"]');
        if (input) input.value = '';
        report = null;
        container.removeEventListener('click', onClick);
        container.removeEventListener('submit', onSubmit);
        container.removeEventListener('input', onInput);
        container.removeEventListener('change', onChange);
      };
    }
  };
})();
