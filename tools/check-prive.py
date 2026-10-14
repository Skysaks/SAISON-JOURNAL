"""Garde-fou avant publication : vérifie qu'aucune donnée personnelle ne traîne
dans le dépôt.

    python3 tools/check-prive.py .

L'application range tout ce qui te concerne dans sa base ou dans le stockage du
navigateur — jamais dans le code. Mais les textes d'exemple, les placeholders et
les jeux de test sont écrits à la main : c'est là que ça fuit. Complète la liste
TERMES avec ce qui t'est propre (nom, ville, employeurs, projets, personnes,
acronymes de ton métier) avant de publier quoi que ce soit.

Code de sortie 1 s'il reste une occurrence : utilisable tel quel en pré-commit.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()

# À compléter. Tout en minuscules : la recherche ne tient pas compte de la casse.
TERMES = [
    # ton identité
    # 'prénom', 'nom', 'pseudo', 'mon-compte-github', 'mon@adresse.tld',
    # tes lieux
    # 'ma ville', 'ma région',
    # tes projets, tes employeurs, les personnes que tu cites
    # 'mon-projet', 'mon-ancien-employeur', 'un prénom',
    # le vocabulaire propre à ton métier ou à ta saison réelle
    # 'un acronyme', 'un examen', 'un organisme',
    # ce qui ne doit jamais être publié
    'file_uuid', 'sk-ant-', 'sk-proj-', 'ghp_', 'github_pat_', 'bearer ',
]

# Termes personnels gardés hors du dépôt : un terme par ligne dans .prive-termes.txt (ignoré par git).
# Ainsi la liste de ce qui ne doit pas fuiter ne fuit pas elle-même dans un dépôt public.
_local = ROOT / '.prive-termes.txt'
if _local.exists():
    TERMES += [l.strip().lower() for l in _local.read_text(encoding='utf-8').splitlines() if l.strip() and not l.lstrip().startswith('#')]

# Faux positifs légitimes : (terme, expression régulière qui l'autorise)
EXCEPTIONS = []

# Fichiers où une mention est attendue (la mention de droits, par exemple).
ATTENDU = {'LICENSE': {'tous droits', 'all rights'}}

BINAIRES = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.zip', '.pdf'}
IGNORES = {'node_modules', '.git', '__pycache__'}
IGNORES_FICHIERS = {'.prive-termes.txt'}
MOI = pathlib.Path(__file__).resolve()

trouvailles = []
fichiers = 0

for p in sorted(ROOT.rglob('*')):
    if not p.is_file() or p.resolve() == MOI or p.name in IGNORES_FICHIERS or any(part in IGNORES for part in p.parts):
        continue
    if p.suffix.lower() in BINAIRES:
        continue
    rel = p.relative_to(ROOT)
    try:
        texte = p.read_text(encoding='utf-8')
    except (UnicodeDecodeError, OSError):
        trouvailles.append((rel, '—', 'fichier illisible en UTF-8'))
        continue
    fichiers += 1
    bas = texte.lower()
    for terme in TERMES:
        depart = 0
        while True:
            i = bas.find(terme, depart)
            if i < 0:
                break
            depart = i + 1
            extrait = texte[max(0, i - 45): i + len(terme) + 45].replace('\n', ' ')
            if any(t == terme and re.search(motif, extrait.lower()) for t, motif in EXCEPTIONS):
                continue
            if any(mot in extrait.lower() for mot in ATTENDU.get(str(rel), ())):
                continue
            ligne = texte[:i].count('\n') + 1
            trouvailles.append((rel, str(ligne), f'« {terme} » → …{extrait.strip()}…'))

if not TERMES or TERMES == ['file_uuid', 'sk-ant-', 'sk-proj-', 'ghp_', 'github_pat_', 'bearer ']:  # aucune liste locale
    print('⚠ La liste TERMES n’a pas été complétée : le contrôle ne vérifie que '
          'les secrets évidents. Ouvre ce fichier et ajoute ce qui t’est propre.\n')

print(f'{fichiers} fichiers texte scannés, {len(TERMES)} termes recherchés')
if trouvailles:
    print(f'\n❌ {len(trouvailles)} occurrence(s) à traiter\n')
    for rel, ligne, detail in trouvailles[:60]:
        print(f'  {rel}:{ligne}  {detail[:160]}')
    if len(trouvailles) > 60:
        print(f'  … et {len(trouvailles) - 60} autres')
    sys.exit(1)
print('\n✅ aucune trace personnelle')
