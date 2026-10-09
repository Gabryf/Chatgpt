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
    'memory': 'safe action',
    'drag': 'unknown USB',
    'unlock': 'Verify the source',
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
        expect(page.locator('.det-clue-counter')).to_have_text('1 of 2 clues')
        page.reload()
        expect(page.locator('#game-title')).to_have_text('Spot the Risk')
        expect(page.locator('.det-clue-counter')).to_have_text('0 of 2 clues')
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

        for count in (2, 3):
            page.locator('#spin-button').click()
            expect(page.locator('.selection-card.picked')).to_have_count(count)
            if count == 2:
                expect(page.locator('#spin-button')).to_be_enabled()
            else:
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
        expect(page.locator('#game-step')).to_have_text('CHALLENGE 02 / 03')
        self.assertEqual(self.stored(page, NORMAL_KEY), active_session)
        self.solve(page, 'risk')
        self.solve(page, 'timeline')
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
        expect(page.locator('.det-clue-counter')).to_have_text('0 of 2 clues')

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
