# Publier la page comme artifact Claude

Le fichier construit fonctionne tel quel dans un navigateur, avec les données dans le `localStorage`. Publié comme artifact Claude, il gagne trois choses : une base privée synchronisée entre appareils, l'interprétation des chiffres par Claude, et l'export de fichiers.

## Ce que la page demande

Au démarrage, `js/40-events-boot.js` réclame trois capacités, et **continue sans si elles sont refusées** :

| Capacité | Ce qu'elle apporte | Sans elle |
|---|---|---|
| `db` | la base privée de la page : mêmes données sur téléphone et ordinateur, sauvegardes | mode navigateur, données locales |
| `sample` | « Interprétation par Claude » dans les bilans et l'agent de revue | le bouton disparaît, les chiffres restent |
| `downloads` | export JSON et CSV | export impossible hors fichier autonome |

Les règles d'accès à la base sont en lecture et écriture réservées au propriétaire. L'application ne lit jamais la base d'un autre, et n'a aucune notion de compte ou d'utilisateur.

## Publier

Demande à Claude de publier `dist/ma-saison.html` comme artifact, avec les capacités `db`, `sample` et `downloads`. Claude renvoie une URL privée ; la page est alors partageable, mais les données restent celles du propriétaire de l'artifact.

Pour mettre à jour sans perdre les données : republier **à la même URL**. La base est indépendante du code de la page, elle survit à chaque nouvelle version.

## Ce que Claude reçoit, et ce qu'il ne reçoit pas

Quand une interprétation est demandée — jamais automatiquement, toujours sur un bouton — le texte envoyé contient :

- les **chiffres agrégés** de la période : matchs joués, résultats, score moyen, XP, quêtes par type, taux de routine, respect du plan, minutes de focus, domaines sans activité, projets stagnants, objectifs à risque ;
- les **constats de l'agent**, qui sont eux-mêmes des phrases chiffrées ;
- le texte que l'utilisateur a écrit lui-même dans *Réglages › Avancé*.

Il ne reçoit pas les titres des quêtes, pas les notes de lecture, pas les contacts, pas les réponses des bilans.

La consigne envoyée demande explicitement de n'utiliser que ces chiffres, de signaler les données manquantes, et de ne rien inventer.

## Rappels programmés

L'application ne peut pas envoyer de notification par elle-même : elle n'a pas de service worker et ne tourne pas en arrière-plan. Les rappels du matin et du soir passent par des tâches programmées côté Claude, qui lisent `settings.main.notif` — heures, activation — et `settings.main.lang` pour écrire dans la langue active.

Désactiver un rappel dans *Réglages › Notifications* suffit : la tâche lit le réglage avant d'envoyer quoi que ce soit.

## Mode local

Sans artifact, tout fonctionne quand même : l'application bascule en mode navigateur, affiche « Local » dans l'en-tête, garde deux sauvegardes locales glissantes et propose l'export direct par téléchargement. C'est le mode par défaut quand on ouvre le fichier depuis son disque.
