# Ajouter un univers

Un univers ne change ni les données, ni le moteur de score, ni les identifiants : seulement le vocabulaire affiché, la palette et l'icône. En ajouter un revient à écrire un lexique.

## 1. Le lexique

Dans `js/36-themes.js`, ajoute une entrée à l'objet `THEMES`. Le modèle complet à lire d'abord est `ligue` : c'est le seul dont chaque clé est commentée.

```js
monUnivers: {
  names: { fr: "Atelier d'Artisan", en: "Craft Workshop", es: "Taller Artesano" },
  subs:  { fr: 'Ateliers, pièces, établi', en: '…', es: '…' },
  brands:{ fr: 'Mon atelier', en: 'My workshop', es: 'Mi taller' },
  icon: 'hammer',                                  // une clé de ICON (js/00-util.js)
  pal: { accent: '#8A5A2B', reward: '#D9A21B', board: '#1A1410' },
  w: { fr: { … }, en: { … }, es: { … } }           // le lexique, par langue
}
```

Puis les trois lexiques. Les clés attendues :

| Clé | Ce que c'est | Football → Atelier |
|---|---|---|
| `day` / `days` (+`dayF`) | l'unité d'une journée, notée sur 100 | match → atelier |
| `act` / `acts` (+`actF`) | les trois actions choisies le matin | coup → pièce |
| `draw`, `win`, `loss`, `forfeit` | les résultats | Match nul → Ébauche |
| `rest` / `rests` | la journée de repos planifiée | trêve → jour sans établi |
| `kickoff` (+`kickoffF`), `kickoffVerb` | le geste du matin qui fige le plan | coup d'envoi → ouverture de l'atelier |
| `fulltime`, `finalWhistle` | le rituel du soir | Full Time → Rangement |
| `hattrick` | les trois actions réussies le jour même | coup du chapeau → triplé |
| `lineup`, `window` | l'écran des projets, la fenêtre de changement | compo → établi, mercato → réagencement |
| `cup` / `cups` (+`cupF`) | un objectif long en plusieurs étapes | Cup → commande |
| `role1`…`role4` (+`role1F`) | les quatre statuts d'un projet | capitaine / titulaire / banc / tribune |
| `slot`, `armband` | la place vide, le symbole du projet prioritaire | poste, brassard |
| `coach`, `manager` | qui produit le rapport et le briefing | coach, manager |
| `kindField` | le type d'action « contact avec le réel » | Terrain → Commande |
| `club` / `clubs` | l'organisation d'un contact | club → atelier |
| `titles` | **neuf** titres de progression, du plus haut au plus bas | Ballon d'Or … Centre de formation |
| `divisions` | **six** paliers de classement, du meilleur au moins bon | Élite … District |
| `idioms` | facultatif : paires `['phrase française exacte', 'réécriture']` | pour les tournures que le mot à mot rend bancales |

Contraintes :

- **Genre.** En français et en espagnol, ajoute `dayF: true`, `actF: true`, `kickoffF: true`, `cupF: true` quand le mot est féminin. Le moteur accorde seul les articles, les élisions et les participes.
- **Longueur.** `day`, `act`, `draw` et les `role*` tiennent sur un bouton mobile : quatorze caractères au maximum, dix c'est mieux. Les titres : vingt-six. Les divisions : dix-huit.
- **Mots réservés.** L'application utilise déjà, pour autre chose : quête, objectif, routine, habitude, projet, domaine, saison, semaine, mois, bilan, niveau, division, trophée, récompense, focus, moodboard, réseau, savoir, score, série, jour — et leurs équivalents anglais et espagnols. Ne les reprends pas comme cible.
- **Pas de nom déposé** : ni marque, ni compétition réelle, ni nom d'entreprise.
- **Même métaphore dans les trois langues.** Pas une image différente par langue.
- `titles[3]` et `titles[5]` sont automatiquement remplacés par `role1` et `role2` : mets-y quelque chose de cohérent quand même.

## 2. Vérifier

```bash
node tools/check-theme.js mon-univers.json
```

Le vérificateur contrôle la structure, signale les collisions avec les mots réservés, et **affiche le rendu réel de plusieurs phrases dans les trois langues**. Lis ce rendu : si une phrase sonne faux — « le ouverture », « la kata », « Meilleur donjon : » — corrige le lexique ou ajoute un `idiom`.

Une fois le rendu satisfaisant, recopie le lexique dans `js/36-themes.js`, puis lance les tests :

```bash
python3 build.py
NODE_PATH=$(npm root -g) THEMES=monUnivers node test/t7-themes.js
```

`t7` vérifie, pour chaque univers et chaque langue : aucun mot de football résiduel à l'écran, les accords d'article et de genre, la palette appliquée, aucune erreur JavaScript. Sans la variable `THEMES`, il passe sur les quinze.

## 3. Étalonner (facultatif)

L'univers « Ligue des Entrepreneurs » existe en deux versions : des règles écrites à la main (`tools/theme-ligue.js`, utilisées par le build dédié) et le lexique du moteur. Comparer les deux mesure la qualité du moteur :

```bash
node tools/theme-check.js ligue fr
```

Référence actuelle : 1 038 chaînes sur 1 141 rendues à l'identique, une non traitée, le reste étant des variantes stylistiques.

---

## Ce que le moteur ne sait pas faire

Il réécrit des **mots**, pas des phrases. Les textes longs — le guide en seize sections, les descriptions de réglages — gardent donc quelques tournures footballistiques dans les univers autres que Football et Ligue. Les neutraliser demande de réécrire puis retraduire environ deux cent cinquante textes : c'est un chantier à part, pas un réglage.
