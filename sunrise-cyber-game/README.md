# Cyber Play — BIP × Sunrise

An English-language cybersecurity game for a company event: a wheel, three unique draws, and three challenges played in the order drawn.

## Getting started

Extract **the entire ZIP** into a folder and open `index.html` in an up-to-date browser. Fonts, icons and assets are local. No accounts, API keys, build step or Internet connection are needed.

`Sunrise_Cyber_Play_EN.html` in this project folder is a self-contained alternative: download and open it directly, without extracting anything.

On GitHub, use **Code → Download ZIP** to download the complete project, then extract it and open `sunrise-cyber-game/index.html`. To rebuild the single-file version after changing the source or assets, run `python3 tools/build_standalone.py` from the `sunrise-cyber-game` folder.

If your organisation’s browser policy prevents opening local files, serve the game folder locally:

```sh
python3 -m http.server 8000
```

Then open the local server in your browser. For an event stand, a screen resolution of at least 1280 × 900 is recommended. The interface also adapts to tablets and smartphones.

## How it works

1. Press **Spin the wheel** to draw the first game. An animation transfers it to the first card in your journey.
2. Spin twice more. Games already drawn cannot be selected again. Controls are locked during each spin to prevent multiple draws.
3. **Start** becomes available after the third spin. Games run from top to bottom, in the order drawn.
4. Read each challenge’s feedback and continue. At the end, you’ll see your score and a practical tip for each game.
5. **New spins, new challenges** resets the journey for the next participant.

The order, completed results and current game are stored only in `sessionStorage` in the browser tab. Refreshing resumes the current game from its beginning. No information is sent to a server. Password Lab is for made-up passwords only; the entered text is never stored, and is cleared on leaving or restarting the game. Always use **New spins, new challenges** before handing the device to the next participant. If the browser blocks storage, the game still works without refresh recovery.

## The nine games

| Game | Interaction |
| --- | --- |
| Cyber Impostor | Find the suspicious request among four messages in a simulated Teams group chat. |
| Spot the Risk | Find all three warning signs in a simulated Outlook inbox: the sender, urgency and link destination. Details have no visible quiz outlines before selection. |
| Cyber Timeline | Reconstruct all four attack stages one at a time, linking each event to its consequence. A new out-of-order choice costs 10 points at that step. |
| Choose Your Move | Choose an action and see how the Teams, MFA or AI scenario changes. |
| MFA Reflex | Handle five sign-in requests with reporting and an optional timer. |
| Safe or Suspicious? | Classify five visual scenes involving QR codes, Wi-Fi, AI, passwords and attachments. |
| Password Lab | Inspect a sample password, improve a made-up password with local feedback, and choose a safe password-manager workflow. |
| Drag & Drop Security | Match actions to Wi-Fi, MFA, USB and confidential-document situations. |
| Unlock the Screen | Find a Microsoft lookalike sender, inspect its letter substitution, compare an MFA request with your actual login, and rebuild the attack chain. |

Your journey score is the average of the three game scores, each normalised to 100. Each game explains its own rules; mistakes and retries affect scores differently according to the mechanics. This is an awareness activity, not an assessment of an employee’s competence.

All messages and addresses are simulations. Suspicious links are inactive. These are educational scenarios; references to IT reporting channels and approved tools should be aligned with Sunrise procedures before the event.

In Unlock the Screen, `support@rnicrosoft.com` writes to `mark.webber@sunrise.net`. The `r` + `n` imitate an `m`, and the email offers a fake Microsoft sign-in link. Finding the sender reveals an enlarged comparison with `microsoft.com`. Inspecting the link provides feedback without opening it or losing points. The MFA task contrasts a login to Sunrise Company Portal on the usual Windows PC with an approval prompt for Exchange Online on a new Android phone.

Password Lab uses the bundled zxcvbn estimator to identify common passwords and predictable patterns. Its 0–4 estimate is educational feedback, not proof that a password is secure, unique, or uncompromised. The lab target combines length and estimated guess resistance; it does not replace company policy. The final task explains unique, generated passwords and an approved password manager, using KeePass as an example. Only choices in that task affect the game score; password experiments are free.

## Hidden test mode

To try any game without drawing it:

1. With the game page focused, press **Ctrl + Shift + G** (**Cmd + Shift + G** on Mac). Alternatively, click or tap **Learn. Choose. Protect.** in the footer three times quickly.
2. Enter **`Gabriele&Alessia`** and select **Unlock games**.
3. Click any of the nine game cards. During a game, use **Restart game** to try again, **All games** to return to the catalogue, or the sidebar to switch games directly.
4. Select **Exit test mode** in the catalogue to lock it and return to the normal journey.

Test results are stored separately from the normal journey. Completed scores and draws are kept; returning to an unfinished normal game restarts that game. Test mode stays unlocked through refreshes in the same browser tab, until you exit it or close the tab. If browser storage is unavailable, refresh starts a new session.

This is a hidden testing shortcut in a static app. The code is visible in the source and is not a security boundary.

## Logos

The footer displays the BIP and Sunrise logos in white, directly on the dark background. A CSS filter changes only their displayed colour; the original vector artwork and transparent backgrounds are preserved. The former typographic placeholders have been replaced. Provenance and licences are in `assets/SOURCES.txt`. Rebuild the standalone HTML after replacing any asset.

The Teams and Outlook product icons and Microsoft four-colour symbol come from official Microsoft repositories. Their source URLs and notices are included in `assets/SOURCES.txt`. Teams conversations in **Cyber Impostor** and **Choose Your Move**, and Outlook emails in **Spot the Risk**, **Safe or Suspicious?** and **Unlock the Screen**, include simulated client interfaces. All links are inactive.

## Accessibility

Buttons work with Tab and Enter, dialogs close with Escape, and feedback is announced. Drag & Drop supports native dragging as well as selecting an action and then a situation with touch or keyboard. Unlock provides up/down buttons for reordering. MFA offers an untimed mode and pauses its countdown while a dialog is open. Animations are reduced when the operating system requests reduced motion.

## Customisation and maintenance

- `index.html`: structure, opening copy, footer and dialogs.
- `style.css`: colours, font, wheel and overall layout.
- `preview.css`: hidden test mode catalogue, controls and access dialog.
- `app.js`: draws, animation, game order, progression and results.
- `simulations.js`, `simulations.css`: shared Teams and Outlook screens, chat messages and email attachments.
- `games/detection.*`, `decision.*`, `interactive.*`, `password.*`: scenarios and mechanics.
- `assets/`: local assets and licences.
- `vendor/`: the bundled password estimator and its licence.
- `previews/`: screenshots of the English interface.
- `tools/build_standalone.py`: generates the single-file HTML alternative.

All runtime files are bundled locally; no installation or remote services are needed. To publish, upload the files to a static HTTPS host, retaining the folder structure. No backend service is required. The game does not include tracking, analytics or a shared leaderboard.

## Automated checks

For development only:

```sh
python3 -m pip install -r requirements-dev.txt
python3 -m playwright install chromium
python3 -m unittest discover -s tests -v
```

The runner uses system Chromium when available; set `CHROMIUM_PATH` to choose an executable. Tests manage their own local server and check all nine games in three complete journeys, unique draws, pointer alignment, the three-spin limit, game order, results, refresh, reset, dialogs, keyboard interaction and mobile layout after animations. Test mode checks cover access, all nine games, replay, refresh, mobile controls, timer cleanup and preservation of the normal journey. Regression checks also cover Timeline reconstruction, both Choose Your Move branches, the lookalike-domain explanation and MFA context in Unlock, Password Lab feedback and input cleanup, client logos and the single-file version without asset requests.
