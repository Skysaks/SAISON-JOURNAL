import base64, pathlib, re, subprocess, os
root = pathlib.Path(__file__).parent
shell = (root / 'shell.html').read_text(encoding='utf-8')
css = '\n'.join((root / 'css' / f).read_text(encoding='utf-8') for f in ['a.css', 'b.css', 'c.css'])
FONTS = root / 'tools' / 'node_modules' / '@fontsource-variable'


def font_face(pkg, family):
    """@font-face embarquée (sous-ensemble latin, police variable) : aucune requête réseau, rien ne sort
    vers un service tiers. Les fichiers viennent des paquets @fontsource-variable (SIL OFL 1.1)."""
    index = (FONTS / pkg / 'index.css').read_text(encoding='utf-8')
    block = re.search(r'/\* [\w-]+-latin-wght-normal \*/\s*@font-face \{(.*?)\}', index, re.S)
    assert block, f'{pkg} : sous-ensemble latin introuvable'
    body = block.group(1)
    weight = re.search(r'font-weight:\s*([^;]+);', body).group(1).strip()
    urange = re.search(r'unicode-range:\s*([^;]+);', body).group(1).strip()
    file = re.search(r'url\(\./files/([^)]+\.woff2)\)', body).group(1)
    data = base64.b64encode((FONTS / pkg / 'files' / file).read_bytes()).decode('ascii')
    return (f"@font-face{{font-family:'{family}';font-style:normal;font-display:swap;font-weight:{weight};"
            f"src:url(data:font/woff2;base64,{data}) format('woff2');"
            f"unicode-range:{urange};}}")


BODY_FONT = font_face('instrument-sans', 'Instrument Sans')

# Mention exigée par la SIL Open Font License pour les polices embarquées (textes complets : docs/licences/).
FONT_NOTICE = ('<!-- Polices embarquées, SIL Open Font License 1.1 (textes complets : docs/licences/ du dépôt) :\n'
               '     Big Shoulders Display © Google Inc. / The Big Shoulders Project Authors ;\n'
               '     Instrument Sans © 2022 The Instrument Sans Project Authors ;\n'
               '     Archivo Narrow © 2019 The Archivo Narrow Project Authors. -->\n')


def i18n(js_text, name):
    # textes visibles → tables FR/EN/ES (tools/build-i18n.js, traductions dans i18n/tr.json)
    src, out = root / 'dist' / f'{name}.js', root / 'dist' / f'{name}.i18n.js'
    src.write_text(js_text, encoding='utf-8')
    r = subprocess.run(['node', str(root / 'tools' / 'build-i18n.js'), str(src), str(out), str(root / 'dist' / f'{name}-units.json'), str(root / 'dist' / f'{name}-i18n.txt')], check=True, capture_output=True, text=True)
    print(name, r.stdout.strip())
    if 'manquantes en 0 / es 0' not in r.stdout:
        print('  ⚠ traductions manquantes : voir dist/' + name + '-i18n.txt')
    return out.read_text(encoding='utf-8')

def js_for(excl):
    files = sorted(p.name for p in (root / 'js').glob('*.js') if not p.name.endswith(excl))
    return '\n'.join((root / 'js' / f).read_text(encoding='utf-8') for f in files)

def check_offline(html, name):
    # La page ne doit rien charger d'un autre domaine : ni police, ni script, ni feuille de style.
    head = html.split('<body', 1)[0]
    assert not re.search(r'<(link|script)[^>]*\b(href|src)=["\']?https?:', head, re.I), f'{name} charge une ressource externe'
    assert 'fonts.googleapis' not in html and 'fonts.gstatic' not in html, f'{name} appelle encore Google Fonts'

# --- Football
js = i18n(js_for('.ligue.js'), 'app')
assert '</script' not in js.lower()
fonts = font_face('big-shoulders-display', 'Big Shoulders Display') + '\n' + BODY_FONT
out = shell.replace('<head>', '<head>\n' + FONT_NOTICE, 1).replace('/*__FONTS__*/', fonts).replace('/*__CSS__*/', css).replace('/*__JS__*/', js)
check_offline(out, 'ma-saison.html')
(root / 'dist' / 'ma-saison.html').write_text(out, encoding='utf-8')
print('foot', len(out))

# --- Ligue des Entrepreneurs (chaînes réécrites au build, code identique)
lj = root / 'dist' / 'ligue-app.js'
subprocess.run(['node', str(root / 'tools' / 'build-theme.js'), 'ligue', str(lj), str(root / 'dist' / 'ligue-report.txt')], check=True, env=dict(os.environ, EXCLUDE='.foot.js'))
ljs = i18n(lj.read_text(encoding='utf-8'), 'ligue-app')
assert '</script' not in ljs.lower()
lcss = css + '\n' + (root / 'css' / 'theme-ligue.css').read_text(encoding='utf-8')
lshell = shell.replace('<title>Ma Saison</title>', '<title>Ligue des Entrepreneurs</title>', 1)
lfonts = font_face('archivo-narrow', 'Archivo Narrow') + '\n' + BODY_FONT
lout = lshell.replace('<head>', '<head>\n' + FONT_NOTICE, 1).replace('/*__FONTS__*/', lfonts).replace('/*__CSS__*/', lcss).replace('/*__JS__*/', ljs)
assert "'Big Shoulders Display'" not in lout and 'Ligue des Entrepreneurs' in lout
check_offline(lout, 'ligue-des-entrepreneurs.html')
(root / 'dist' / 'ligue-des-entrepreneurs.html').write_text(lout, encoding='utf-8')
print('ligue', len(lout))
