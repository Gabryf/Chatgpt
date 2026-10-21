"""Review-mode regression checks. Run: python3 -m unittest discover -s tests -p test_preview.py -v"""
import functools
import http.server
import os
from pathlib import Path
import re
import shutil
import threading
import unittest

from playwright.sync_api import expect, sync_playwright

import test_app


ROOT = Path(__file__).resolve().parents[1]
NORMAL_KEY = 'cyberplay-session-en-v2'
PREVIEW_KEY = 'cyberplay-preview-v1'
REVIEW_CODE = 'Gabriele&Alessia'
LESSON_WORDS = {
    'impostor': 'identity',
    'risk': 'domain',
    'timeline': 'Phishing',
    'move': 'approved tools',
    'mfa': 'unexpected MFA',
    'classify': 'context',
    'password': 'password manager',
    'drag': 'unknown USB',
    'unlock': 'lookalike domains',
}


class PreviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(test_app.QuietHandler, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'
        cls.pw = sync_playwright().start()
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        options = {'headless': True, 'args': ['--no-sandbox']}
        if executable:
            options['executable_path'] = executable
        cls.browser = cls.pw.chromium.launch(**options)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def new_page(self, width=1440, touch=False, clock=False):
        context = self.browser.new_context(
            viewport={'width': width, 'height': 960},
            reduced_motion='reduce', has_touch=touch,
        )
        context.add_init_script('crypto.getRandomValues = array => { array[0] = 0; return array; };')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        if clock:
            page.clock.install()
        page.goto(self.url)
        expect(page.locator('html')).to_have_attribute('lang', 'en')
        self.addCleanup(context.close)
        return page, errors

    def stored(self, page, key):
        return page.evaluate('key => sessionStorage.getItem(key)', key)

    def unlock(self, page, modifier='Control'):
        page.keyboard.press(f'{modifier}+Shift+G')
        expect(page.locator('#preview-access-dialog')).to_be_visible()
        page.locator('#preview-code').fill(REVIEW_CODE)
        page.locator('#preview-code').press('Enter')
        expect(page.locator('#preview-access-dialog')).not_to_be_visible()
        expect(page.locator('#preview-screen')).to_be_visible()
        expect(page.locator('#preview-nav')).to_be_visible()
        self.assertIsNotNone(self.stored(page, PREVIEW_KEY))

    def launch(self, page, game):
        page.locator(f'[data-preview-game="{game}"]').click()
        expect(page.locator('#preview-screen')).not_to_be_visible()
        expect(page.locator('#game-screen')).to_be_visible()
        expect(page.locator('#game-title')).to_have_text(test_app.TITLES[test_app.IDS.index(game)])
        expect(page.locator('#preview-restart')).to_be_visible()

    def solve(self, page, game):
        test_app.CyberPlayTests.solve(self, page, game)

    def assert_no_overflow(self, page):
        self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth'))

    def assert_simulated_client(self, page, client):
        return test_app.CyberPlayTests.assert_simulated_client(self, page, client)

    def assert_lab_password_is_not_stored(self, page, candidate):
        stored = page.evaluate('() => JSON.stringify({local: {...localStorage}, session: {...sessionStorage}})')
        self.assertNotIn(candidate, stored)

    def test_access_is_hidden_and_wrong_code_does_not_unlock(self):
        page, errors = self.new_page()
        expect(page.locator('#preview-screen')).not_to_be_visible()
        expect(page.locator('#preview-nav')).not_to_be_visible()
        self.assertIsNone(self.stored(page, PREVIEW_KEY))

        page.keyboard.press('Control+Shift+G')
        expect(page.locator('#preview-access-dialog')).to_be_visible()
        page.locator('#preview-code').fill('incorrect-review-code')
        page.locator('#preview-code').press('Enter')
        expect(page.locator('#preview-access-error')).to_be_visible()
        expect(page.locator('#preview-screen')).not_to_be_visible()
        expect(page.locator('#preview-nav')).not_to_be_visible()
        self.assertIsNone(self.stored(page, PREVIEW_KEY))

        page.locator('#preview-code').fill(REVIEW_CODE)
        page.locator('#preview-code').press('Enter')
        expect(page.locator('#preview-screen')).to_be_visible()
        expect(page.locator('[data-preview-game]')).to_have_count(9)
        expect(page.locator('#preview-nav')).to_be_visible()
        page.locator('#preview-exit').click()
        expect(page.locator('#wheel-screen')).to_be_visible()
        expect(page.locator('#preview-nav')).not_to_be_visible()
        self.assertIsNone(self.stored(page, PREVIEW_KEY))
        page.reload()
        expect(page.locator('#preview-screen')).not_to_be_visible()
        expect(page.locator('#preview-nav')).not_to_be_visible()
        self.assertEqual(errors, [])

    def test_all_nine_games_complete_independently(self):
        page, errors = self.new_page()
        normal_before = self.stored(page, NORMAL_KEY)
        self.unlock(page)
        expect(page.locator('[data-preview-game]')).to_have_count(9)
        self.assertEqual(
            set(page.locator('[data-preview-game]').evaluate_all('els => els.map(el => el.dataset.previewGame)')),
            set(test_app.IDS),
        )
        for game in test_app.IDS:
            with self.subTest(game=game):
                self.launch(page, game)
                self.solve(page, game)
                expect(page.locator('#preview-screen')).to_be_visible()
                expect(page.locator('#game-screen')).not_to_be_visible()
                expect(page.locator('#results-screen')).not_to_be_visible()
                expect(page.locator('#preview-result')).to_be_visible()
                expect(page.locator('#preview-result')).to_contain_text(re.compile(r'100\s*%'))
                expect(page.locator('#preview-result')).to_contain_text(LESSON_WORDS[game])
                self.assertEqual(self.stored(page, NORMAL_KEY), normal_before)
        self.assertEqual(errors, [])

    def test_risk_needs_three_independently_found_clues_without_hint_boxes(self):
        page, errors = self.new_page()
        self.unlock(page)
        self.launch(page, 'risk')
        expect(page.locator('.det-clue-counter')).to_have_text('0 of 3 clues')
        expect(page.locator('.det-finish')).not_to_be_visible()
        expect(page.locator('.det-risk-recap')).not_to_be_visible()

        for selector, label in (('.det-outlook-logo', 'Outlook'), ('.det-microsoft-logo', 'Microsoft')):
            logo = page.locator(f'.det-outlook img{selector}')
            expect(logo).to_have_count(1)
            expect(logo).to_have_attribute('alt', label)
            source = logo.get_attribute('src')
            self.assertTrue(source.startswith(('assets/', 'data:image/')), source)
            page.wait_for_function(
                'selector => { const img = document.querySelector(selector); return img.complete && img.naturalWidth > 0; }',
                arg=f'.det-outlook img{selector}',
            )

        # A mouse should not reveal the hidden quiz hit areas in the email.
        for clue in ('sender', 'urgency', 'recipient', 'date', 'signature'):
            with self.subTest(detail=clue):
                detail = page.locator(f'[data-risk="{clue}"]')
                for hovered in (False, True):
                    if hovered:
                        detail.hover()
                    style = detail.evaluate('''el => {
                        const style = getComputedStyle(el);
                        return {
                            borders: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
                            background: style.backgroundColor,
                            shadow: style.boxShadow,
                            outline: style.outlineStyle,
                        };
                    }''')
                    self.assertEqual(style['borders'], ['0px'] * 4)
                    self.assertEqual(style['background'], 'rgba(0, 0, 0, 0)')
                    self.assertEqual(style['shadow'], 'none')
                    self.assertEqual(style['outline'], 'none')

        # The invisible mouse hit areas must still have a visible keyboard focus ring.
        sender = page.locator('[data-risk="sender"]')
        sender.focus()
        page.keyboard.press('Tab')
        page.keyboard.press('Shift+Tab')
        self.assertTrue(sender.evaluate('el => el.matches(":focus-visible")'))
        focus = sender.evaluate('''el => {
            const style = getComputedStyle(el);
            return {width: parseFloat(style.outlineWidth), style: style.outlineStyle, color: style.outlineColor};
        }''')
        self.assertGreater(focus['width'], 0)
        self.assertNotEqual(focus['style'], 'none')
        self.assertNotIn(focus['color'], ('transparent', 'rgba(0, 0, 0, 0)'))

        date = page.locator('[data-risk="date"]')
        date.click()
        expect(page.locator('.det-risk-score')).to_have_text('80 points available')
        expect(page.locator('.det-clue-counter')).to_have_text('0 of 3 clues')
        for _ in range(2):
            date.dispatch_event('click')
        expect(page.locator('.det-risk-score')).to_have_text('80 points available')

        sender.click()
        expect(page.locator('.det-clue-counter')).to_have_text('1 of 3 clues')
        page.locator('[data-risk="link"]').click()
        expect(page.locator('.det-clue-counter')).to_have_text('2 of 3 clues')
        expect(page.locator('.det-finish')).not_to_be_visible()
        expect(page.locator('.det-risk-recap')).not_to_be_visible()
        urgency = page.locator('[data-risk="urgency"]')
        expect(urgency).to_be_enabled()
        self.assertFalse(urgency.evaluate('el => el.classList.contains("det-hotspot-correct")'))
        self.assertEqual(urgency.evaluate('el => getComputedStyle(el).backgroundColor'), 'rgba(0, 0, 0, 0)')

        urgency.press('Enter')
        expect(page.locator('.det-clue-counter')).to_have_text('3 of 3 clues')
        expect(page.locator('.det-finish')).to_be_visible()
        expect(page.locator('.det-risk-recap')).to_be_visible()
        page.locator('.det-finish').click()
        expect(page.locator('#preview-screen')).to_be_visible()
        expect(page.locator('#preview-result')).to_contain_text(re.compile(r'80\s*%'))
        expect(page.locator('#results-screen')).not_to_be_visible()
        self.assertEqual(errors, [])

    def test_timeline_requires_each_step_and_restart_clears_partial_reconstruction(self):
        page, errors = self.new_page()
        self.unlock(page)
        self.launch(page, 'timeline')
        expect(page.locator('.det-timeline-counter')).to_have_text('0 of 4 steps')
        expect(page.locator('.det-timeline-score')).to_have_text('100 points available')
        expect(page.locator('[data-chain-event]')).to_have_count(0)
        expect(page.locator('.det-finish')).not_to_be_visible()

        wrong = page.locator('[data-event="control"]')
        wrong.click()
        for _ in range(2):
            wrong.dispatch_event('click')
        expect(page.locator('.det-timeline-score')).to_have_text('90 points available')
        expect(page.locator('.det-timeline-counter')).to_have_text('0 of 4 steps')
        expect(page.locator('[data-chain-event]')).to_have_count(0)
        expect(page.locator('.det-finish')).not_to_be_visible()

        sequence = ['entry', 'credentials', 'mfa', 'control']
        for index, event in enumerate(sequence, start=1):
            page.locator(f'[data-event="{event}"]').press('Enter')
            expect(page.locator('.det-timeline-counter')).to_have_text(f'{index} of 4 steps')
            self.assertEqual(
                page.locator('[data-chain-event]').evaluate_all('els => els.map(el => el.dataset.chainEvent)'),
                sequence[:index],
            )
            if index < 4:
                expect(page.locator('.det-finish')).not_to_be_visible()
                expect(page.locator(f'[data-event="{sequence[index]}"]')).to_be_enabled()
        expect(page.locator('.det-timeline-score')).to_have_text('90 points available')
        expect(page.locator('.det-finish')).to_be_enabled()
        page.locator('.det-finish').click()
        expect(page.locator('#preview-result')).to_contain_text(re.compile(r'90\s*%'))

        page.locator('#preview-replay').click()
        page.locator('[data-event="control"]').click()
        expect(page.locator('.det-timeline-score')).to_have_text('90 points available')
        page.locator('[data-event="entry"]').click()
        page.locator('[data-event="control"]').click()
        page.locator('[data-event="control"]').dispatch_event('click')
        expect(page.locator('.det-timeline-score')).to_have_text('80 points available')
        expect(page.locator('.det-timeline-counter')).to_have_text('1 of 4 steps')
        old_button = page.locator('[data-event="credentials"]').element_handle()
        page.locator('#preview-restart').click()
        # A detached button from the prior mount must not answer the new game.
        old_button.dispatch_event('click')
        expect(page.locator('.det-timeline-counter')).to_have_text('0 of 4 steps')
        expect(page.locator('.det-timeline-score')).to_have_text('100 points available')
        expect(page.locator('[data-chain-event]')).to_have_count(0)
        expect(page.locator('.det-feedback')).not_to_be_visible()
        self.solve(page, 'timeline')
        expect(page.locator('#preview-result')).to_contain_text(re.compile(r'100\s*%'))
        self.assertEqual(errors, [])

    def test_choose_your_move_names_and_both_consequence_paths(self):
        for width in (1440, 320):
            for first_choice, second_name, second_choice, score in (
                ('verify', 'Anna Weber', 'approved', 100),
                ('send', 'Mark Keller', 'recover', 50),
            ):
                with self.subTest(width=width, branch=first_choice):
                    page, errors = self.new_page(width)
                    self.unlock(page)
                    self.launch(page, 'move')
                    screen = self.assert_simulated_client(page, 'teams')
                    expect(screen.locator('.sim-teams-chat-header strong')).to_have_text('Mark Keller')
                    expect(screen.locator('.sim-teams-message-meta strong')).to_have_text('Mark Keller')
                    expect(screen).to_contain_text('mark.keller@gmail.com')
                    self.assertNotRegex(screen.inner_text(), r'(?i)\b(?:Leadership|Customer operations)\b')
                    self.assert_no_overflow(page)
                    page.locator(f'[data-dec-choice="{first_choice}"]').click()
                    page.locator('[data-dec-action="next"]').click()
                    screen = self.assert_simulated_client(page, 'teams')
                    expect(screen.locator('.sim-teams-chat-header strong')).to_have_text(second_name)
                    expect(screen.locator('.sim-teams-message-meta strong')).to_have_text(second_name)
                    self.assertNotRegex(screen.inner_text(), r'(?i)\b(?:Leadership|Customer operations)\b')
                    self.assert_no_overflow(page)
                    page.locator(f'[data-dec-choice="{second_choice}"]').click()
                    page.locator('[data-dec-action="finish"]').click()
                    expect(page.locator('#preview-result')).to_contain_text(re.compile(rf'{score}\s*%'))
                    self.assertEqual(errors, [])

    def test_other_teams_and_outlook_screens_keep_game_interactions(self):
        for width in (1440, 320):
            with self.subTest(width=width):
                page, errors = self.new_page(width)
                self.unlock(page)
                self.launch(page, 'impostor')
                screen = self.assert_simulated_client(page, 'teams')
                expect(screen.locator('[data-message]')).to_have_count(4)
                expect(screen).to_contain_text('Mark Wilson')
                expect(screen).to_contain_text('director@sumrise.net')
                self.assert_no_overflow(page)
                self.solve(page, 'impostor')
                expect(page.locator('#preview-result')).to_contain_text(re.compile(r'100\s*%'))

                self.launch(page, 'classify')
                found_invoice = False
                for index in range(5):
                    case = page.locator('[data-dec-case]').get_attribute('data-dec-case')
                    if case == 'attachment':
                        found_invoice = True
                        screen = self.assert_simulated_client(page, 'outlook')
                        expect(screen).to_contain_text('October_invoice.xlsm')
                        expect(screen).to_contain_text('payments@urgent-invoices.example')
                        self.assert_no_overflow(page)
                    choice = 'safe' if case in ('ai', 'password') else 'suspicious'
                    page.locator(f'[data-dec-classify="{choice}"]').click()
                    page.locator(f'[data-dec-action="{"finish" if index == 4 else "next"}"]').click()
                self.assertTrue(found_invoice)
                expect(page.locator('#preview-result')).to_contain_text(re.compile(r'100\s*%'))

                self.launch(page, 'unlock')
                self.assert_simulated_client(page, 'outlook')
                self.assert_no_overflow(page)
                for detail in ('sender', 'time', 'logo'):
                    expect(page.get_by_test_id(f'unlock-anomaly-{detail}')).to_be_visible()
                page.get_by_test_id('unlock-anomaly-time').click()
                expect(page.get_by_test_id('unlock-anomaly-sender')).to_be_enabled()
                page.get_by_test_id('unlock-anomaly-sender').click()
                page.get_by_test_id('unlock-next').click()
                expect(page.get_by_test_id('unlock-move-report')).to_be_visible()
                self.assert_no_overflow(page)
                self.assertEqual(errors, [])

    def test_unlock_lookalike_domain_and_mismatching_mfa_are_checked_in_context(self):
        for width in (1440, 320):
            for wrong_choices in (False, True):
                with self.subTest(width=width, wrong_choices=wrong_choices):
                    page, errors = self.new_page(width)
                    self.unlock(page)
                    self.launch(page, 'unlock')
                    mail = self.assert_simulated_client(page, 'outlook')
                    sender = page.get_by_test_id('unlock-anomaly-sender')
                    expect(sender).to_have_text('support@rnicrosoft.com')
                    expect(mail).to_contain_text('mark.webber@sunrise.net')
                    link = page.get_by_test_id('unlock-anomaly-link')
                    expect(link).to_be_visible()
                    expect(link).to_contain_text('rnicrosoft.com')
                    self.assertIsNone(link.get_attribute('href'))
                    zoom = page.get_by_test_id('unlock-domain-zoom')
                    expect(zoom).not_to_be_visible()
                    expect(page.get_by_test_id('unlock-next')).not_to_be_visible()
                    self.assert_no_overflow(page)

                    original_url = page.url
                    outgoing_requests = []
                    page.on('request', lambda request: outgoing_requests.append(request.url)
                            if not request.url.startswith(self.url + '/') else None)
                    link.click()
                    self.assertEqual(page.url, original_url)
                    self.assertEqual(outgoing_requests, [])
                    expect(zoom).not_to_be_visible()
                    expect(page.get_by_test_id('unlock-next')).not_to_be_visible()
                    expect(sender).to_be_enabled()
                    if wrong_choices:
                        page.get_by_test_id('unlock-anomaly-time').click()
                        expect(zoom).not_to_be_visible()
                        expect(page.get_by_test_id('unlock-next')).not_to_be_visible()

                    sender.click()
                    expect(zoom).to_be_visible()
                    expect(zoom).to_contain_text('@rnicrosoft.com')
                    expect(zoom).to_contain_text('@microsoft.com')
                    expect(zoom).to_contain_text('r + n')
                    substitution = page.get_by_test_id('unlock-domain-substitution')
                    expect(substitution).to_have_text('rn')
                    box = substitution.evaluate('''el => {
                        const style = getComputedStyle(el);
                        return {width: parseFloat(style.borderTopWidth), style: style.borderTopStyle,
                                color: style.borderTopColor};
                    }''')
                    self.assertGreater(box['width'], 0)
                    self.assertEqual(box['style'], 'solid')
                    red, green, blue = map(float, re.findall(r'[\d.]+', box['color'])[:3])
                    self.assertGreater(red, green)
                    self.assertGreater(red, blue)
                    self.assert_no_overflow(page)
                    page.get_by_test_id('unlock-next').click()

                    context = page.get_by_test_id('unlock-login-context')
                    expect(context).to_contain_text('Sunrise Company Portal')
                    expect(context).to_contain_text('Windows PC')
                    notification = page.get_by_test_id('unlock-mfa-notification')
                    expect(notification).to_contain_text('Exchange Online')
                    expect(notification).to_contain_text('Android')
                    expect(page.get_by_test_id('unlock-next')).not_to_be_visible()
                    if wrong_choices:
                        page.get_by_test_id('unlock-move-approve').click()
                        expect(page.get_by_test_id('unlock-next')).not_to_be_visible()
                        expect(page.get_by_test_id('unlock-move-report')).to_be_enabled()
                    page.get_by_test_id('unlock-move-report').click()
                    expect(page.locator('[data-unlock-feedback]')).to_contain_text('denied')
                    expect(page.locator('[data-unlock-feedback]')).to_contain_text('Exchange Online')
                    expect(page.locator('[data-unlock-feedback]')).to_contain_text('Android')
                    expect(page.locator('[data-unlock-feedback]')).to_contain_text('does not match')
                    expect(page.locator('[data-unlock-feedback]')).to_contain_text('Report')
                    self.assert_no_overflow(page)
                    page.get_by_test_id('unlock-next').click()
                    test_app.CyberPlayTests.rebuild_unlock_attack(page)
                    expected_score = 80 if wrong_choices else 100
                    expect(page.locator('#preview-result')).to_contain_text(re.compile(rf'{expected_score}\s*%'))
                    self.assertEqual(errors, [])

    def test_password_lab_estimates_patterns_and_requires_safe_storage_choice(self):
        page, errors = self.new_page()
        self.unlock(page)
        self.launch(page, 'password')
        page.get_by_test_id('password-start').click()
        field = page.get_by_test_id('password-input')
        strength = page.get_by_test_id('password-strength')
        weak = 'passwordpasswordpasswordpassword'
        outgoing_requests = []
        page.on('request', lambda request: outgoing_requests.append(request.url)
                if not request.url.startswith(self.url + '/') else None)

        # Length alone must not make a repeated, common pattern strong.
        field.fill(weak)
        page.get_by_test_id('password-analyze').click()
        self.assertLessEqual(int(strength.get_attribute('data-score')), 1)
        expect(page.get_by_test_id('password-continue')).to_be_disabled()
        self.assert_lab_password_is_not_stored(page, weak)

        # Cosmetic complexity must not make a name + digits + symbol pattern good.
        predictable = 'Alessia1234$'
        field.fill(predictable)
        page.get_by_test_id('password-analyze').click()
        self.assertLessEqual(int(strength.get_attribute('data-score')), 1)
        expect(page.get_by_test_id('password-continue')).to_be_disabled()
        expect(page.locator('[data-password-analysis]')).to_contain_text('predictable pattern')
        self.assert_lab_password_is_not_stored(page, predictable)

        field.fill(test_app.LAB_PASSWORD)
        page.get_by_test_id('password-analyze').click()
        self.assertGreaterEqual(int(strength.get_attribute('data-score')), 3)
        expect(page.get_by_test_id('password-continue')).to_be_enabled()
        self.assert_lab_password_is_not_stored(page, test_app.LAB_PASSWORD)
        field.fill(weak)
        expect(page.get_by_test_id('password-continue')).to_be_disabled()
        expect(strength).not_to_be_visible()
        field.fill(test_app.LAB_PASSWORD)
        page.get_by_test_id('password-analyze').click()
        expect(page.get_by_test_id('password-continue')).to_be_enabled()
        old_field = field.element_handle()
        page.get_by_test_id('password-continue').click()
        self.assertEqual(old_field.input_value(), '')
        expect(page.get_by_test_id('password-manager-approved')).to_contain_text('KeePass')
        expect(page.get_by_test_id('password-finish')).not_to_be_visible()
        page.get_by_test_id('password-manager-reuse').click()
        page.get_by_test_id('password-manager-reuse').dispatch_event('click')
        expect(page.get_by_test_id('password-finish')).not_to_be_visible()
        page.get_by_test_id('password-manager-public').click()
        page.get_by_test_id('password-manager-approved').click()
        page.get_by_test_id('password-finish').click()
        expect(page.locator('#preview-result')).to_contain_text(re.compile(r'80\s*%'))
        expect(page.locator('#preview-result')).to_contain_text('password manager')
        self.assertNotIn(test_app.LAB_PASSWORD, page.locator('#preview-result').inner_text())
        self.assert_lab_password_is_not_stored(page, test_app.LAB_PASSWORD)
        self.assertEqual(outgoing_requests, [])
        self.assertEqual(errors, [])

    def test_password_lab_clears_typed_candidate_on_restart_and_exit(self):
        for action in ('restart', 'exit'):
            with self.subTest(action=action):
                page, errors = self.new_page(320)
                self.unlock(page)
                self.launch(page, 'password')
                page.get_by_test_id('password-start').click()
                field = page.get_by_test_id('password-input')
                expect(field).to_have_value('')
                field.fill(test_app.LAB_PASSWORD)
                page.get_by_test_id('password-analyze').click()
                self.assert_no_overflow(page)
                self.assert_lab_password_is_not_stored(page, test_app.LAB_PASSWORD)
                old_field = field.element_handle()
                if action == 'restart':
                    page.locator('#preview-restart').click()
                else:
                    page.locator('#exit-game').click()
                    self.launch(page, 'password')
                self.assertEqual(old_field.input_value(), '')
                page.get_by_test_id('password-start').click()
                expect(page.get_by_test_id('password-input')).to_have_value('')
                expect(page.get_by_test_id('password-continue')).to_be_disabled()
                self.assert_lab_password_is_not_stored(page, test_app.LAB_PASSWORD)
                self.assert_no_overflow(page)
                self.assertEqual(errors, [])

    def test_restart_and_reload_restore_review_without_stale_answers(self):
        page, errors = self.new_page()
        self.unlock(page)
        self.launch(page, 'impostor')
        page.locator('[data-message="meeting"]').click()
        expect(page.locator('.det-feedback')).to_be_visible()
        page.locator('#preview-restart').click()
        expect(page.locator('#game-title')).to_have_text('Cyber Impostor')
        expect(page.locator('.det-message:enabled')).to_have_count(4)
        expect(page.locator('.det-feedback')).not_to_be_visible()
        self.solve(page, 'impostor')
        expect(page.locator('#preview-result')).to_contain_text(re.compile(r'100\s*%'))

        page.reload()
        expect(page.locator('#preview-screen')).to_be_visible()
        expect(page.locator('#preview-nav')).to_be_visible()
        self.launch(page, 'risk')
        page.locator('[data-risk="sender"]').click()
        expect(page.locator('.det-clue-counter')).to_have_text('1 of 3 clues')
        page.reload()
        expect(page.locator('#game-title')).to_have_text('Spot the Risk')
        expect(page.locator('.det-clue-counter')).to_have_text('0 of 3 clues')
        expect(page.locator('[data-risk="sender"]')).to_be_enabled()
        page.locator('#preview-nav').click()
        expect(page.locator('#preview-screen')).to_be_visible()
        expect(page.locator('#game-screen')).not_to_be_visible()
        page.locator('#preview-exit').click()
        self.assertIsNone(self.stored(page, PREVIEW_KEY))
        self.assertEqual(errors, [])

    def test_triple_tap_and_review_controls_fit_small_screens(self):
        for width in (320, 390):
            with self.subTest(width=width):
                page, errors = self.new_page(width, touch=True)
                self.assert_no_overflow(page)
                for _ in range(2):
                    page.locator('#preview-entry').tap()
                    expect(page.locator('#preview-access-dialog')).not_to_be_visible()
                page.locator('#preview-entry').tap()
                expect(page.locator('#preview-access-dialog')).to_be_visible()
                self.assert_no_overflow(page)
                page.locator('#preview-code').fill(REVIEW_CODE)
                page.locator('#preview-code').press('Enter')
                expect(page.locator('#preview-screen')).to_be_visible()
                self.assert_no_overflow(page)
                for game in test_app.IDS:
                    with self.subTest(game=game):
                        self.launch(page, game)
                        self.assert_no_overflow(page)
                        page.locator('#exit-game').tap()
                        expect(page.locator('#preview-screen')).to_be_visible()
                        expect(page.locator('#exit-dialog')).not_to_be_visible()
                self.assert_no_overflow(page)
                page.locator('#preview-exit').tap()
                expect(page.locator('#wheel-screen')).to_be_visible()
                expect(page.locator('#preview-nav')).not_to_be_visible()
                self.assertEqual(errors, [])

    def test_review_preserves_partial_draws_and_active_normal_journey(self):
        page, errors = self.new_page()
        page.locator('#spin-button').click()
        expect(page.locator('.selection-card.picked')).to_have_count(1)
        expect(page.locator('#spin-button')).to_be_enabled()
        partial_titles = page.locator('.selection-card.picked h3').all_text_contents()
        partial_session = self.stored(page, NORMAL_KEY)
        self.assertIsNotNone(partial_session)
        self.unlock(page)
        self.launch(page, 'timeline')
        self.solve(page, 'timeline')
        self.assertEqual(self.stored(page, NORMAL_KEY), partial_session)
        page.reload()
        expect(page.locator('#preview-screen')).to_be_visible()
        page.locator('#preview-exit').click()
        expect(page.locator('#wheel-screen')).to_be_visible()
        self.assertEqual(page.locator('.selection-card.picked h3').all_text_contents(), partial_titles)
        expect(page.locator('#start-button')).to_be_disabled()
        self.assertEqual(self.stored(page, NORMAL_KEY), partial_session)

        page.locator('#spin-button').click()
        expect(page.locator('.selection-card.picked')).to_have_count(2)
        expect(page.locator('#spin-button')).to_be_disabled()
        expect(page.locator('#start-button')).to_be_enabled()
        page.locator('#start-button').click()
        self.solve(page, 'impostor')
        expect(page.locator('#game-title')).to_have_text('Spot the Risk')
        active_session = self.stored(page, NORMAL_KEY)
        self.unlock(page, modifier='Meta')
        self.launch(page, 'drag')
        self.solve(page, 'drag')
        self.assertEqual(self.stored(page, NORMAL_KEY), active_session)
        page.locator('#preview-exit').click()
        expect(page.locator('#game-screen')).to_be_visible()
        expect(page.locator('#game-title')).to_have_text('Spot the Risk')
        expect(page.locator('#game-step')).to_have_text('CHALLENGE 02 / 02')
        self.assertEqual(self.stored(page, NORMAL_KEY), active_session)
        self.solve(page, 'risk')
        expect(page.locator('#results-screen')).to_be_visible()
        expect(page.locator('#total-score')).to_have_text('100')
        self.assertIsNone(self.stored(page, PREVIEW_KEY))
        self.assertEqual(errors, [])

    def test_mfa_countdown_is_cleaned_up_when_switching_and_restarting(self):
        page, errors = self.new_page(clock=True)
        self.unlock(page)
        self.launch(page, 'mfa')
        page.locator('[data-dec-action="start"]').click()
        page.clock.run_for(700)
        expect(page.locator('[data-dec-answer="approve"]')).to_be_enabled()
        page.clock.run_for(1000)
        self.assertLess(int(page.locator('.dec-seconds').inner_text()), 16)
        page.locator('#exit-game').click()
        expect(page.locator('#preview-screen')).to_be_visible()
        self.launch(page, 'risk')
        before = page.locator('#game-content').inner_text()
        page.clock.run_for(20_000)
        expect(page.locator('#game-title')).to_have_text('Spot the Risk')
        self.assertEqual(page.locator('#game-content').inner_text(), before)
        expect(page.locator('.det-clue-counter')).to_have_text('0 of 3 clues')

        page.locator('#exit-game').click()
        self.launch(page, 'mfa')
        page.locator('[data-dec-action="start"]').click()
        page.clock.run_for(700)
        page.locator('#preview-restart').click()
        page.clock.run_for(20_000)
        expect(page.locator('[data-dec-action="start"]')).to_be_visible()
        expect(page.locator('[data-dec-answer]')).to_have_count(0)
        expect(page.locator('#game-title')).to_have_text('MFA Reflex')
        self.assertEqual(errors, [])


if __name__ == '__main__':
    unittest.main()
