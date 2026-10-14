# Sécurité / Security policy

## Signaler une faille

Merci de **ne pas ouvrir d'issue publique** pour un problème de sécurité.

Signale-le en privé sur GitHub : **Security → Report a vulnerability** sur ce dépôt (signalement privé
GitHub). Indique ce qui est touché, comment le reproduire et l'impact attendu. Accusé de réception sous
7 jours ; merci de laisser un délai raisonnable pour corriger avant toute divulgation.

*Please report vulnerabilities privately through GitHub's "Report a vulnerability" button, never in a
public issue.*

## Périmètre

Dans le périmètre : les deux pages construites (`dist/ma-saison.html`, `dist/ligue-des-entrepreneurs.html`),
l'import de données JSON, le mode artifact (base de données, interprétation par Claude, téléchargements).
Hors périmètre : la plateforme d'hébergement elle-même, et les failles de dépendances déjà suivies en amont.

## Ce qui est déjà en place

- Aucune requête réseau, polices comprises : tout est embarqué ; le build échoue si une ressource externe
  réapparaît.
- Les données importées sont traitées comme non fiables : textes échappés, liens limités à `http(s)`,
  images limitées aux images encodées, couleurs validées (`test/t9-securite.js`).
- L'interprétation par Claude ne reçoit que des chiffres agrégés et les constats de l'agent, jamais les
  textes des quêtes, les notes ni les contacts.
- `tools/check-prive.py` bloque la publication d'une trace personnelle ; la CI le lance à chaque push.
- Dépendances de build surveillées par Dependabot et `npm audit` en CI.
