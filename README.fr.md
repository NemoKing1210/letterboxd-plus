# Letterboxd Plus

[![CI](https://github.com/NemoKing1210/letterboxd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/letterboxd-plus/actions/workflows/ci.yml)
[![Installer le userscript](https://img.shields.io/badge/Install-userscript-00e054?style=for-the-badge&labelColor=14181c)](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/letterboxd-plus.user.js)
[![Licence : MIT](https://img.shields.io/badge/License-MIT-40bcf4?style=for-the-badge&labelColor=14181c)](https://github.com/NemoKing1210/letterboxd-plus/blob/main/LICENSE)

[English](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.md) · [Русский](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.ru.md) · [Español](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.es.md) · [Português (Brasil)](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.pt-BR.md) · [Deutsch](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.de.md) · **Français** · [简体中文](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.zh-CN.md)

Un userscript léger qui enrichit [Letterboxd](https://letterboxd.com/) avec des
notes externes, des distributions et équipes plus détaillées, des mini-fiches au
survol et la traduction directement dans la page, sans altérer l'apparence
familière du site.

Letterboxd Plus ajoute aux pages de film les notes de Rotten Tomatoes et
Metacritic, enrichit les distributions et équipes avec des portraits, affiche
des mini-fiches détaillées pour les films et les membres, traduit les synopsis,
critiques et commentaires, et propose un panneau de réglages au style Letterboxd.
Aucune clé API n'est nécessaire et tout s'exécute dans votre navigateur.

Compatible avec [Tampermonkey](https://www.tampermonkey.net/),
[Violentmonkey](https://violentmonkey.github.io/),
[Greasemonkey](https://www.greasespot.net/),
[ScriptCat](https://scriptcat.org/) et les autres gestionnaires qui prennent en
charge le bloc de métadonnées `// ==UserScript==`.

> **Statut :** `0.23.1`. Inclut les notes, les distributions et équipes
> enrichies, les mini-fiches de films et de membres, la traduction, le contrôle
> du cache et une interface en sept langues. D'autres améliorations de
> Letterboxd peuvent être ajoutées comme modules indépendants.

> `@updateURL` / `@downloadURL` pointent vers la branche GitHub `main` —
> l'URL d'installation directe ci-dessous fournit toujours la dernière
> version.

## Captures d'écran

Le userscript réel sur des pages Letterboxd réelles.

![Panneau de réglages Letterboxd Plus avec les onglets Général, Film, Carte utilisateur, Traduction, Cache et À propos](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/settings-panel.png)

| | |
|---|---|
| ![Notes Rotten Tomatoes, Metacritic et note moyenne dans la colonne latérale d'une page de film](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/ratings.png)<br>**Notes externes** — Tomatometer, Popcornmeter, Metascore, note des utilisateurs et une moyenne combinée | ![Distribution avec portraits et rôles](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/enhanced-cast.png)<br>**Distribution enrichie** — portraits, noms et rôles, chargés à l'approche des cartes de la zone visible |
| ![Page équipe avec portraits de la réalisation, de la production et du scénario](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/crew.png)<br>**Équipe enrichie** — le même rendu pour la réalisation, la production, le scénario et le reste de l'équipe | ![Mini-fiche de film au survol d'une affiche : notes, distribution, genres et synopsis](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/film-mini-card.png)<br>**Mini-fiches de films** — notes, distribution, genres, durée, synopsis, liens rapides et bouton de traduction au survol d'une affiche |
| ![Mini-fiche de membre avec niveau, statistiques, lieu, films favoris et activité récente](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/user-mini-card.png)<br>**Mini-fiches de membres** — niveau et progression de rang, statistiques, lieu, favoris et activité récente | ![Synopsis de film avec traduction espagnole sous l'original](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/translation.png)<br>**Traduction** — synopsis, critiques et commentaires, sous l'original ou à sa place |

## Installation rapide

1. Installez un gestionnaire de userscripts. Tampermonkey, Violentmonkey ou
   ScriptCat sont recommandés.
2. Ouvrez l'URL directe du userscript ci-dessous.
3. Confirmez l'installation dans le gestionnaire.

**Dernière version GitHub :**

```text
https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/letterboxd-plus.user.js
```

[![Installer Letterboxd Plus](https://img.shields.io/badge/⬇_Install-Letterboxd_Plus-14181c?style=for-the-badge&labelColor=00e054)](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/letterboxd-plus.user.js)

### Installation via le tableau de bord du gestionnaire

| Gestionnaire | Chemin d'installation |
|--------------|-----------------------|
| Tampermonkey | Tableau de bord → **Utilitaires** → **Installer depuis une URL** |
| Violentmonkey | Tableau de bord → **+** → **Installer depuis une URL** |
| Greasemonkey | Menu de l'extension → **Nouveau script utilisateur** → coller le script |
| ScriptCat | Tableau de bord → installation par URL, puis coller le lien direct GitHub |

### Installation manuelle

1. Ouvrez
   [`letterboxd-plus.user.js`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/letterboxd-plus.user.js)
   dans le dépôt (ou lancez `npm run build` après clonage).
2. Copiez le fichier complet.
3. Créez un nouveau script dans votre gestionnaire de userscripts.
4. Collez le fichier, enregistrez, puis rechargez Letterboxd.

## Fonctionnalités

### Notes externes

Sur les pages de film, le script ajoute des blocs compacts dans la colonne
latérale native :

- **Rotten Tomatoes** — note des critiques Tomatometer, statut Certified Fresh
  lorsqu'il est disponible, note du public Popcornmeter facultative, nombre de
  critiques et de notes du public, et lien direct vers la page du film trouvée.
- **Metacritic** — Metascore avec le nombre de critiques, note des utilisateurs
  facultative avec le nombre de notes, accents de couleur selon la plage de
  points et lien direct vers le film trouvé.
- **Note moyenne** — combine la note Letterboxd avec toutes les notes externes
  activées et disponibles. Les valeurs sont normalisées sur l'échelle de cinq
  points de Letterboxd puis moyennées à poids égal ; les notes indisponibles
  sont ignorées.

Les deux sources utilisent le titre et l'année de sortie pour établir une
correspondance exacte, et l'ID TMDB de Letterboxd sert de clé de cache locale.
Des squelettes de chargement et des états vides ou d'erreur non bloquants
gardent la page utilisable lorsqu'une source est lente ou inaccessible.

### Distribution et équipe enrichies

La section distribution peut afficher des cartes compactes avec le portrait, le
nom et le rôle de chaque acteur. La page équipe reçoit le même rendu pour la
réalisation, la production, le scénario et les autres membres de l'équipe.

Les portraits sont lus depuis les pages publiques des personnes sur Letterboxd
uniquement lorsque les cartes approchent de la zone visible, avec une limite de
requêtes modérée. Les dix premiers membres de la distribution apparaissent
d'abord ; le reste n'est chargé qu'après avoir choisi **Show All** et fait
apparaître les cartes. Les résultats sont conservés uniquement en mémoire.

### Mini-fiches de films

Au survol d'une affiche dans les listes, le catalogue, le journal, les
watchlists, les résultats de recherche et les grilles de films similaires, une
mini-fiche compacte s'ouvre avec :

- l'affiche, le titre, l'année, la note de la communauté Letterboxd et votre
  statut (vu, aimé, watchlist, note) ;
- la réalisation, la distribution, les genres, l'accroche, la durée et un
  synopsis court ;
- les badges Tomatometer et Metascore lorsque ces sources sont activées ;
- des indications sur les niveaux de note, des liens rapides et un lien direct
  vers le film ;
- un bouton **Traduire** pour le synopsis.

L'affiche principale d'une page de film est exclue. Le chargement est progressif
et non bloquant, avec un préchargement facultatif à l'apparition dans la zone
visible. La fiche peut s'ouvrir au survol ou par clic droit selon les réglages.

### Mini-fiches de membres

Au survol de l'avatar ou du lien de profil d'un membre n'importe où sur
Letterboxd, une mini-fiche de membre s'ouvre avec :

- le nom affiché, le nom d'utilisateur, l'avatar et un lien vers le profil
  complet ;
- le **niveau et le rang** — une barre de progression avec les points et le rang
  suivant ;
- des statistiques sur les films, les films de cette année, les listes, les
  abonnements et les abonnés ;
- la bio, le lieu, les films favoris et l'activité récente lorsque le profil les
  publie.

La fiche est ignorée dans l'en-tête du site et à l'intérieur des autres
mini-fiches. Comme les fiches de films, elle peut s'ouvrir au survol ou par clic
droit et être préchargée à l'approche des avatars de la zone visible.

### Traduction

La traduction intégrée peut traduire :

- les **synopsis de films** sur les pages de film et dans les mini-fiches ;
- les **critiques** dans les cartes de critique et sur les pages de critique
  autonomes ;
- les **commentaires** sous les critiques.

La cible est l'une des sept langues de l'interface ou la langue de l'interface
elle-même. Choisissez si le texte traduit **remplace** l'original (avec retour
possible) ou s'affiche **en dessous**. Les critiques peuvent aussi être
traduites automatiquement au défilement ; désactivé par défaut.

La traduction utilise le point de terminaison Google gratuit — sans clé API.
Chaque bloc a son propre bouton de traduction et chaque section peut être
désactivée dans les réglages.

### Réglages

Ouvrez **Letterboxd Plus** depuis :

- le menu du compte Letterboxd, juste après l'entrée native **Settings**
  (surlignée en vert de la marque) ;
- le menu du gestionnaire de userscripts via **Letterboxd Plus settings**.

Le panneau accessible à onglets reprend le langage visuel de Letterboxd et
contient :

- **Général** — langue de l'interface et position des notifications ;
- **Film** — visibilité des sources de notes, distribution et équipe enrichies,
  comportement et contenu des mini-fiches ;
- **Carte utilisateur** — comportement et contenu des mini-fiches de membres ;
- **Traduction** — langue cible, mode d'affichage et sections traduites ;
- **Cache** — utilisation du stockage, statistiques par type, rétention,
  interrupteurs de cache par source et nettoyage manuel ;
- **À propos** — description du projet, version, licence, dépôt et auteur.

La boîte de dialogue prend en charge la navigation au clavier entre les onglets,
les flèches, la fermeture par Échap, le focus visible, les mises en page
mobiles et la réduction des animations.

### Langues de l'interface

L'interface est disponible en sept langues :

- English ;
- Русский ;
- Español ;
- Português (Brasil) ;
- Deutsch ;
- Français ;
- 简体中文.

Le mode par défaut **Auto** examine les langues préférées du navigateur et
choisit la première prise en charge. Les variantes régionales comme `es-MX`,
`pt-PT` et `zh-Hans` sont associées à la traduction disponible correspondante.
Les langues du navigateur non prises en charge ou absentes reviennent à
l'anglais. Une langue fixe peut être choisie dans **Settings → General →
Interface language**.

### Cache et résilience

- Les réponses réussies de Rotten Tomatoes et Metacritic sont mises en cache
  dans le stockage du userscript sous des clés de source distinctes.
- Les mini-fiches de films et de membres ainsi que les traductions utilisent
  leurs propres clés de cache ; chaque type peut être désactivé dans l'onglet
  Cache.
- La durée du cache est réglable de `0` à `168` heures.
- Avec `0`, des données fraîches sont toujours demandées.
- L'onglet Cache affiche l'utilisation actuelle par rapport à une référence
  prudente de 5 Mo.
- Les entrées actives et expirées sont mesurées séparément et peuvent être
  supprimées par type sans réinitialiser les réglages.
- Les requêtes ont un délai d'expiration fixe et les erreurs n'empêchent jamais
  Letterboxd de se charger.
- Les requêtes échouées et les correspondances manquantes ne sont pas mises en
  cache comme notes valides.

## Pages prises en charge

| Site | Modèle d'URL | Comportement |
|------|--------------|--------------|
| Letterboxd | `https://letterboxd.com/*` | Entrée de réglages dans la navigation, notes, distribution et équipe, mini-fiches et traduction |
| Letterboxd (`www`) | `https://www.letterboxd.com/*` | Même comportement sur l'hôte alternatif |

Les notes ne sont injectées que lorsque la page expose les métadonnées du film
via `body[data-type="film"][data-tmdb-id]`.

## Fonctionnement

```text
Page de film Letterboxd
        │
        ├── lire le titre, l'année et l'ID TMDB dans les métadonnées de la page
        │
        ├── vérifier le cache géré par GM
        │
        ├── recherche et scorecard Rotten Tomatoes
        │
        └── recherche JSON et détail du film Metacritic
                    │
                    ├── faire correspondre strictement le titre et l'année
                    ├── lire les notes des critiques et du public
                    └── mettre en cache chaque source séparément
                                      │
                                      ▼
                            afficher dans la colonne latérale de Letterboxd
```

Les mini-fiches demandent la page publique du film ou du membre via des
requêtes same-origin du navigateur et lisent les données déjà présentes dans
cette page. Le scanner de page est idempotent et observe les changements
dynamiques du DOM, de sorte que la navigation React restaure l'entrée du menu
de compte et les injections sans doublons.

## Sources de données et limites

Rotten Tomatoes et Metacritic ne proposent pas d'API publiques prises en charge
pour cet usage. Letterboxd Plus lit les pages publiques de Rotten Tomatoes et
les points de terminaison JSON du site Metacritic via `GM_xmlhttpRequest`.

La distribution et l'équipe enrichies lisent les pages publiques des personnes
sur Letterboxd via des requêtes same-origin du navigateur et affichent l'URL du
portrait déjà présente dans ces pages. Les résultats sont conservés uniquement
en mémoire ; les biographies et portraits ne sont pas stockés.

La traduction envoie le texte sélectionné au point de terminaison public de
Google. Le texte traduit est mis en cache localement dans le stockage du
userscript sauf si le cache de traduction est désactivé.

Cela entraîne quelques conséquences pratiques :

- des changements dans le balisage ou le schéma JSON des sources peuvent casser
  temporairement l'extraction des notes ;
- certains titres récents, inconnus ou non sortis peuvent ne pas avoir de page
  correspondante ;
- un titre peut exister sans note des critiques ou du public ;
- la disponibilité peut varier selon le réseau ou la région.

Ces cas sont traités comme une fonctionnalité dégradée, pas comme un bug de la
page Letterboxd. Le script n'envoie aucune note, ne modifie pas les données de
Rotten Tomatoes ou Metacritic et ne nécessite aucun identifiant de compte.

## Mises à jour

Les métadonnées du userscript incluent `@updateURL` et `@downloadURL` pointant
vers l'artefact GitHub dans `main`. Les gestionnaires compatibles peuvent donc
rechercher automatiquement les nouvelles versions.

Pour publier une version :

1. Choisissez l'incrément de version sémantique :
   - **majeure** pour les changements incompatibles ou nécessitant une
     migration ;
   - **mineure** pour des fonctionnalités rétrocompatibles ;
   - **corrective** pour les corrections, le style, la documentation et la
     maintenance.
2. Synchronisez la version dans `package.json` et `package-lock.json`.
3. Lancez `npm run ci` pour reconstruire et vérifier les artefacts racine.
4. Téléversez le code source mis à jour et les fichiers générés.

## Structure du dépôt

```text
letterboxd-plus/
├── src/
│   ├── main.js                       # Démarrage et observateur DOM
│   ├── core/                         # Constantes, cache et réglages
│   ├── api/                          # Letterboxd, RT, Metacritic et traduction
│   ├── features/                     # Notes, distribution, équipe, fiches,
│   │                                 # réglages, traduction et notifications
│   ├── i18n/                         # Locales et aides de traduction
│   ├── utils/                        # Debounce, échappement HTML, noms d'utilisateur
│   └── styles/tokens.css             # Jetons de design partagés
├── docs/
│   ├── letterboxd-dom/               # Sélecteurs stables et cartes de données
│   └── screenshots/                  # Captures d'écran du README
├── scripts/                          # Copie et vérification des artefacts
├── .github/workflows/ci.yml          # Build et vérification des artefacts
├── letterboxd-plus.user.js           # Userscript généré installable
├── letterboxd-plus.meta.js           # Métadonnées générées pour les mises à jour
├── vite.config.js                    # Build et métadonnées du userscript
├── package.json                      # Version, dépendances et scripts npm
├── AGENTS.md / DESIGN.md / CLAUDE.md # Documentation pour contributeurs et agents
├── SECURITY.md                       # Politique de sécurité
├── README.md / README.*.md           # README en plusieurs langues
└── LICENSE                           # Licence MIT
```

| Chemin | Rôle |
|--------|------|
| `src/` | Source lisible ; les changements de produit se font ici |
| `dist/` | Sortie Vite locale ; générée et ignorée par git |
| `letterboxd-plus.user.js` | Artefact complet d'installation et de mise à jour |
| `letterboxd-plus.meta.js` | Métadonnées légères pour les vérifications de mise à jour |
| `vite.config.js` | `@match`, `@connect`, noms, URL et configuration du build |

## Métadonnées et permissions du script

| Champ | Valeur |
|-------|--------|
| `@namespace` | `https://github.com/NemoKing1210/letterboxd-plus` |
| `@match` | Hôtes principal et `www` de Letterboxd |
| `@connect` | Hôtes Rotten Tomatoes, `backend.metacritic.com` et `translate.googleapis.com` |
| `@run-at` | `document-idle` |
| `@license` | MIT |
| `@updateURL` / `@downloadURL` | Fichier brut du userscript sur GitHub dans `main` |

| Permission | Rôle |
|------------|------|
| `GM_xmlhttpRequest` | Interroger les sources de notes externes et le point de terminaison de traduction |
| `GM_getValue` / `GM_setValue` | Stocker les réglages, le cache des notes et les traductions |
| `GM_listValues` / `GM_deleteValue` | Mesurer et supprimer les entrées de cache |
| `GM_addStyle` | Injecter les styles d'interface regroupés |
| `GM_registerMenuCommand` | Ouvrir les réglages depuis le gestionnaire de userscripts |

Aucun jeton d'accès, clé API, mot de passe ou donnée de session Letterboxd
n'est stocké.

## Développement

Nécessite [Node.js 22](https://nodejs.org/), comme indiqué dans
[`.nvmrc`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/.nvmrc).

```bash
npm install
npm run dev                # Servir un userscript « dev: » installable
npm run build              # Construire dist/ et mettre à jour les artefacts racine
npm run verify:artifacts   # Vérifier que dist et la racine correspondent
npm run ci                 # Construire et exécuter toutes les vérifications du dépôt
```

Modifiez les fichiers source dans `src/`. Les métadonnées du userscript se
trouvent dans
[`vite.config.js`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/vite.config.js),
et la version vient de
[`package.json`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/package.json).

Après chaque changement :

1. mettez à jour la version selon le versionnage sémantique ;
2. lancez `npm run ci` ;
3. incluez les artefacts régénérés `.user.js` et `.meta.js`.

Ne modifiez pas directement les artefacts minifiés et ne commitez pas d'URL de
mise à jour localhost temporaires.

Voir aussi :

- [`AGENTS.md`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/AGENTS.md) — architecture pour les agents IA
- [`DESIGN.md`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/DESIGN.md) — langage visuel et jetons Letterboxd
- [`docs/letterboxd-dom/`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/docs/letterboxd-dom/README.md) — sélecteurs stables et cartes de données
- [`SECURITY.md`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/SECURITY.md) — signaler une vulnérabilité

## Affiliation

Letterboxd Plus est un projet communautaire indépendant. Il **n'est ni
affilié, ni approuvé, ni sponsorisé par Letterboxd, Rotten Tomatoes, Metacritic,
Fandango, Google ou leurs propriétaires**. Tous les noms de produits et marques
appartiennent à leurs propriétaires respectifs.

## Licence

[MIT](https://github.com/NemoKing1210/letterboxd-plus/blob/main/LICENSE) —
Copyright © 2026 NemoKing
