# Traduction

Le français est la langue source. L'anglais et l'espagnol sont des tables produites au build. Changer de langue ne recharge rien : seule la table active change.

## Comment ça marche

`tools/build-i18n.js` analyse le JavaScript concaténé avec acorn, repère chaque chaîne et chaque gabarit **visibles**, et les remplace :

```js
// avant
const t = `${n} quêtes en retard`;
// après
const t = __t(417, [n]);
```

Trois tables sont embarquées dans le fichier construit : `__FR` (les textes d'origine) et `__TR.en` / `__TR.es`. `setLang('en')` échange la table et relance les constantes qui dépendent de la langue. Les traductions elles-mêmes vivent dans **`i18n/tr.json`**, indexées par le texte français exact :

```json
{
  "{0} quêtes en retard": { "en": "{0} quests overdue", "es": "{0} misiones atrasadas" }
}
```

Le build **échoue** si une entrée manque, et écrit la liste des manquantes dans `dist/app-i18n.txt`.

## Ajouter une traduction manquante

1. `python3 build.py` → la liste est dans `dist/app-i18n.txt`.
2. Ajouter les entrées dans `i18n/tr.json`, avec le texte français **exact** comme clé (espaces et apostrophes compris : l'apostrophe typographique `’` et l'apostrophe droite `'` sont deux caractères différents).
3. Rebuild.

Règles à respecter, dans l'ordre d'importance :

- **Les emplacements `{0}`, `{1}`** doivent tous être présents, sans doublon ni oubli. Leur ordre peut changer si la langue l'exige.
- **Le squelette HTML** doit être identique : mêmes balises, mêmes classes, mêmes `data-*`, mêmes `id`, mêmes `for`, mêmes `name`. Seul le texte entre les balises change — plus le contenu de `title`, `aria-label`, `placeholder`, `alt`, `data-tip` et `label`, qui sont eux aussi visibles.
- **Les espaces et retours à la ligne** de début et de fin doivent être identiques.
- **Les mots de confirmation** (`REMPLACER`, `SUPPRIMER`, `RESTAURER`, `REDÉMARRER`) se traduisent en majuscules et doivent rester cohérents entre la consigne et la vérification.
- **La longueur.** Ces textes vivent dans des boutons. Trente pour cent de plus que l'original casse la mise en page.

Un vérificateur mécanique contrôle tout cela :

```bash
node tools/check-tr.js <lot.json> <traductions.json>
```

où `lot.json` est un tableau `[{ "k": "…", "fr": "…" }]` et `traductions.json` un objet `{ "<k>": "<traduction>" }`.

## Ajouter une langue

1. Dans `js/00-util.js`, ajouter la langue à `LANG_NAMES`, `LOCALES` et `DATE_L` (noms de jours et de mois, complets et abrégés — ils ne passent jamais par la traduction automatique).
2. Dans `js/00-util.js` encore, ajouter les lettres de résultat à `RES_LETTERS` (joués, victoire, nul, défaite, forfait, repos).
3. Dans `js/35-theme-engine.js`, écrire un constructeur de règles pour cette langue, sur le modèle de `frRules`, `enRules` ou `esRules` — c'est lui qui gère les accords et les articles. L'enregistrer dans `RULE_BUILDERS`.
4. Dans `js/36-themes.js`, ajouter le lexique de cette langue aux quinze univers.
5. Dans `i18n/tr.json`, ajouter la langue à chaque entrée.
6. `python3 build.py`, puis `node test/t5-i18n.js` et `node test/t7-themes.js`.

Les points 3 et 4 sont le vrai travail : quinze lexiques d'environ quarante-cinq mots, plus les règles d'accord. Compter une bonne journée.

## Ce qui n'est jamais traduit

Les textes écrits par l'utilisateur — quêtes, projets, notes, contacts, bilans — restent tels quels, dans toutes les langues. C'est une règle, pas une limitation : traduire les mots de quelqu'un dans son propre carnet serait une faute.

Les identifiants, les classes CSS, les clés d'objet et les valeurs techniques sont exclus par analyse de contexte. Quand le contexte ne suffit pas, quatre marqueurs tranchent :

```js
const X = /*nt*/ { … };       // objet entier hors traduction
NT('texte')                    // ce texte précis, jamais
TX('oui')                      // ce texte court, toujours
/*nt-file*/ … /*nt-end*/       // zone entière (les lexiques d'univers)
```
