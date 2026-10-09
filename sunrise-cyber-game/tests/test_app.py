"""Browser regression checks. Run: python3 -m unittest discover -s tests -v"""
import functools
import http.server
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
IDS = ['impostor', 'risk', 'timeline', 'move', 'mfa', 'classify', 'memory', 'drag', 'unlock']
TITLES = ['Cyber Impostor', 'Spot the Risk', 'Cyber Timeline', 'Choose Your Move',
          'MFA Reflex', 'Safe or Suspicious?', 'Cyber Memory', 'Drag & Drop Security', 'Unlock the Screen']


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class CyberPlayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(QuietHandler, directory=str(ROOT))
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

    def new_page(self, seed=None, width=1440):
        context = self.browser.new_context(viewport={'width': width, 'height': 960}, reduced_motion='reduce')
        if seed is not None:
            # Control only randomness in the browser test, never in the app itself.
            context.add_init_script(f'crypto.getRandomValues = array => {{ array[0] = {seed}; return array; }};')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(self.url)
        expect(page.locator('html')).to_have_attribute('lang', 'en')
        expect(page.locator('#start-button')).to_have_text('Start')
        self.addCleanup(context.close)
        return page, errors

    def draw_three(self, page):
        expect(page.locator('#start-button')).to_be_disabled()
        titles = []
        for count in range(1, 4):
            page.locator('#spin-button').click()
            expect(page.locator('.selection-card.picked')).to_have_count(count)
            if count < 3:
                expect(page.locator('#spin-button')).to_be_enabled()
                expect(page.locator('#start-button')).to_be_disabled()
            else:
                expect(page.locator('#start-button')).to_be_enabled()
            titles = page.locator('.selection-card.picked h3').all_text_contents()
            self.assertEqual(len(set(titles)), count)
            rotation = page.locator('#wheel').evaluate(r'el => parseFloat(el.style.transform.match(/rotate\(([^d]+)/)[1])')
            selected_index = TITLES.index(titles[-1])
            self.assertAlmostEqual((rotation + selected_index * 40) % 360, 0, places=3)
        expect(page.locator('#spin-button')).to_be_disabled()
        expect(page.locator('#spin-center')).to_be_disabled()
        page.locator('#spin-center').dispatch_event('click')
        expect(page.locator('.selection-card.picked')).to_have_count(3)
        return titles

    def solve(self, page, game):
        if game == 'impostor':
            page.locator('[data-message="impostor"]').click()
            page.locator('.det-finish').click()
        elif game == 'risk':
            page.locator('[data-risk="sender"]').click()
            page.locator('[data-risk="link"]').click()
            page.locator('.det-finish').click()
        elif game == 'timeline':
            page.locator('[data-event="entry"]').click()
            page.locator('.det-finish').click()
        elif game == 'move':
            page.locator('[data-dec-choice="verify"]').click()
            page.locator('[data-dec-action="next"]').click()
            page.locator('[data-dec-choice="approved"]').click()
            page.locator('[data-dec-action="finish"]').click()
        elif game == 'mfa':
            page.locator('[data-dec-action="start"]').click()
            for index, answer in enumerate(['approve', 'report', 'report', 'report', 'approve']):
                page.locator(f'[data-dec-answer="{answer}"]').click()
                page.locator(f'[data-dec-action="{"finish" if index == 4 else "next"}"]').click()
        elif game == 'classify':
            for index in range(5):
                case = page.locator('[data-dec-case]').get_attribute('data-dec-case')
                choice = 'safe' if case in ('ai', 'password') else 'suspicious'
                page.locator(f'[data-dec-classify="{choice}"]').click()
                page.locator(f'[data-dec-action="{"finish" if index == 4 else "next"}"]').click()
        elif game == 'memory':
            for pair in ['mfa', 'qr', 'usb', 'ai']:
                page.get_by_test_id(f'memory-card-{pair}-risk').click()
                page.get_by_test_id(f'memory-card-{pair}-action').click()
            page.get_by_test_id('memory-finish').click()
        elif game == 'drag':
            for pair in ['wifi', 'mfa', 'usb', 'ai']:
                page.get_by_test_id(f'drag-action-{pair}').click()
                page.get_by_test_id(f'drag-target-{pair}').click()
            page.get_by_test_id('drag-finish').click()
        elif game == 'unlock':
            page.get_by_test_id('unlock-anomaly-sender').click()
            page.get_by_test_id('unlock-next').click()
            page.get_by_test_id('unlock-move-report').click()
            page.get_by_test_id('unlock-next').click()
            for target, event in enumerate(['message', 'site', 'credentials', 'mfa']):
                order = page.locator('[data-event-id]').evaluate_all('(els) => els.map(el => el.dataset.eventId)')
                while order.index(event) > target:
                    page.get_by_test_id(f'unlock-order-{event}-up').click()
                    order = page.locator('[data-event-id]').evaluate_all('(els) => els.map(el => el.dataset.eventId)')
            page.get_by_test_id('unlock-verify').click()
            page.get_by_test_id('unlock-next').click()
        else:
            self.fail(f'Unknown game {game}')

    def test_all_nine_games_in_three_full_journeys(self):
        for seed in (0, 3, 6):
            with self.subTest(first_game=IDS[seed]):
                page, errors = self.new_page(seed)
                selected_titles = self.draw_three(page)
                self.assertEqual(selected_titles, TITLES[seed:seed+3])
                page.locator('#start-button').click()
                for index, game in enumerate(IDS[seed:seed+3]):
                    expect(page.locator('#game-title')).to_have_text(selected_titles[index])
                    expect(page.locator('.progress-step.active')).to_have_count(1)
                    self.assertNotRegex(page.locator('body').inner_text().lower(),
                                        r'\b(sfida|punteggio|rifiuta|segnala|sicuro|scegli|situazione|tentativi|giochi|richiesta|percorso|inizia)\b')
                    self.solve(page, game)
                    if index == 0:
                        page.reload()  # Next game and prior score survive refreshing.
                expect(page.locator('#results-screen')).to_be_visible()
                expect(page.locator('#total-score')).to_have_text('100')
                expect(page.locator('.result-card')).to_have_count(3)
                self.assertEqual(page.locator('.result-card h2').all_text_contents(), selected_titles)
                page.reload()
                expect(page.locator('#total-score')).to_have_text('100')
                page.locator('#play-again').click()
                expect(page.locator('#wheel-screen')).to_be_visible()
                expect(page.locator('.selection-card.picked')).to_have_count(0)
                expect(page.locator('#start-button')).to_be_disabled()
                self.assertEqual(errors, [])

    def test_random_selection_help_and_cancelled_exit(self):
        page, errors = self.new_page()
        titles = self.draw_three(page)
        page.reload()
        self.assertEqual(page.locator('.selection-card.picked h3').all_text_contents(), titles)
        expect(page.locator('#start-button')).to_be_enabled()
        page.locator('#help-button').click()
        expect(page.locator('#help-dialog')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.locator('#help-dialog')).not_to_be_visible()
        page.locator('#start-button').click()
        expect(page.locator('#game-title')).to_have_text(titles[0])
        page.locator('#exit-game').click()
        page.locator('#exit-dialog [data-close-dialog]').click()
        expect(page.locator('#game-title')).to_have_text(titles[0])
        page.locator('#exit-game').click()
        page.locator('#confirm-exit').click()
        expect(page.locator('.selection-card.picked')).to_have_count(0)
        self.assertEqual(errors, [])

    def test_small_screens_and_keyboard_selection(self):
        for width in (320, 390, 768):
            with self.subTest(width=width):
                page, errors = self.new_page(6, width)
                self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.draw_three(page)
                page.locator('#start-button').press('Enter')
                self.solve(page, 'memory')
                expect(page.locator('#game-title')).to_have_text('Drag & Drop Security')
                for pair in ['wifi', 'mfa', 'usb', 'ai']:
                    page.get_by_test_id(f'drag-action-{pair}').press('Enter')
                    page.get_by_test_id(f'drag-target-{pair}').press('Enter')
                self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                page.get_by_test_id('drag-finish').press('Enter')
                self.solve(page, 'unlock')
                expect(page.locator('#results-screen')).to_be_visible()
                self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.assertEqual(errors, [])

    def test_animated_wheel_survives_mobile_resize(self):
        page, errors = self.new_page()
        page.emulate_media(reduced_motion='no-preference')
        page.evaluate('''() => {
            const draws = [6, 3, 4];
            crypto.getRandomValues = array => { array[0] = draws.shift(); return array; };
        }''')
        selected = self.draw_three(page)
        self.assertEqual(selected, ['Cyber Memory', 'Choose Your Move', 'Safe or Suspicious?'])
        for width in (390, 320, 768):
            page.set_viewport_size({'width': width, 'height': 844})
            self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth'))
        self.assertEqual(errors, [])

    def test_standalone_html_runs_without_asset_requests(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'game.html'
            subprocess.run([sys.executable, str(ROOT / 'tools/build_standalone.py'), str(output)],
                           check=True, capture_output=True)
            bundle = output.read_text(encoding='utf-8')
            page, errors = self.new_page(6)
            requests = []
            standalone_url = self.url + '/standalone.html'
            page.route(standalone_url, lambda route: route.fulfill(body=bundle, content_type='text/html'))
            page.on('request', lambda request: requests.append(request.url))
            page.goto(standalone_url)
            expect(page.locator('html')).to_have_attribute('lang', 'en')
            self.assertTrue(page.locator('img').evaluate_all('(imgs) => imgs.every(img => img.complete && img.naturalWidth > 0)'))
            self.draw_three(page)
            page.locator('#start-button').click()
            for game in ['memory', 'drag', 'unlock']:
                self.solve(page, game)
            expect(page.locator('#total-score')).to_have_text('100')
            self.assertEqual(requests, [standalone_url])
            self.assertEqual(errors, [])


if __name__ == '__main__':
    unittest.main()
