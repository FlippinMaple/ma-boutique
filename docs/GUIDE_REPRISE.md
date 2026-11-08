# Guide de reprise — Flippin’ Maple

**Document :** `docs/GUIDE_REPRISE.md`  
**Audit :** 2026-11-08, commit `30c1a4f` sur `main`  
**But :** rouvrir le dépôt avec une nouvelle session Cursor ou un autre assistant, sans modifier le comportement de l’application.

Ce guide ne contient aucune valeur secrète. Les fichiers `.env` restent sur la machine qui les détient. Ne pas les coller dans un chat.

---

## 1. Lire avant de modifier

Dans cet ordre :

1. `docs/00_PROJECT_MASTER.md` — Constitution. En cas de conflit de vision, elle prime.
2. `README.md` §2 — chantier actif et programmes fermés.
3. `AGENTS.md` — règles de modification.
4. Le document spécialisé du sujet touché :

| Sujet | Fichier |
|---|---|
| Schéma | `docs/engineering/DATA_MODEL.md` |
| Checkout / argent | `docs/engineering/CHECKOUT_INVARIANTS.md` |
| Hostinger, migrations, variables de prod | `docs/engineering/HOSTING_CONSTRAINTS.md` |
| Recherche et tri catalogue | `docs/engineering/PRODUCT_SEARCH_AND_SORT_SPEC.md` |
| Frontières core / providers | `docs/engineering/ARCHITECTURE.md` |
| Sécurité déjà corrigée | `docs/compliance/TECHNICAL_SECURITY_REMEDIATION_LOG.md` |
| Constats d’audit figés | `docs/compliance/TECHNICAL_SECURITY_AUDIT.md` |
| Marque | `docs/brand/VISION_AND_POSITIONING.md`, `VOICE.md`, `VISUAL_IDENTITY.md` |
| Accueil | `docs/web/HOMEPAGE_SPEC.md` et les autres fichiers de `docs/web/` |
| État et suite | `docs/ETAT_DU_PROJET.md`, `docs/TRAVAUX_EN_COURS.md` |

---

## 2. Récupérer le code

Le remote vérifié le 2026-11-08 :

```text
origin  https://github.com/FlippinMaple/ma-boutique.git
```

Branche de travail : `main`, qui suivait `origin/main` sans commit d’avance ni de retard avant la rédaction de ces documents de reprise.

```bash
git clone https://github.com/FlippinMaple/ma-boutique.git
cd ma-boutique
git checkout main
git status -sb
```

Le dossier local historique s’appelle `mon-shop-artofwhere`. Le nom du dépôt GitHub est `ma-boutique`. Les deux désignent le même projet.

Autres branches locales observées, non utilisées par cet audit :

- `feature/checkout-stripe-hardening` → `origin/feature/checkout-stripe-hardening`
- `fix-checkout-printful-stripe` → `origin/fix/checkout-printful-stripe` (le nom local et le nom distant ne sont pas identiques)
- `snapshot-2025-09-22` (pas de remote affiché par `git branch -vv`)

Node observé sur la machine d’audit : 22.14.0. npm : 11.3.0. `react-router-dom` 7.6.0 demande Node 20 ou plus. Aucun `.nvmrc` n’est présent.

---

## 3. Secrets — à recopier à la main, jamais dans Git

Deux fichiers existent localement et sont ignorés par `.gitignore` :

- `.env` à la racine
- `server/.env`

`server/server.js` charge d’abord `../.env`, puis `server/.env`. Les deux peuvent donc compter. Aucune valeur n’a été lue pour écrire ce guide.

Sauvegarde manuelle : copier ces deux fichiers vers un support chiffré qui n’est pas le dépôt Git, avant de changer de machine. Ne pas les committer, ne pas les mettre dans `docs/`, ne pas les envoyer dans un chat.

Un clone neuf ne démarre pas la base, Stripe, Printful ni le courriel tant que ces fichiers ne sont pas restaurés. Les noms de variables attendus par le code sont listés dans `docs/ETAT_DU_PROJET.md` §7. Les contraintes de production sont dans `docs/engineering/HOSTING_CONSTRAINTS.md`.

---

## 4. Installer

Deux installations, parce que deux `package.json` existent et que les deux `node_modules` étaient présents.

À la racine :

```bash
npm install
```

Puis le backend :

```bash
cd server
npm install
cd ..
```

Ne pas lancer `npm audit fix --force`.

---

## 5. Lancer en local

Terminal 1, racine — frontend :

```bash
npm run dev
```

URL prévue par `vite.config.js` : `http://localhost:3000`. Le serveur Vite ouvre le navigateur (`open: true`). Les appels `/api` sont proxifiés vers `http://localhost:4242`.

Terminal 2 — backend, au choix :

```bash
cd server
npm run dev
```

Équivalent sans rechargement : `npm start` dans `server/`, ou `npm start` à la racine (`node server.js`, qui importe `server/server.js`).

Port par défaut : `4242` (`PORT`). Hôte par défaut : `0.0.0.0` (`HOST`). Sans base joignable, `server/server.js` continue et bascule les logs vers fichier / console. Les routes qui interrogent MySQL échouent alors au moment de l’appel. `/health` peut répondre ; `/readiness` répond 503 sans base.

Le webhook local n’est pas proxifié par Vite. Un outil du type Stripe CLI doit viser le processus du port 4242, chemin `POST /webhook/stripe`.

Ne pas pointer un `.env` local vers la base de production pour « juste regarder ». Ne pas exécuter `npm run migrate` ni `npm run printful:import` sans décision explicite : les deux écrivent.

---

## 6. Vérifier

Commande de lint existante, à la racine :

```bash
npm run lint
```

Il n’y a pas de `npm test`. Une vérification manuelle minimale, si la base locale et les clés de développement sont en place :

1. `http://localhost:3000/` — accueil, hero, lien vers la boutique.
2. `/shop` et une fiche `/product/:id`.
3. Connexion `/login` puis `/dashboard`.
4. Panier puis `/checkout` seulement avec un compte de test et des clés Stripe de test.
5. `/admin` avec un compte dont le rôle est `admin`.

Build frontend, sans déploiement :

```bash
npm run build
```

Cela écrit `dist/`. Ce dossier est ignoré par Git. Le supprimer ou le régénérer ne change pas les sources. Ne pas servir ce build sur l’hébergement de production sans autorisation.

---

## 7. Où continuer

Le prochain travail produit déjà nommé est la suite du redesign storefront : Shop (`src/pages/Shop.jsx`, `src/pages/styles/Shop.css`) puis Product Detail (`src/pages/ProductDetail.jsx`, `src/pages/styles/ProductDetail.css`). Le README dit de ne pas entraîner checkout, auth, APIs, Printful et Stripe dans cette passe.

Avant une modification :

1. Lire le document spécialisé du domaine.
2. Chercher les appelants (`Header`, routes, services) et les tables citées par DATA_MODEL.
3. Limiter le diff aux fichiers nécessaires.
4. Prévoir le retour arrière (section 8).
5. Ne pas committer, pousser, migrer ni déployer sans une demande explicite.

Détail des inachevés : `docs/TRAVAUX_EN_COURS.md`.

---

## 8. Retour arrière

Tant que les changements ne sont pas commités :

```bash
git status --short
git diff -- chemin/du/fichier
git restore -- chemin/du/fichier
```

`git restore` annule le fichier de travail. Ne pas l’utiliser sur un fichier que l’on voulait garder. Ne pas utiliser `git clean`, `git reset --hard`, ni `git push --force` sans demande explicite.

Si un commit local a été créé et n’a pas été poussé, le retour arrière se décide avec la personne responsable du dépôt. Ne pas réécrire l’historique poussé.

Un déploiement Hostinger et une migration SQL ont leurs propres retours arrière (backup avant ALTER). Ils ne se font pas depuis ce guide.

---

## 9. Dépendances entre composants

```text
src/pages/Home.jsx
  → GET /api/products/featured
  → server/routes/productsRoutes.js
  → server/controllers/productsController.js
  → MySQL (products, variantes, images)

src/pages/Shop.jsx, ProductDetail.jsx
  → /api/products, /api/inventory/printful-stock/:id, /api/shipping/rates
  → Printful si la clé est configurée

src/pages/Checkout.jsx
  → POST /api/create-checkout-session
  → server/controllers/checkoutController.js
  → MySQL (orders, order_items, order_status_history, checkout_idempotency)
  → Stripe Checkout
  → retour navigateur /checkout/success ou /success
  → GET /api/payments/verify

Stripe → POST /webhook/stripe
  → server/controllers/webhookController.js
  → paid_at, statut, stripe_events
  → Printful / courriel selon le flux déjà codé

src/pages/Login.jsx, Register.jsx, App.jsx
  → /api/auth/*
  → cookies httpOnly
  → customers, refresh_tokens

src/admin/*
  → /api/auth/whoami puis /api/admin/*
  → requireRole('admin')

server/jobs/*
  → démarrés avec le serveur
  → Printful, logs, et paniers abandonnés seulement si ENABLE_ABANDON_CRON=true
```

Chaîne de production documentée : build Vite → `dist/` → Express sert le frontend et l’API sur la même origine → MySQL Hostinger. Les écarts local / prod sont dans HOSTING_CONSTRAINTS, pas dans ce guide.
