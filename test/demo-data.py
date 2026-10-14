"""Jeu de démonstration — aucune donnée réelle, tout est inventé et déterministe.

    python3 test/demo-data.py

Écrit deux fichiers :
  dist/demo.json          données de démonstration (vocabulaire quelconque, sert aux tests Football)
  dist/demo-neutral.json  les mêmes, avec les titres remplacés par « Titre 1, Titre 2… »
                          pour la version Ligue des Entrepreneurs, dont les tests vérifient
                          qu'aucun mot de football ne subsiste à l'écran.

Le jeu couvre volontairement tous les cas que l'application sait traiter : une saison en
cours, quatre semaines jouées avec des victoires, des nuls, des défaites, deux forfaits et
une trêve, une compo complète, des quêtes en retard et bloquées, des objectifs tenus et à
risque, des lectures annotées, un réseau à relancer, deux Cups et un bilan de semaine.
"""
import json
import pathlib
import random
from datetime import date, timedelta

ROOT = pathlib.Path(__file__).resolve().parent.parent
TODAY = date(2026, 9, 22)          # lundi : les tests figent l'horloge à cette date
START = TODAY - timedelta(days=28)  # la saison a quatre semaines
RNG = random.Random(20260922)       # déterministe : deux exécutions donnent le même fichier

k = lambda d: d.isoformat()
ago = lambda n: k(TODAY - timedelta(days=n))
TS = 1790000000000


def iso_week(d):
    y, w, _ = d.isocalendar()
    return f'{y}-W{w:02d}'


# --------------------------------------------------------------- projets (la compo)
PROJECTS = [
    ('p-produit', 'Lancer mon produit', 'capitaine', 1, "Le projet qui doit payer. Première version vendue avant la fin de la saison."),
    ('p-ecrire', 'Écrire chaque semaine', 'titulaire', 2, "Publier pour exister : une page par semaine, lisible par quelqu'un d'autre que moi."),
    ('p-sport', 'Remettre le corps en marche', 'titulaire', 3, "Trois séances par semaine, sans exception et sans héroïsme."),
    ('p-finances', 'Mettre les comptes au clair', 'banc', 4, "Savoir ce qui rentre et ce qui sort, au mois près."),
    ('p-langue', 'Reprendre l’espagnol', 'banc', 5, "Vingt minutes par jour, uniquement quand le reste est fait."),
    ('p-maison', 'Finir les travaux', 'tribune', 6, "Rangé volontairement hors de la compo jusqu’au printemps."),
]

# --------------------------------------------------------------- routine
HABITS = [
    ('h-lever', 'Lever avant 7 h', 'matin', [1, 2, 3, 4, 5], 10, None),
    ('h-plan', 'Choisir les 3 coups de la journée', 'matin', [1, 2, 3, 4, 5], 10, None),
    ('h-profond', 'Un bloc profond de 90 minutes', 'journee', [1, 2, 3, 4, 5], 20, 'p-produit'),
    ('h-sport', 'Séance de sport', 'journee', [1, 3, 5], 20, 'p-sport'),
    ('h-lecture', 'Vingt pages', 'soir', [1, 2, 3, 4, 5, 6, 7], 10, 'esprit'),
    ('h-ecran', 'Écrans coupés après 22 h 30', 'soir', [1, 2, 3, 4, 5], 10, 'corps'),
]

# --------------------------------------------------------------- quêtes
# (id, titre, domaine, type, priorité, échéance en jours depuis aujourd'hui, faite il y a N jours, reports)
QUESTS = [
    ('q-01', 'Publier la page de vente', 'p-produit', 'livrer', 'critique', 3, None, 0),
    ('q-02', 'Appeler cinq clients potentiels', 'p-produit', 'terrain', 'importante', 1, None, 3),
    ('q-03', 'Écrire la page de cette semaine', 'p-ecrire', 'livrer', 'normale', 2, None, 0),
    ('q-04', 'Préparer le plan éditorial du mois', 'p-ecrire', 'fond', 'normale', 9, None, 0),
    ('q-05', 'Reprendre la séance longue du dimanche', 'p-sport', 'fond', 'faible', None, None, 0),
    ('q-06', 'Classer les justificatifs du trimestre', 'p-finances', 'fond', 'normale', -4, None, 1),
    ('q-07', 'Comparer deux offres bancaires', 'p-finances', 'fond', 'normale', -9, None, 4),
    ('q-08', 'Demander un retour sur la maquette', 'p-produit', 'terrain', 'importante', -2, None, 0),
    ('q-09', 'Trier la boîte mail en retard', 'argent', 'fond', 'faible', -6, None, 2),
    ('q-10', 'Réserver le créneau de piscine', 'corps', 'fond', 'faible', 5, None, 0),
    ('q-11', 'Envoyer la facture du mois', 'argent', 'livrer', 'importante', 4, None, 0),
    ('q-12', 'Rappeler deux anciens collègues', 'liens', 'terrain', 'normale', 7, None, 0),
    ('q-13', 'Relire le chapitre annoté', 'esprit', 'fond', 'normale', None, None, 0),
    ('q-20', 'Maquette de la page de vente', 'p-produit', 'livrer', 'importante', None, 2, 0),
    ('q-21', 'Premier appel de découverte', 'p-produit', 'terrain', 'importante', None, 4, 0),
    ('q-22', 'Mettre le tableur de trésorerie à jour', 'p-finances', 'fond', 'normale', None, 6, 0),
    ('q-23', 'Publier la page de la semaine passée', 'p-ecrire', 'livrer', 'normale', None, 8, 0),
    ('q-24', 'Séance de fractionné', 'p-sport', 'fond', 'normale', None, 9, 0),
    ('q-25', 'Prendre rendez-vous chez le médecin', 'corps', 'terrain', 'normale', None, 12, 0),
    ('q-26', 'Faire le point sur les abonnements', 'argent', 'fond', 'faible', None, 15, 0),
    ('q-27', 'Déjeuner avec un ancien associé', 'liens', 'terrain', 'normale', None, 18, 0),
    ('q-28', 'Lire les deux premiers chapitres', 'esprit', 'fond', 'normale', None, 21, 0),
]

# --------------------------------------------------------------- objectifs
GOALS = [
    ('g-s1', 'Première vente encaissée', 'saison', 'p-produit', 1, 0),
    ('g-s2', 'Vingt pages publiées', 'saison', 'p-ecrire', 20, 6),
    ('g-s3', 'Soixante séances de sport', 'saison', 'p-sport', 60, 11),
    ('g-m1', 'Trois appels de découverte', 'mois', 'p-produit', 3, 1),
    ('g-m2', 'Quatre pages publiées', 'mois', 'p-ecrire', 4, 2),
    ('g-m3', 'Comptes du trimestre à jour', 'mois', 'p-finances', 1, 0),
    ('g-w1', 'Page de vente en ligne', 'semaine', 'p-produit', 1, 0),
    ('g-w2', 'Une page écrite', 'semaine', 'p-ecrire', 1, 0),
    ('g-w3', 'Trois séances', 'semaine', 'p-sport', 3, 1),
]

# --------------------------------------------------------------- bibliothèque
LIBRARY = [
    ('k-01', 'Le petit livre des grandes décisions', 'A. Marchand', 'livre', 'esprit', 'en_cours', 248, 96, [
        ('citation', 42, 'Une décision réversible se prend vite ; une décision irréversible se prend deux fois.'),
        ('idee', 58, 'Le coût d’une erreur dépend moins de sa taille que de la facilité à revenir en arrière.'),
        ('action', 61, 'Classer les trois décisions en cours selon leur réversibilité avant vendredi.'),
    ]),
    ('k-02', 'Vendre sans se renier', 'C. Belin', 'livre', 'p-produit', 'termine', 190, 190, [
        ('idee', 23, 'Poser la question qui fait dire non plus vite qu’elle ne fait dire oui.'),
        ('desaccord', 77, 'L’auteur conseille d’appeler à froid tous les jours : intenable en parallèle d’un autre métier.'),
    ]),
    ('k-03', 'Comment lire un bilan comptable', 'Institut de gestion', 'cours', 'p-finances', 'a_lire', 0, 0, []),
]

# --------------------------------------------------------------- réseau
CONTACTS = [
    ('c-01', 'Camille Roux', 'partenaire', 'Atelier Nord', 14, 20, 'Lui envoyer la maquette', ['produit']),
    ('c-02', 'Sami Lefèvre', 'autre', 'Indépendant', 30, 45, 'Proposer un échange sur la tarification', ['conseil']),
    ('c-03', 'Noor Benali', 'partenaire', 'Studio Clair', 30, 12, 'Relancer après le devis', ['produit', 'design']),
    ('c-04', 'Elias Gautier', 'autre', None, 60, None, 'Reprendre contact, aucun échange depuis le début', []),
]


def build():
    d = {c: {} for c in ['settings', 'seasons', 'matches', 'quests', 'projects', 'goals', 'habits', 'xp_events',
                         'contacts', 'knowledge_items', 'reviews', 'achievements', 'cups', 'log', 'finance',
                         'mood', 'rewards', 'agent']}

    d['settings']['main'] = {
        'profile': "Jeu de démonstration. Remplace ce texte par ton propre contexte dans Réglages › Avancé : "
                   "qui tu es, ce que tu vises, tes points de vigilance. Il est lu avant chaque analyse.",
        'clubName': '',
        'rulesVersion': 1,
        'rulesLog': [{'v': 1, 'from': k(START), 'what': 'règles initiales'}],
    }

    d['seasons']['s-demo'] = {
        'name': 'Saison de démonstration',
        'start': k(START), 'end': k(START + timedelta(days=280)),
        'vision': "Vivre de ce que je construis, sans dépendre d’un employeur.",
        'cap': "Avant la fin du trimestre : produit en ligne, trois clients payants, comptes à jour.",
        'capStart': k(START), 'capDeadline': k(TODAY + timedelta(days=62)),
        'capMilestones': [
            {'id': 'm1', 'title': 'Page de vente en ligne', 'due': ago(-10), 'done': False, 'doneDate': None},
            {'id': 'm2', 'title': 'Premier client payant', 'due': ago(-30), 'done': False, 'doneDate': None},
            {'id': 'm3', 'title': 'Trois clients payants', 'due': ago(-62), 'done': False, 'doneDate': None},
            {'id': 'm4', 'title': 'Comptes du trimestre à jour', 'due': ago(-20), 'done': True, 'doneDate': ago(6)},
        ],
        'restPerWeek': 1,
    }

    for pid, name, status, order, why in PROJECTS:
        d['projects'][pid] = {'name': name, 'why': why, 'order': order,
                              'statusLog': [{'from': '2000-01-01', 'status': status}]}

    for hid, name, block, days, xp, area in HABITS:
        d['habits'][hid] = {'name': name, 'block': block, 'xp': xp, 'area': area,
                            'createdAt': k(START), 'order': HABITS.index((hid, name, block, days, xp, area)),
                            'sched': [{'from': k(START), 'days': days}]}

    for qid, title, area, kind, prio, due, done_ago, postponed in QUESTS:
        d['quests'][qid] = {
            'title': title, 'area': area, 'kind': kind, 'prio': prio,
            'due': ago(-due) if due is not None else None,
            'goal': None, 'done': done_ago is not None,
            'doneDate': ago(done_ago) if done_ago is not None else None,
            'doneTs': TS if done_ago is not None else None,
            'planned': True if done_ago is not None else None,
            'xp': 0, 'createdAt': k(START), 'createdTs': TS, 'postponed': postponed,
            'history': [], 'source': None, 'repeat': None, 'nextId': None,
        }

    for gid, title, horizon, area, target, current in GOALS:
        period = ('s-demo' if horizon == 'saison'
                  else TODAY.strftime('%Y-%m') if horizon == 'mois'
                  else iso_week(TODAY))
        d['goals'][gid] = {'title': title, 'horizon': horizon, 'period': period, 'area': area,
                           'parent': None, 'target': target, 'current': current, 'unit': '',
                           'due': None, 'done': False, 'doneDate': None, 'createdAt': k(START)}

    for kid, title, author, kind, area, status, pages, page, notes in LIBRARY:
        d['knowledge_items'][kid] = {
            'title': title, 'author': author, 'kind': kind, 'area': area, 'status': status,
            'pages': pages or None, 'page': page or 0,
            'progress': round(page / pages * 100) if pages else 0,
            'progressDate': ago(3) if status == 'en_cours' else None,
            'startedDate': ago(20) if status != 'a_lire' else None,
            'finishedDate': ago(5) if status == 'termine' else None,
            'takeaway': 'Poser la question qui fait dire non.' if status == 'termine' else '',
            'action': 'Réécrire les deux premières questions de mon appel de découverte.' if status == 'termine' else '',
            'applied': False, 'appliedDate': None, 'questId': None, 'note': '', 'rating': 4 if status == 'termine' else 0,
            'url': '', 'createdAt': k(START),
            'notes': [{'id': f'{kid}-n{i}', 'd': ago(3 + i * 4), 'ts': TS, 'type': t, 'page': p,
                       'text': txt, 'fav': t == 'citation', 'questId': None}
                      for i, (t, p, txt) in enumerate(notes)],
        }

    for cid, name, role, org, cadence, last_ago, nxt, tags in CONTACTS:
        d['contacts'][cid] = {
            'name': name, 'role': role, 'org': org, 'cadence': cadence, 'tags': tags,
            'next': nxt, 'notes': '', 'questId': None, 'createdAt': k(START),
            'log': ([{'date': ago(last_ago), 'note': 'Premier échange.'}] if last_ago is not None else []),
        }

    d['cups']['cup-lancement'] = {
        'name': 'Cup du lancement', 'area': 'p-produit', 'season': 's-demo', 'order': 1,
        'done': False, 'doneDate': None,
        'milestones': [
            {'id': 'c1', 'title': 'Maquette validée', 'due': None, 'done': True, 'doneDate': ago(12)},
            {'id': 'c2', 'title': 'Page de vente en ligne', 'due': ago(-10), 'done': False, 'doneDate': None},
            {'id': 'c3', 'title': 'Premier client payant', 'due': None, 'done': False, 'doneDate': None},
        ],
    }
    d['cups']['cup-forme'] = {
        'name': 'Cup de la forme', 'area': 'p-sport', 'season': 's-demo', 'order': 2,
        'done': False, 'doneDate': None,
        'milestones': [
            {'id': 'c1', 'title': 'Quatre semaines sans en sauter une', 'due': None, 'done': False, 'doneDate': None},
            {'id': 'c2', 'title': 'Dix kilomètres d’une traite', 'due': None, 'done': False, 'doneDate': None},
        ],
    }

    d['log'][TODAY.strftime('%Y-%m')] = {'items': [
        {'date': k(START), 'ts': TS, 'type': 'regles', 'text': 'Création de la saison de démonstration.'}
    ]}

    build_days(d)
    build_review(d)
    return d


def build_days(d):
    """Quatre semaines jouées : des victoires, des nuls, des défaites, deux forfaits, une trêve."""
    xp = {}
    quest_days = {q['doneDate'] for q in d['quests'].values() if q['doneDate']}
    day = START
    while day < TODAY:
        key, mk = k(day), day.strftime('%Y-%m')
        wd = day.isoweekday()
        n = (TODAY - day).days
        month = d['matches'].setdefault(mk, {'days': {}})

        if n in (13, 6):                       # deux journées sans aucune saisie : forfaits
            day += timedelta(days=1)
            continue
        dtype = 'treve' if n == 9 else 'recovery' if wd == 7 else 'normal'

        # coups du jour : les quêtes terminées ce jour-là, complétées par des quêtes ouvertes
        coups = [qid for qid, q in d['quests'].items() if q['doneDate'] == key]
        pool = [qid for qid in d['quests'] if qid not in coups and d['quests'][qid]['doneDate'] is None]
        while len(coups) < 3 and pool and dtype == 'normal':
            coups.append(pool.pop(RNG.randrange(len(pool))))
        coups = coups[:3]

        habits = {}
        if dtype != 'treve':
            for hid, name, block, days, hxp, area in HABITS:
                if wd not in days:
                    continue
                # la routine s'effrite sur la dernière semaine : l'agent doit pouvoir le voir
                rate = 0.55 if n < 7 else 0.9
                if RNG.random() < rate:
                    habits[hid] = hxp
                    xp[f'h:{key}:{hid}'] = {'d': key, 'xp': hxp, 'src': 'routine', 'label': name,
                                            'area': area, 'ts': TS}

        entry = {'coups': coups, 'h': habits, 'pre': {}, 'notes': [], 'type': dtype}
        if dtype != 'treve':
            if n > 7:                           # le coup d'envoi n'est plus donné sur la dernière semaine
                entry['ko'] = {'ts': TS, 'coups': coups, 'energy': RNG.choice([3, 4, 4, 5]), 'goal': None}
            if n not in (2, 5):                 # deux journées non clôturées
                entry['ft'] = {'closedTs': TS, 'energy': RNG.choice([3, 3, 4, 4, 5]),
                               'shipped': 'Avancée du jour notée.', 'block': '', 'adjust': '',
                               'lesson': "Commencer par le plus difficile pendant que la tête est claire." if n == 11 else ''}
            else:
                entry['ft'] = {}
        else:
            entry['ft'] = {}
        month['days'][key] = entry
        day += timedelta(days=1)

    # XP des quêtes terminées
    mult = {'capitaine': 2, 'titulaire': 1, 'banc': 0.5, 'tribune': 0}
    base = {'livrer': 40, 'terrain': 30, 'fond': 10}
    status = {pid: s for pid, _n, s, _o, _w in PROJECTS}
    for qid, q in d['quests'].items():
        if not q['doneDate']:
            continue
        m = mult.get(status.get(q['area'], ''), 1)
        xp[f'q:{qid}'] = {'d': q['doneDate'], 'xp': round(base[q['kind']] * m), 'src': 'quete',
                          'label': q['title'], 'area': q['area'], 'ts': TS, 'unplanned': False}
    # clôtures
    for mk, month in d['matches'].items():
        for key, entry in month['days'].items():
            if entry.get('ft', {}).get('closedTs'):
                xp[f'c:{key}'] = {'d': key, 'xp': 10, 'src': 'cloture', 'label': 'Match clôturé', 'ts': TS}

    for eid, ev in xp.items():
        d['xp_events'].setdefault(ev['d'][:7], {'ev': {}})['ev'][eid] = ev
    assert quest_days, 'aucune quête terminée'


def build_review(d):
    """Un bilan de semaine rempli, pour que l'écran Performance ne soit pas vide."""
    monday = TODAY - timedelta(days=14)
    wk = iso_week(monday)
    d['reviews'][f'S-{wk}'] = {
        'kind': 'S', 'period': wk, 'start': k(monday), 'end': k(monday + timedelta(days=6)),
        'answers': {
            'win': "La maquette est sortie et deux personnes l’ont vue.",
            'miss': "Les comptes sont restés en plan toute la semaine.",
            'learn': "Les journées sans plan du matin finissent toujours en dispersion.",
            'next': "Bloquer la première heure sur le produit, tous les jours.",
        },
        'proof': True, 'revenue': 0, 'done': True, 'doneDate': k(monday + timedelta(days=6)),
    }


LABELS = {'title': 'Titre', 'name': 'Nom', 'why': 'Contexte', 'note': 'Note', 'takeaway': 'Idée',
          'action': 'Action', 'author': 'Auteur', 'vision': 'Vision', 'cap': 'Cap', 'text': 'Texte',
          'shipped': 'Livré', 'lesson': 'Leçon', 'next': 'Suite', 'label': 'Gain'}


def neutralize(x, n={'i': 0}):
    """Remplace tout texte libre par « Titre 1, Titre 2… » : la version Ligue vérifie
    qu'aucun mot de football ne reste à l'écran, les textes de l'utilisateur fausseraient le test."""
    if isinstance(x, dict):
        for key, v in list(x.items()):
            if key in LABELS and isinstance(v, str) and v:
                n['i'] += 1
                x[key] = f'{LABELS[key]} {n["i"]}'
            else:
                neutralize(v, n)
    elif isinstance(x, list):
        for v in x:
            neutralize(v, n)
    return x


if __name__ == '__main__':
    out = ROOT / 'dist'
    out.mkdir(exist_ok=True)
    data = build()
    (out / 'demo.json').write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    neutral = neutralize(json.loads(json.dumps(data)))
    neutral['settings']['main']['profile'] = ''
    (out / 'demo-neutral.json').write_text(json.dumps(neutral, ensure_ascii=False), encoding='utf-8')
    days = sum(len(m['days']) for m in data['matches'].values())
    print(f"dist/demo.json — {days} journées, {len(data['quests'])} quêtes, "
          f"{len(data['projects'])} projets, {len(data['goals'])} objectifs, "
          f"{sum(len(m['ev']) for m in data['xp_events'].values())} gains d'XP")
    print('dist/demo-neutral.json — mêmes données, textes anonymisés')
