# Modèle de données

Tout vit dans un objet unique, `S`, avec une collection par type de document. Chaque collection est un dictionnaire `identifiant → document`. Il n'y a ni schéma déclaré, ni migration automatique : les champs absents sont traités comme absents, partout.

L'export JSON (*Réglages › Données*) est exactement cette structure, à laquelle s'ajoutent `app`, `version` et `exportedAt`. Un import la remplace intégralement, après confirmation.

---

## Les collections

### `settings` — un seul document, `main`

Les réglages modifiés. Ceux qui n'ont jamais été touchés ne sont pas stockés : `R()` fusionne ce document avec les valeurs par défaut de `js/01-settings.js`. Contient notamment le barème (`score`), les exigences par type de journée (`dayTypes`), les montants d'XP (`xp`), les multiplicateurs de poste (`mult`), l'apparence (`look`), la langue, l'univers, les réglages de l'agent, et `profile` — le contexte personnel transmis à Claude avant une interprétation.

### `seasons` — une saison par document

`start`, `end`, `name`, `vision`, le cap des 90 jours (`cap`, `capStart`, `capDeadline`, `capMilestones[]`) et le quota de trêves par semaine. Les saisons ne se chevauchent pas ; en dehors de toute saison, l'application est « en intersaison » et les journées ne comptent pas.

### `matches` — **un document par mois**, pas par jour

```json
{ "days": { "2026-09-22": { "coups": [], "h": {}, "pre": {}, "ko": {}, "ft": {}, "notes": [], "type": "normal", "snap": {} } } }
```

Regrouper par mois évite de multiplier les écritures : cocher une habitude réécrit un document, pas trente. Chaque journée contient les identifiants des trois coups, les habitudes cochées, l'avant-match, le coup d'envoi (plan figé), le Full Time, les notes rapides, le type de journée, et — une fois la journée passée — `snap`.

**`snap` est le cœur du système.** Il contient le résultat, le score, ses composantes, et une copie des règles en vigueur ce jour-là. Une fois écrit, il n'est recalculé que si la journée est explicitement corrigée, et toujours avec ses propres règles. C'est ce qui garantit qu'un changement de barème ne réécrit jamais le passé.

### `quests` — une quête par document

`title`, `area` (projet ou domaine de vie), `kind` (`livrer`, `terrain`, `fond`), `prio`, `due`, `done`, `doneDate`, `postponed` (nombre de reports), `repeat`, `source` (quand la quête vient d'une note ou d'un contact). Une quête est binaire : il n'y a pas de pourcentage d'avancement, par choix.

### `projects` — la compo

`name`, `why`, `order` et surtout `statusLog[]` : un journal de changements de poste `{ from, status }`, et non un statut courant. `statusAt(projet, date)` lit ce journal pour savoir quel poste le projet occupait un jour donné — c'est ce qui permet au mercato de prendre effet dans le futur et à l'XP d'une quête passée de garder le multiplicateur qui s'appliquait à l'époque.

### `goals` — objectifs

`horizon` (`semaine`, `mois`, `saison`), `period` (`2026-W40`, `2026-10`, ou l'identifiant de saison), `target`, `current`, `area`, `parent`. Le statut — atteint, en bonne voie, à risque, manqué — est calculé en comparant l'avancement au temps écoulé, jamais stocké.

### `habits` — la routine

`name`, `block` (matin, journée, soir), `xp`, `area`, et `sched[]` : un journal `{ from, days }`. Comme pour les projets, c'est un journal et non un état : changer les jours d'une habitude aujourd'hui ne réécrit pas les scores passés.

### `xp_events` — **un document par mois**, le journal des gains

```json
{ "ev": { "q:q-01": { "d": "2026-09-22", "xp": 80, "src": "quete", "label": "…", "area": "p-produit" } } }
```

Chaque gain porte un identifiant déterministe — `q:<quête>`, `h:<date>:<habitude>`, `hat:<date>`, `c:<date>`, `r:<bilan>`… Le total d'XP n'est jamais stocké : il est recalculé en additionnant le journal. Annuler une saisie retire exactement son gain. C'est aussi ce qui rend le total explicable ligne par ligne dans *Réglages › Avancé*.

### `knowledge_items` — la bibliothèque

`title`, `author`, `kind`, `status`, `pages`/`page`, `rating`, `takeaway`, `action`, `applied`, et `notes[]` — les notes sont **dans le document de la lecture**, pas dans une collection à part : une note sans sa source n'a pas de sens, et il n'y a donc pas d'orphelins possibles.

```json
{ "id": "…", "d": "2026-09-22", "type": "citation", "page": 42, "text": "…", "fav": true, "questId": null }
```

### `contacts` — le réseau

`name`, `role`, `org`, `cadence` (jours entre deux relances), `tags[]`, `next`, et `log[]` des échanges. La date de relance et le retard sont calculés, jamais stockés.

### `reviews` — bilans

Identifiant `S-2026-W40`, `M-2026-10` ou `A-<saison>`. Contient les réponses, les chiffres de la période au moment de la validation, la preuve extérieure, le montant encaissé, et le rapport du coach.

### `agent` — l'agent de revue

Le document `state` garde les constats déjà vus (pour dater leur apparition) et ceux mis de côté. Les autres documents sont des revues figées : constats, signaux positifs, ce qui a été réglé depuis la précédente, les quêtes créées, et l'interprétation éventuelle. Les trente dernières sont conservées.

### `cups`, `achievements`, `rewards`, `mood`, `log`, `finance`

Objectifs longs en plusieurs étapes ; trophées détectés automatiquement ; récompenses que l'utilisateur définit avec leur condition ; moodboard ; journal des décisions et corrections, par mois ; réservé.

---

## Conventions

**Les dates** sont des chaînes `AAAA-MM-JJ` en heure locale, jamais des horodatages UTC, jamais des objets `Date` sérialisés. Tout le calcul de dates passe par `js/00-util.js` et utilise le fuseau de la machine : une journée commence et finit là où vit l'utilisateur.

**Les identifiants** sont soit lisibles et stables quand ils viennent d'une saisie structurée (`m-page-en-ligne`, `cup-lancement`), soit générés par `uid('q')` — un préfixe, l'horodatage en base 36 et quatre caractères aléatoires.

**Rien n'est dénormalisé.** Aucun total, aucun statut, aucune moyenne n'est stocké : tout est recalculé à chaque rendu à partir des documents. C'est plus lent en théorie, et parfaitement imperceptible à cette échelle — mais cela rend impossible la catégorie de bug où un compteur et sa source divergent.

**Les journaux plutôt que les états.** Postes des projets, jours des habitudes, gains d'XP, décisions : partout où l'histoire compte, c'est une liste d'événements datés qui est stockée, pas la valeur courante.

---

## Durabilité et confidentialité

Dans un navigateur, tout est dans le `localStorage`, sous les clés `ma-saison-v2:data` et `ma-saison-v2:seeded`. Rien ne sort de la machine. Vider les données du site efface la saison : **exporter en JSON de temps en temps n'est pas optionnel**. L'application fait aussi deux sauvegardes locales glissantes, et prévient quand le stockage est plein.

Publiée comme artifact Claude, la page utilise la base privée de l'artifact : mêmes données sur tous les appareils, sauvegarde automatique hebdomadaire, six sauvegardes manuelles conservées, et une sauvegarde de sécurité avant tout remplacement.

Ce qui est transmis à Claude lors d'une interprétation : **les chiffres agrégés de la période et les constats de l'agent**, plus le texte que l'utilisateur a lui-même écrit dans `settings.main.profile`. Ni les titres des quêtes, ni les notes, ni les contacts.
