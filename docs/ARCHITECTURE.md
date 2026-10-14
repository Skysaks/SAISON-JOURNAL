# Architecture

Trois contraintes expliquent presque tout le reste :

1. **Un seul fichier HTML**, ouvrable hors ligne, sans serveur ni étape d'installation.
2. **Aucune dépendance au moment de l'exécution** : ni framework, ni bibliothèque, ni appel réseau en dehors des polices.
3. **Un score passé ne change jamais**, même quand les règles changent.

---

## Comment la page est assemblée

`build.py` fait trois choses, dans cet ordre.

**1. Concaténation.** Les fichiers `js/*.js` sont lus dans l'ordre alphabétique de leur nom — d'où la numérotation. Il n'y a ni modules, ni `import`, ni bundler : un seul script, une seule portée globale. Les dépendances entre fichiers sont donc des dépendances d'ordre, et les numéros les rendent lisibles.

| Plage | Rôle |
|---|---|
| `00`–`06` | Fondations : dates locales, réglages, accès aux données, domaine, moteur de score, XP, analyses |
| `09` | Apparence : palettes et recalcul de contraste |
| `10`–`24` | Interface : boucle de rendu, écrans, composants, surcouches |
| `30`–`34` | Actions : tout ce qui écrit |
| `35`–`39` | Univers (moteur et lexiques), agent de revue |
| `40` | Événements, maintenance, démarrage |

**2. Internationalisation.** `tools/build-i18n.js` lit le JavaScript concaténé avec un analyseur syntaxique (acorn), repère chaque chaîne et chaque gabarit **visibles**, et les remplace par un appel à une table : `__s(id)` pour un texte simple, `__t(id, [expressions])` pour un gabarit. Trois tables sont embarquées — le français, l'anglais et l'espagnol — et changer de langue consiste à changer de table, sans rechargement.

L'extracteur distingue le texte visible du texte technique par analyse de contexte : un identifiant, une classe CSS, un nom de champ, une clé d'objet ne sont jamais extraits. Trois marqueurs permettent de forcer la décision quand le contexte ne suffit pas :

```js
const X = /*nt*/ { … };         // ne jamais traduire cet objet
NT('texte')                      // ne jamais traduire ce texte
TX('oui')                        // toujours traduire ce texte court
/*nt-file*/ … /*nt-end*/         // zone entière hors traduction (les lexiques d'univers)
```

Le build **échoue bruyamment** si une traduction manque. C'est volontaire : une chaîne non traduite est un bug, pas un détail.

**3. Injection.** Le CSS et le JavaScript sont injectés dans `shell.html`. Rien n'est minifié : le fichier produit reste lisible, c'est aussi ce qui en fait une pièce de portfolio.

La version Ligue des Entrepreneurs passe par une étape supplémentaire, `tools/build-theme.js`, qui réécrit les chaînes **avant** l'internationalisation, à partir des règles de `tools/theme-ligue.js`. Le code, lui, est rigoureusement identique.

---

## Le rendu

Il n'y a pas de DOM virtuel et pas de composants. Une seule fonction, `render()`, reconstruit l'écran courant à partir de l'état :

```
render()
 ├── captureInputs()      mémorise la saisie en cours, le focus et la position du curseur
 ├── resolveLang/Theme    langue et univers actifs
 ├── buildCtx()           recalcule le contexte : projets, habitudes, XP, niveau, saison
 ├── headerHtml()         l'en-tête
 ├── VIEWS[ui.tab]()      l'écran, qui rend une chaîne de HTML
 ├── restoreInputs()      rend la saisie, le focus et le curseur
 └── animateCounts()      anime les compteurs qui ont changé
```

La naïveté de l'approche est assumée ; `captureInputs`/`restoreInputs` est ce qui la rend supportable, en évitant qu'un rendu ne vide un champ en cours de frappe. Les rendus déclenchés par une écriture passent par `scheduleRender()`, qui les regroupe sur la frame suivante.

**L'état d'interface** vit dans un objet unique, `ui` (onglet actif, jour affiché, filtres, panneaux ouverts). Il n'est jamais persisté, à deux exceptions près : l'onglet et le sous-onglet de performance, gardés dans le `localStorage` pour retrouver l'écran quitté.

**Les actions** sont déclarées dans trois registres et branchées par délégation d'événements sur le document entier :

```js
ACT.nomDeLAction  = bouton => { … }   // clic sur [data-a="nomDeLAction"]
CHG.nomDuChamp    = champ  => { … }   // changement sur [data-c="nomDuChamp"]
FORM.nomDuFormulaire = f   => { … }   // envoi de <form data-f="nomDuFormulaire">
```

Une seule écoute par type d'événement, pour toute l'application. Aucun nœud ne porte de gestionnaire : le HTML peut donc être reconstruit en entier sans fuite.

---

## Les données

`js/02-data.js` expose un magasin unique, `S`, avec une collection par type de document, et trois écritures : `put`, `del`, `saveSettings`. Deux modes :

- **navigateur** — tout est sérialisé dans le `localStorage`, avec un regroupement des écritures ;
- **base** — chaque écriture part aussi vers la base privée de l'artifact, à travers une file par document qui garde la dernière valeur, réessaie une fois en cas d'indisponibilité, et traduit chaque erreur en message compréhensible (lecture seule, quota, trop d'écritures, accès retiré).

Dans les deux cas, le cache local reste la source de vérité pour l'affichage : l'interface ne bloque jamais en attendant le réseau.

Le détail de chaque collection est dans [`DONNEES.md`](DONNEES.md).

---

## Pourquoi un score passé ne change jamais

C'est la décision structurante du projet.

Quand une journée devient passée, elle est **figée** : `makeSnap()` enregistre dans le document du mois le résultat, le score, ses composantes, et **une copie des règles en vigueur ce jour-là** (barème, seuils, poids, exigences par type de journée). Ensuite, modifier un réglage ne touche plus rien du passé — le score affiché pour le 3 mars reste celui du 3 mars.

Deux conséquences voulues :

- on peut ajuster le barème sans invalider l'historique, donc sans être prisonnier de ses premiers réglages ;
- on ne peut pas se refaire une belle saison en baissant le seuil de victoire après coup.

La seule façon de modifier une journée passée est de la corriger explicitement ; elle est alors recalculée **avec ses propres règles** et marquée « corrigé », et la correction est inscrite au journal. La version des règles est visible dans *Réglages › Avancé*, avec l'historique des changements.

L'XP suit la même philosophie mais par un autre mécanisme : chaque gain est un **événement daté et identifié** dans `xp_events`. Le total n'est jamais stocké, il est recalculé en additionnant le journal. Annuler une saisie retire exactement son gain, jamais celui d'une autre.

---

## Le moteur d'univers

`js/36-themes.js` contient quinze lexiques — environ quarante-cinq mots par univers et par langue. `js/35-theme-engine.js` en dérive, au moment où l'univers est choisi, entre 185 et 250 règles de remplacement ordonnées, appliquées à la table de chaînes active.

Le moteur travaille **en dehors des balises** : il reconnaît le texte visible, y compris dans les attributs qui en contiennent (`title`, `aria-label`, `placeholder`, `alt`, `data-tip`), et laisse tout le reste intact. Il gère les accords du français et de l'espagnol — article défini, indéfini, contracté, élision, genre, nombre, participe passé.

Changer d'univers ne touche ni les données, ni les identifiants, ni le moteur de score : seulement l'affichage, la palette et l'icône.

Détail et marche à suivre pour en ajouter un : [`UNIVERS.md`](UNIVERS.md).

---

## L'agent de revue

`js/38-agent.js` déclare des détecteurs indépendants :

```js
agDet('identifiant', () => {
  // lit les données, applique un seuil chiffré
  if (/* sous le seuil */) return null;
  return { key, sev, title, detail, fix };
});
```

Chacun rend soit `null`, soit un constat avec une gravité (`critique`, `corriger`, `surveiller`), un titre, une explication **qui cite ses chiffres**, et une correction proposée — soit une navigation, soit une quête prête à créer.

Trois propriétés tiennent l'ensemble :

- **Déterminisme.** Les mêmes données donnent les mêmes constats. Aucun appel extérieur n'est nécessaire pour que l'agent fonctionne.
- **Mémoire.** « Figer la revue » enregistre l'état du jour dans la collection `agent`. La fois suivante, la comparaison avec cette photo distingue ce qui a disparu, ce qui est nouveau et ce qui s'installe. Une revue est figée automatiquement chaque semaine.
- **Boucle fermée.** Un constat devenu quête garde le lien ; l'onglet *Suivi* montre si la quête a été faite et si le constat a disparu pour autant.

L'interprétation par Claude, quand elle est disponible, ne reçoit **que** les chiffres agrégés et les constats — jamais le texte des quêtes ni les notes.

Ajouter un détecteur : écrire un `agDet(…)` de plus. Il apparaît aussitôt dans la revue, dans le compteur de l'onglet et dans le décompte affiché par l'écran de réglages.

---

## Ce que le projet n'a pas

Pas de framework, pas de transpilation, pas de gestion d'état réactive, pas de routeur, pas de tests unitaires. Les suites Playwright testent l'application construite à travers son interface — c'est-à-dire ce que l'utilisateur touche réellement.

Le compromis est assumé : refactorer en profondeur coûte plus cher qu'avec des composants isolés, mais la page se lit d'un bout à l'autre, se construit en deux secondes, et fonctionnera encore sans rien réinstaller dans cinq ans.
