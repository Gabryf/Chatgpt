"""Bundle the static game into one offline HTML file using the standard library."""
import argparse
import base64
import mimetypes
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def data_uri(path):
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return f'data:{mime};base64,{base64.b64encode(path.read_bytes()).decode("ascii")}'


def build(output):
    page = (ROOT / 'index.html').read_text(encoding='utf-8')
    scripts = []

    def stylesheet(match):
        css = (ROOT / match.group(1)).read_text(encoding='utf-8')
        css = re.sub(r"url\(['\"]?(assets/[^)'\"]+)['\"]?\)",
                     lambda asset: f'url("{data_uri(ROOT / asset.group(1))}")', css)
        return '<style>\n' + css + '\n</style>'

    def script(match):
        scripts.append((ROOT / match.group(1)).read_text(encoding='utf-8'))
        return ''

    page = re.sub(r'<link rel="stylesheet" href="([^"]+)">', stylesheet, page)
    page = re.sub(r'<script defer src="([^"]+)"></script>', script, page)
    page = re.sub(r'(?m)^[ \t]+$', '', page)
    page = re.sub(r'((?:src|href)=")(assets/[^"]+)(")',
                  lambda asset: asset.group(1) + data_uri(ROOT / asset.group(2)) + asset.group(3), page)
    code = '\n;\n'.join(scripts).replace('</script', '<\\/script')
    licences = '\n\n'.join((ROOT / 'assets' / name).read_text(encoding='utf-8')
                            for name in ['SOURCES.txt', 'OFL-Outfit.txt', 'CC0-Simple-Icons.md'])
    licences = licences.replace('--', '—')
    page = page.replace('</body>', f'<script>\n{code}\n</script>\n<!--\nBundled asset notices\n{licences}\n-->\n</body>')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(page, encoding='utf-8')
    print(f'Built {output.name}: {output.stat().st_size:,} bytes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', nargs='?', type=Path,
                        default=ROOT / 'Sunrise_Cyber_Play_EN.html')
    build(parser.parse_args().output)
