# Travaux en cours — Flippin’ Maple

**Document :** `docs/TRAVAUX_EN_COURS.md`  
**Nature :** liste de reprise. Ce n’est pas le backlog officiel prévu à `docs/backlog/TECH_DEBT.md` (fichier absent).  
**Audit :** 2026-11-08, commit `30c1a4f` sur `main`.  
**Méthode :** seuls les inachevés lisibles dans le README, la Constitution, l’inventaire ou le code sont listés. Un TODO de l’inventaire sans note de résolution n’est pas traité comme un bug confirmé : plusieurs chantiers P3–P24 ont été fermés après la rédaction de ces TODO.

Aucun ordre nouveau n’est inventé. Le README §2.3 est la seule priorité de chantier explicitement ouverte.

---

## 1. Chantier ouvert

**Redesign du storefront** — décision humaine du 2026-09-10, `README.md` §2.3.

| Élément | État écrit |
|---|---|
| Header, Home, Footer (PASS 1) | Implémentés et validés visuellement desktop + mobile, selon le README. Hero campagne desktop/mobile intégrés |
| Shop, Product Detail | Restent aux passes suivantes |
| Checkout, auth, APIs, Printful, Stripe | Hors périmètre de ce chantier, à laisser inchangés |
| Photographie produit propriétaire | Direction validée le 2026-09-09 ; production différée jusqu’au catalogue réel de lancement. Les SKU / mockups Printful restent des données de développement. Aucun chantier catalogue ouvert |
| Derniers commits après la PASS 1 | `be8b414` (2026-09-15), `7d0f94f` (2026-09-28), `30c1a4f` (2026-10-08) : actifs hero / campagne et checkpoint documentaire. Aucun message de commit après `13a4bd5` n’annonce une passe Shop ou Product Detail |

Fichiers de la surface déjà touchée par cette passe : `src/components/Header.jsx`, `src/components/Footer.jsx`, `src/pages/Home.jsx`, leurs CSS, `src/assets/brand/`, `src/assets/campaign/`.

La Phase 1 — Fondation de marque n’est pas déclarée terminée. Critère de sortie : un inconnu comprend la marque en 10 secondes (`docs/00_PROJECT_MASTER.md` §10). Le README §2.1 cite les photographies de marque encore absentes dans `docs/web/HOMEPAGE_ASSETS.md` comme exemple. Depuis, des photos de campagne sont dans `src/assets/campaign/`. Le critère de phase, lui, n’est pas déclaré atteint.

---

## 2. Sujets documentés, explicitement non ouverts

Le README §2.3 les laisse à une décision humaine, sans ordre :

- reprise ou revalidation de l’audit décrit dans `docs/compliance/PRIVACY_COOKIES_CHATBOT_PLAN.md` §23 (texte antérieur à P8–P24) ;
- dette et résidus déjà identifiés (inventaire ; éléments de session non priorisés dans le README).

Aucun P25 de sécurité n’est ouvert. Ne pas rouvrir P3–P24. Journal : `docs/compliance/TECHNICAL_SECURITY_REMEDIATION_LOG.md`.

---

## 3. Inachevés visibles dans le code

Ces écrans sont des placeholders. Le menu admin y mène quand même (`src/admin/AdminLayout.jsx`).

| Surface | Fichier | Constat |
|---|---|---|
| Événements Stripe | `src/admin/pages/StripeEvents.jsx` | Texte statique. L’API `GET /api/admin/stripe-events` existe dans `server/routes/adminRoutes.js` et n’est pas appelée par cette page |
| Paniers abandonnés | `src/admin/pages/AbandonedCarts.jsx` | Texte « bientôt ». Pas de route admin correspondante dans `adminRoutes.js` |
| Journaux | `src/admin/pages/Logs.jsx` | Texte « placeholder ». Pas de route admin correspondante |
| Utilisateurs | `src/admin/pages/Users.jsx` | Texte « Users page ». Pas de route admin correspondante |

Le backend a bien `POST /api/log-abandoned-cart` et le job `server/jobs/abandonedCartJob.js`, indépendamment de l’écran admin.

Aucun fichier de test et aucun script `npm test` ne sont présents. `npm run lint` existe et n’a pas été exécuté pendant cet audit.

---

## 4. Dette listée dans l’inventaire — à revalider, pas à traiter d’office

Source : `docs/INVENTAIRE_Flippin_Maple.md`. Ce fichier n’est pas une source stratégique (`README.md` §6). Les blocs marqués « historique » ou « Résolution P20 » sont clos dans l’inventaire lui-même (FK `carts.user_id`, snapshots d’adresse, `main_category_id`). Ne pas les rouvrir.

Blocs qui portent encore l’en-tête `TODO` sans note de résolution dans l’inventaire :

| Section | Sujet encore écrit comme TODO |
|---|---|
| §1.4 `abandoned_carts` | Exiger `user_id` ou (`anonymous_token` + `customer_email`) ; moment exact de `is_recovered` |
| §1.6 `order_items` | Immutabilité commentée de `price_at_purchase` / `unit_price_cents` ; contrôle `printful_variant_id` |
| §1.7 `order_status_history` | Une ligne d’historique à chaque changement de `orders.status` |
| §1.8 `shipping_logs` | Effet de `ON DELETE CASCADE` si une commande est supprimée |
| §1.10 `products` | `category` libre ou FK ; harmoniser `external_id` et `printful_product_id` |
| §1.11 `product_images` | Images de variantes `is_active = 0` |
| §1.12 `product_promotions` | Ignorer une promo dont `end_date` est passée |
| §1.13 `reviews` | Lien « achat vérifié » ; contrainte de note 1..5 |
| §1.14 `wishlists` | Le DATA_MODEL marque la table comme retirée. Le TODO d’inventaire est donc à relire avant toute action |
| §1.20 `stripe_events` | Le TODO parle d’ajouter `order_id`. DATA_MODEL et HOSTING_CONSTRAINTS indiquent que la colonne existe déjà en production. Ne pas traiter ce TODO comme une migration encore à faire sans relecture |
| §1.21 logs | Normaliser `logs.context` ; durée de rétention. Le code a déjà `LOG_RETENTION_DAYS` (défaut 7) dans `server/jobs/purgeLogs.js` |

Tâches reformatées plus bas dans l’inventaire, également sans clôture dans ce fichier : SEC-001 à SEC-004, PAY-001 à PAY-005, MKT-001, MKT-002, OBS-001, OBS-002. Une partie recouvre des invariants maintenant tenus par `CHECKOUT_INVARIANTS.md` et par le journal P3–P24. Les revalider avant de coder.

---

## 5. Documents prévus et absents

Constitution §11.2, toujours non créés au 2026-11-08 :

- `docs/product/CATALOG_RULES.md`
- `docs/engineering/INVARIANTS.md` (ne devra pas dupliquer les invariants checkout)
- `docs/engineering/SECURITY.md`
- `docs/ops/RUNBOOKS.md`
- `docs/backlog/TECH_DEBT.md`

Décalage documentaire constaté : `docs/web/HOMEPAGE_ASSETS.md` §3 ne décrit pas les fichiers maintenant présents dans `src/assets/campaign/` et `public/`. Le README §2.3 est plus récent sur le hero.

`NOTES.md` ne contient qu’une ligne datée du 2025-10-21 sur les cookies httpOnly. Le README le classe comme note historique à évaluer.

---

## 6. Problèmes techniques connus, cités par les docs ou le code

- Hostinger : `ALTER TABLE` peut échouer (erreur 1044). Les ALTER restent au cas par cas. Ne pas généraliser un succès phpMyAdmin. Source : `docs/engineering/HOSTING_CONSTRAINTS.md`.
- `npm run migrate` refuse de tourner si `schema_migrations` est absente et ne crée pas cette table. Ne pas l’accrocher au démarrage ni à un déploiement.
- `FRONTEND_URL` en production ne doit pas être une liste séparée par des virgules : la première entrée est utilisée pour les URL Stripe.
- `UNSUB_HMAC_SECRET` est obligatoire en production depuis P10-B2. Une rotation invalide les liens déjà envoyés. Ne pas copier la valeur.
- Basic Auth de site : si le drapeau est vrai sans identifiants, l’application répond 503. Ne pas désactiver l’exemption `/webhook*`.
- Deux arbres `node_modules` (racine et `server/`) et deux versions verrouillées de `dotenv` (17.2.3 et 16.6.1).
- `pg` est installable mais aucun import applicatif n’a été trouvé. Ne pas le retirer sans vérification : ce document ne prouve pas qu’aucun outil externe ne s’y attend.
- Le dépôt n’a pas de suite de tests automatisés.

---

## 7. Ce qu’il ne faut pas faire au prochain démarrage

- Ouvrir un chantier catalogue, un P25, ou une « phase R11 ».
- Refactorer Stripe, Printful ou le checkout pour « préparer la portabilité ». L’inventaire de couplage décrit dans ARCHITECTURE §12 n’existe pas encore et exige un mandat.
- Inventer des pages légales. ARCHITECTURE §7 : P8 a confirmé de ne pas inventer de CGU ni de politique vide.
- Lancer `npm audit fix --force` (`README.md` §7).
- Déployer, migrer la production, ou committer des `.env`.
