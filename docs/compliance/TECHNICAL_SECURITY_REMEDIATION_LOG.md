# Journal des correctifs techniques et de sécurité

**Statut :** journal actif — chantiers P3 (checkout public), P4 (webhook Stripe / idempotence), P5 (fallback `order_items`), P6 (gestionnaire d’erreurs), P7 (authentification / sessions / JWT), P8 (inscription / consentement marketing / privacy technique), P9 (consentements email / unsubscribe / webhooks et cycle de révocation), P10 (secret unsubscribe / token hardening), P11 (paniers abandonnés), P13 (données Stripe conservées / minimisation), P14 (livraison Printful), P15 (inventaire Printful), P16 (page de succès), P17 (produits publics), P18 (wishlist) et P19 (Printful automatique du webhook) : **FERMÉS / COMPLETS**. P15, P16, P17, P18 et P19 sont **VALIDÉS EN PRODUCTION**. P12 (job / cron des paniers abandonnés) demeure un chantier **distinct** : sa clôture documentaire n’est pas faite ici ; une validation runtime finale y reste différée. **P20** (base de données et migrations) est **EN COURS** : P20-A (inventaire production read-only) et P20-B (runner de migrations) sont terminés ; **P20-C** (baseline `schema_migrations`) est **terminé et validé en production** ; **P20-D1** à **P20-D4** (FK commande / identifiants Stripe uniques) sont **terminés et validés en production** ; **P20-D5** (`carts` / `uq_user_open`) est **fermé** (analyse terminée, aucune migration) ; **P20-D6** (retrait `wishlists`) est **fermé / validé en production** ; P20-D7 et les étapes suivantes restent à faire. P20 n’est **pas fermé**.

Ce document complète `docs/compliance/TECHNICAL_SECURITY_AUDIT.md`.

- le **rapport d’audit** conserve les constats initiaux figés;
- ce **journal** conserve les corrections, commits, déploiements, validations et résultats;
- aucune valeur secrète (mot de passe, clé API, jeton, secret HMAC, etc.) ne doit y être inscrite.

---

## 28 juillet 2026 — Stabilisation initiale de la production

### Configuration Hostinger

- `NODE_ENV` a été modifié de `development` à `production` dans les variables Hostinger.
- Aucun `TRUST_PROXY` ou `TRUST_PROXY_HOPS` explicite n’a été ajouté.
- Le code active automatiquement trust proxy en production avec une valeur par défaut de 1 hop.
- Un redéploiement Hostinger a été effectué.
- `GET /readiness` a retourné `ok: true`.
- `GET /api/products` a retourné quatre produits.
- `POST /api/auth/logout` a confirmé que les cookies `access` et `refresh` utilisent maintenant :
  - `HttpOnly`;
  - `Secure`;
  - `SameSite=Lax`;
  - `Path=/`.
- Le limiteur de livraison a été validé :
  - requêtes 1 à 20 : HTTP 400 avec corps invalide;
  - requête 21 : HTTP 429;
  - aucune erreur trust proxy ou `X-Forwarded-For` observée.

### Correctif du middleware d’erreur Express

**Commit :** `68430ba` — `fix(server): register Express error middleware correctly`

**Fichier :** `server/middlewares/errorHandler.js`

**Modification :**

- signature passée de `errorHandler(err, req, res)` à `errorHandler(err, req, res, _next)`;
- Express peut maintenant reconnaître correctement le middleware d’erreur;
- aucune autre logique n’a été modifiée.

### Correctif de /readiness

**Commit :** `9f500d1` — `fix(server): hide readiness database errors`

**Fichier :** `server/app.js`

**Modification :**

- le message MySQL détaillé n’est plus retourné publiquement;
- la réponse d’échec devient :
  `{ ok: false, error: "service_unavailable" }`

### Désactivation de la route Printful publique

**Commit :** `8fc3939` — `fix(api): disable public Printful order route`

**Fichier :** `server/routes/ordersRoutes.js`

**Modification :**

- retrait du montage de `POST /api/printful-order`;
- la fonction du contrôleur n’a pas encore été supprimée;
- les routes protégées `/api/protected` et `/api/user-info` sont restées intactes.

**Validation en production :**

- `POST /api/printful-order` retourne HTTP 404;
- réponse :
  `{ "error": "Not Found", "path": "/api/printful-order", "method": "POST" }`

### Limitation des appels d’inventaire Printful

**Commit :** `a183038` — `fix(api): rate limit Printful inventory checks`

**Fichier :** `server/routes/inventoryRoutes.js`

**Modification :**

- `inventoryLimiter` est maintenant appliqué à :
  `GET /api/inventory/printful-stock/:id`
- limite actuelle :
  60 requêtes par minute et par IP.

**Validation en production :**

- appel avec une variante publiée : HTTP 200;
- réponse :
  `{ "available": 999 }`
- en-têtes observés :
  - `RateLimit-Policy: 60;w=60`
  - `RateLimit-Limit: 60`
  - `RateLimit-Remaining: 59`
  - `RateLimit-Reset: 60`
- préciser que `available: 999` représente un statut virtuel de disponibilité et non une quantité réelle.

### Git et déploiement

- les commits ont été poussés sur `origin/main`;
- Hostinger redéploie automatiquement après un push sur `main`;
- les déploiements ont été validés avec `/readiness`;
- le problème Git lié au fichier `ca-bundle.crt` absent a été corrigé sans désactiver SSL;
- Git utilise maintenant le backend `schannel` du magasin de certificats Windows;
- ne pas inscrire de chemins contenant des secrets ou de données d’authentification.

### Masquage du détail des produits non visibles

**Commit :** `12fd1e2` — `fix(products): hide non-visible product details`

**Fichier concerné :**

- `server/controllers/productsController.js`

**Modification :**

- `getProductDetails` exige maintenant `is_visible = 1`;
- les routes publiques `/api/products/:id` et `/api/products/details/:id` ne doivent plus retourner un produit masqué;
- aucune modification aux variantes, aux listes de produits ou aux routes.

**Validation en production :**

- `GET /readiness` a retourné `ok: true` après le redéploiement;
- le détail d’un produit visible publié a retourné HTTP 200;
- le produit et ses variantes ont été retournés correctement;
- aucun produit réellement masqué n’a été utilisé pour un test direct;
- le comportement HTTP 404 d’un produit avec `is_visible = 0` est confirmé par la condition SQL, mais reste à valider empiriquement lorsqu’un identifiant masqué contrôlé sera disponible.

### Validation stricte des identifiants de produits

**Commit :** `d06d4af` — `fix(products): validate product ids strictly`

**Fichier concerné :**

- `server/controllers/productsController.js`

**Modification :**

- `getProductDetails` convertit d’abord `req.params.id` en chaîne et applique `trim()`;
- seuls les identifiants composés exclusivement de chiffres sont acceptés;
- l’identifiant converti doit être un entier positif sécuritaire selon `Number.isSafeInteger`;
- les valeurs comme les décimales, les nombres négatifs, zéro et les entiers non sécuritaires sont refusées avec HTTP 400;
- aucune modification aux requêtes SQL, aux routes ou aux réponses des produits valides.

**Validation en production :**

- `GET /readiness` a retourné `ok: true` après le redéploiement;
- `GET /api/products/abc` a retourné HTTP 400 avec l’erreur `ID de produit invalide`;
- `GET /api/products/1.5` a retourné HTTP 400, confirmant le nouveau comportement strict;
- `GET /api/products/34` a retourné HTTP 200;
- le produit visible et ses variantes ont été retournés correctement.

### Limitation de la longueur des recherches de produits

**Commit :** `cc0aea3` — `fix(products): limit search query length`

**Fichier concerné :**

- `server/controllers/productsController.js`

**Modification :**

- `getVisibleProducts` refuse maintenant les recherches dont la valeur `q` dépasse 100 caractères;
- une recherche trop longue retourne HTTP 400 avec l’erreur `Recherche trop longue.`;
- la normalisation existante avec `String(...).trim()` est conservée;
- aucune modification au SQL, à la logique `LIKE` ou au frontend.

**Validation en production :**

- `GET /readiness` a retourné `ok: true` après le redéploiement;
- une recherche `q` de 101 caractères a retourné HTTP 400;
- la réponse JSON était exactement `{"error":"Recherche trop longue."}`;
- une recherche `q` de 100 caractères a retourné HTTP 200;
- la réponse était un tableau vide valide, confirmant que la limite accepte bien 100 caractères.

### Alignement du champ de recherche frontend

**Commit :** `51747b8` — `fix(shop): limit search input length`

**Fichier concerné :**

- `src/pages/Shop.jsx`

**Modification :**

- le champ de recherche de la boutique possède maintenant `maxLength={100}`;
- l’interface empêche un utilisateur normal de saisir une recherche dépassant la limite de 100 caractères imposée par l’API;
- aucune modification au state, à l’appel API, au texte ou au style du champ.

**Validation en production :**

- `GET /readiness` a retourné `ok: true` après le redéploiement;
- une chaîne test de 104 caractères a été collée dans le champ de recherche;
- le champ a conservé exactement 100 caractères;
- les quatre derniers caractères ont été bloqués, confirmant le fonctionnement de `maxLength={100}`.

### Exclusion des variantes inactives des réponses publiques

**Commit :** `74d36c8` — `fix(products): hide inactive variants publicly`

**Fichier concerné :**

- `server/controllers/productsController.js`

**Modification :**

- `getVisibleProducts` limite maintenant le LEFT JOIN aux variantes avec `is_active = 1`;
- `getProductDetails` retourne uniquement les variantes avec `is_active = 1`;
- `getFeaturedProducts` limite maintenant le LEFT JOIN aux variantes avec `is_active = 1`;
- les filtres des listes sont placés dans les clauses ON afin de conserver les LEFT JOIN;
- un produit visible sans variante active peut donc toujours être retourné avec un tableau de variantes vide;
- aucune route, colonne sélectionnée, logique de recherche ou logique de regroupement JavaScript n’a été modifiée.

**Validation en production :**

- `GET /readiness` a retourné `ok: true` après le redéploiement;
- `GET /api/products` a retourné HTTP 200 avec les 4 produits visibles;
- les produits retournés conservaient respectivement 5, 2, 3 et 6 variantes actives;
- `GET /api/products/34` a retourné HTTP 200 avec le produit Youth t-shirt et 5 variantes;
- `GET /api/products/featured` a retourné HTTP 200 avec un tableau vide valide;
- aucun produit n’est actuellement marqué comme vedette;
- aucune variante réellement inactive connue n’a été utilisée pour un test direct;
- l’exclusion des variantes avec `is_active = 0` est confirmée par les conditions SQL, mais reste à valider empiriquement lorsqu’un identifiant contrôlé sera disponible.

### Exposition du prix minimal actif des produits

**Commit :** `8ea86d9` — `feat(products): expose minimum active price`

**Fichier concerné :**

- `server/controllers/productsController.js`

**Modification :**

- `getVisibleProducts` calcule maintenant le prix minimal de chaque produit avec une sous-requête corrélée;
- le calcul utilise `MIN(pv.price)` uniquement parmi les variantes dont `is_active = 1`;
- les prix nuls sont exclus du calcul;
- chaque produit retourné par `GET /api/products` contient maintenant le champ `min_price`;
- un produit visible sans prix actif peut toujours être retourné avec `min_price: null`;
- aucune modification n’a été apportée à `getProductDetails` ou à `getFeaturedProducts`;
- aucune modification n’a été apportée au checkout, à Stripe, à Printful ou au regroupement des variantes.

**Validation en production :**

- `GET /readiness` a retourné `ok: true` après le redéploiement;
- `GET /api/products` a retourné les 4 produits visibles avec leur champ `min_price`;
- Youth t-shirt a retourné `min_price: 29.99`, identique au minimum calculé parmi ses 5 variantes retournées;
- Mug with Color Inside a retourné `min_price: 14.50`, identique au minimum calculé parmi ses 2 variantes retournées;
- Flippin' Maple Teddy Pancakes a retourné `min_price: 12.00`, identique au minimum calculé parmi ses 3 variantes retournées;
- Dad memories a retourné `min_price: 54.99`, identique au minimum calculé parmi ses 6 variantes retournées;
- la comparaison numérique automatisée a retourné `Matches: True` pour chacun des 4 produits;
- aucun produit sans prix actif n’était disponible pour valider empiriquement le comportement `min_price: null`.

### Validation du paramètre de tri des produits

**Commit :** `c704ff1` — `feat(products): validate sort parameter`

**Fichier concerné :**

- `server/controllers/productsController.js`

**Modification :**

- `getVisibleProducts` lit maintenant le paramètre de requête `sort`;
- lorsque `sort` est absent, la valeur par défaut est `relevance` si `q` est non vide et `newest` si `q` est vide;
- les valeurs autorisées sont limitées à `relevance`, `price_asc`, `price_desc`, `newest` et `name_asc`;
- toute valeur inconnue retourne HTTP 400 avec l’erreur stable `Tri invalide.`;
- aucune valeur fournie par l’utilisateur n’est injectée dans le SQL ou dans la clause `ORDER BY`;
- la clause `ORDER BY p.id DESC` demeure inchangée à cette étape;
- aucun comportement de tri réel ni score de pertinence n’a encore été ajouté;
- aucune modification n’a été apportée à `getProductDetails`, à `getFeaturedProducts`, au checkout, à Stripe ou à Printful.

**Validation en production :**

- `GET /readiness` a retourné `ok: true` après le redéploiement;
- `GET /api/products?sort=invalid` a retourné HTTP 400;
- la réponse JSON était exactement `{"error":"Tri invalide."}`;
- `GET /api/products?sort=newest` a retourné HTTP 200 avec les 4 produits visibles;
- chacune des valeurs `relevance`, `price_asc`, `price_desc`, `newest` et `name_asc` a retourné HTTP 200;
- chacune de ces cinq valeurs a retourné les 4 produits visibles;
- l’ordre des produits n’a pas été validé puisque l’implémentation des tris est prévue dans une étape distincte.

### Implémentation des tris simples et préservation de l’ordre SQL

**Commits :**

- `05cd73b` — `feat(products): implement simple sorting`
- `7cfd1d9` — `fix(products): preserve SQL sort order`

**Fichier concerné :**

- `server/controllers/productsController.js`

**Modification :**

- `getVisibleProducts` utilise maintenant un mapping interne constant pour associer chaque valeur autorisée de `sort` à une clause `ORDER BY`;
- aucune valeur fournie par l’utilisateur n’est interpolée directement dans le SQL;
- `newest` trie par `p.updated_at DESC`, puis `p.id DESC`;
- `name_asc` trie par `p.name ASC`, puis `p.id DESC`;
- `price_asc` place les produits ayant un prix avant ceux sans prix, puis trie `min_price` en ordre croissant;
- `price_desc` place également les produits sans prix à la fin, puis trie `min_price` en ordre décroissant;
- les égalités de prix utilisent ensuite `p.name ASC`, puis `p.id DESC`;
- `v.id ASC` stabilise l’ordre des variantes à l’intérieur de chaque produit;
- `relevance` sans recherche utilise le même tri que `newest`;
- `relevance` avec une recherche conserve temporairement l’ordre `p.id DESC` jusqu’à l’étape dédiée au score de pertinence;
- le regroupement de `getVisibleProducts` utilise maintenant un `Map` afin de préserver l’ordre d’insertion provenant de MySQL;
- l’ancien regroupement avec un objet et `Object.values()` réordonnait les clés numériques par identifiant et annulait le tri SQL;
- aucune modification n’a été apportée à `getProductDetails`, à `getFeaturedProducts`, au checkout, à Stripe ou à Printful.

**Validation en production :**

- `GET /readiness` a retourné `ok: true` après chacun des redéploiements concernés;
- la première validation de `name_asc` a révélé que la réponse demeurait ordonnée par identifiant croissant à cause du regroupement JavaScript avec un objet;
- après le correctif utilisant `Map`, `name_asc` a retourné, dans l’ordre : Dad memories, Flippin' Maple Teddy Pancakes, Mug with Color Inside et Youth t-shirt;
- `price_asc` a retourné les prix minimaux dans l’ordre `12.00`, `14.50`, `29.99`, puis `54.99`;
- `price_desc` a retourné les prix minimaux dans l’ordre `54.99`, `29.99`, `14.50`, puis `12.00`;
- `newest` a retourné les identifiants `37`, `36`, `35`, puis `34`;
- `relevance` sans recherche a retourné exactement le même ordre que `newest`;
- l’absence du paramètre `sort` a retourné exactement le même ordre que `newest`;
- `GET /api/products?sort=invalid` a continué de retourner HTTP 400 avec la réponse exacte `{"error":"Tri invalide."}`;
- aucun produit sans prix actif n’était disponible pour valider empiriquement son placement en fin de liste;
- les valeurs `updated_at` ne sont pas exposées dans la réponse publique, donc les dates exactes du tri `newest` n’ont pas été comparées directement.

### Recherche lexicale pondérée et score de pertinence

**Commit :** `14eca63` — `feat(products): add relevance scoring`

**Fichier concerné :**

- `server/controllers/productsController.js`

**Modification :**

- `getVisibleProducts` utilise maintenant un score de pertinence lexical pondéré lorsqu’une recherche `q` non vide est triée par `relevance`;
- les poids privilégient, dans cet ordre général, le nom exact, le préfixe du nom, l’expression complète dans le nom, les correspondances multiples dans le nom, la catégorie, la marque, la couleur d’une variante active, la taille d’une variante active et la description;
- les correspondances sur plusieurs mots augmentent cumulativement le score;
- les égalités de pertinence sont départagées par `p.updated_at DESC`, puis `p.id DESC`;
- la recherche couvre maintenant `name`, `description`, `brand`, `category`, ainsi que `color` et `size` des variantes actives;
- les recherches sur les variantes utilisent des sous-requêtes `EXISTS` avec `is_active = 1`, évitant de dupliquer les produits;
- l’expression complète et les mots distincts sont traités séparément;
- un maximum de 8 mots distincts est traité séparément afin de borner la croissance du SQL et du nombre de paramètres;
- toutes les valeurs provenant de `q` demeurent transmises avec des paramètres préparés;
- aucune donnée utilisateur n’est concaténée directement dans le SQL;
- `relevance_score` est calculé dans la requête mais n’est pas exposé dans la réponse publique;
- le regroupement avec `Map` est conservé afin de préserver l’ordre SQL;
- lorsqu’un `q` non vide est fourni sans paramètre `sort`, le tri par défaut est `relevance`;
- un tri explicite différent de `relevance` demeure applicable à une recherche;
- les tris `price_asc`, `price_desc`, `newest` et `name_asc` n’ont pas été modifiés;
- aucune modification n’a été apportée à `getProductDetails`, à `getFeaturedProducts`, au checkout, à Stripe, à Printful, à l’authentification ou à la base de données.

**Validation en production :**

- `GET /readiness` a retourné `ok: true` après le redéploiement;
- une recherche exacte `Youth t-shirt` a retourné Youth t-shirt en première position;
- `relevance_score` était absent de la réponse publique de cette recherche;
- une recherche par préfixe `Youth` a retourné Youth t-shirt;
- une recherche par expression complète `Maple Teddy` a retourné Flippin' Maple Teddy Pancakes;
- une recherche avec les mots inversés `Teddy Maple` a également retourné Flippin' Maple Teddy Pancakes, confirmant le traitement des mots séparés;
- une recherche sur la couleur active `Azalea` a retourné uniquement Dad memories;
- une recherche sur la taille active `XS` a retourné uniquement Youth t-shirt;
- une recherche `15 oz` a retourné deux produits uniques, Flippin' Maple Teddy Pancakes et Mug with Color Inside, sans duplication malgré les correspondances sur les variantes;
- une recherche comportant huit termes sans correspondance suivis de `Youth` en neuvième position a retourné zéro produit, confirmant que seuls les huit premiers mots distincts sont traités séparément;
- une recherche `Youth Maple Teddy` a classé Flippin' Maple Teddy Pancakes avant Youth t-shirt, confirmant que plusieurs mots correspondants augmentent le score;
- avec `q=Youth Maple Teddy` sans paramètre `sort`, l’ordre retourné était identique à `sort=relevance`;
- avec `q=15 oz&sort=price_desc`, Mug with Color Inside à `14.50` a été classé avant Flippin' Maple Teddy Pancakes à `12.00`, confirmant qu’un tri explicite demeure respecté pendant une recherche;
- une recherche de 101 caractères a continué de retourner HTTP 400 avec la réponse exacte `{"error":"Recherche trop longue."}`;
- les descriptions des quatre produits actuellement visibles sont identiques à leurs noms, donc le poids de la description n’a pas pu être isolé empiriquement;
- aucune donnée contrôlée disponible dans les réponses publiques actuelles n’a permis de valider séparément les correspondances sur `brand` et `category`;
- le comportement de `brand`, `category` et `description` est présent dans le SQL, mais ces trois dimensions devront être validées empiriquement lorsqu’un jeu de données contrôlé permettant de les isoler sera disponible.

### Recherche explicite du catalogue côté interface

**Commits :**

- `79876d4` — `feat(shop): submit product search explicitly`
- `b2ff863` — `fix(shop): restore catalogue when search is cleared`
- `a2e4410` — `style(shop): fix search handler indentation`

**Fichier concerné :**

- `src/pages/Shop.jsx`

**Modification :**

- l’ancien état unique `search` a été remplacé par deux états distincts : `searchInput` pour la valeur actuellement saisie et `submittedSearch` pour la recherche effectivement soumise;
- le debounce de 300 ms associé à la recherche a été entièrement supprimé;
- la saisie dans le champ ne déclenche plus de requête API à chaque frappe;
- le champ de recherche est maintenant intégré dans un élément `<form>` sémantique;
- la soumission du formulaire par la touche Entrée appelle `handleSearchSubmit`;
- lors de la soumission, la valeur saisie est normalisée avec `trim()` avant d’être copiée dans `submittedSearch`;
- le chargement des produits dépend maintenant de `submittedSearch`;
- lorsqu’une recherche non vide est soumise, `/products` est appelé avec le paramètre `q`;
- lorsqu’aucune recherche n’est soumise, `/products` est appelé sans paramètre `q`;
- lorsque le champ de recherche devient complètement vide, `submittedSearch` est immédiatement remis à une chaîne vide afin de réafficher automatiquement le catalogue sans exiger une nouvelle soumission;
- l’effacement automatique du champ ne réintroduit aucun debounce et ne déclenche pas de recherche intermédiaire pendant la saisie;
- `maxLength={100}` demeure appliqué côté interface;
- le label du champ est maintenant explicitement associé à l’input avec `htmlFor` et `id`;
- aucun bouton de recherche ni icône de loupe n’a encore été ajouté dans cette étape;
- aucun contrôle de tri n’a encore été ajouté;
- aucun état explicite de chargement ou d’erreur n’a encore été ajouté;
- aucun changement n’a été apporté au CSS, aux cartes produits, au prix affiché, à la preview, au highlight, aux toasts, à la navigation, au checkout, à Stripe, à Printful, à l’authentification ou à la base de données.

**Validation en production :**

- `GET /readiness` a retourné `ok: true` après les déploiements;
- avec quatre produits affichés initialement, la saisie de `Youth` sans soumettre le formulaire a laissé les quatre produits affichés, confirmant qu’aucune recherche n’est déclenchée pendant la saisie;
- après avoir appuyé sur Entrée avec `Youth`, un seul produit a été affiché, confirmant que la recherche est déclenchée uniquement lors de la soumission explicite;
- après une recherche active, vider complètement le champ a réaffiché automatiquement les quatre produits sans devoir appuyer sur Entrée;
- le commit `a2e4410` n’a modifié que l’indentation du gestionnaire `onChange` et n’a introduit aucun changement fonctionnel.

### Bouton de recherche avec loupe

**Commits :**

- `be07a8b` — `feat(shop): add search submit button`
- `be7d146` — `fix(register): scope submit button styles`

**Fichiers concernés :**

- `src/pages/Shop.jsx`
- `src/pages/styles/Shop.css`
- `src/pages/styles/Register.css`

**Modification :**

- le formulaire de recherche de la boutique possède maintenant un véritable bouton `type="submit"` permettant de déclencher la recherche au clic;
- le bouton utilise l’icône `Search` de `lucide-react`, déjà présente dans les dépendances du projet;
- le bouton possède `aria-label="Rechercher"` et l’icône est marquée `aria-hidden="true"`;
- l’input et le bouton sont regroupés dans `.shop-search__control`;
- la loupe est intégrée à droite du champ de recherche et le padding droit de l’input réserve l’espace nécessaire;
- le bouton utilise des états `hover` et `focus-visible`;
- sa transition est désactivée lorsque `prefers-reduced-motion: reduce` est actif;
- aucun changement n’a été apporté à la logique `searchInput` / `submittedSearch`, au tri, aux états loading/error ou aux prix;
- lors du premier déploiement, le bouton de recherche héritait incorrectement de styles globaux définis dans `Register.css`, ce qui le transformait en gros bouton bleu pleine largeur;
- la cause était constituée des sélecteurs globaux `button[type='submit']`, `button[type='submit']:hover` et `button[disabled]` présents dans `Register.css`;
- ces trois sélecteurs ont été restreints à `.register-container`, éliminant la fuite de styles vers les autres pages sans modifier l’apparence ni le comportement du formulaire d’inscription;
- aucun override supplémentaire n’a été ajouté dans `Shop.css` pour masquer le problème : la fuite CSS a été corrigée à sa source.

**Validation en production :**

- après le correctif de portée CSS, la loupe apparaît comme une petite action intégrée à droite du champ de recherche;
- le bouton bleu pleine largeur observé lors du premier déploiement a disparu;
- le bouton de recherche cohabite correctement avec le bouton d’effacement natif de l’input `type="search"`;
- avec `youth` saisi dans le champ, un clic sur la loupe a déclenché la recherche et affiché un seul produit;
- le comportement de soumission par Entrée validé à l’étape précédente demeure disponible.

### Contrôle de tri du catalogue côté interface

**Commit :**

- `aad9086` — `feat(shop): add product sort control`

**Fichiers concernés :**

- `src/pages/Shop.jsx`
- `src/pages/styles/Shop.css`

**Modification :**

- ajout d’un état frontend `sort`, initialisé à `newest`;
- l’appel `GET /products` transmet maintenant toujours explicitement le paramètre `sort`;
- le contrôle de tri est un `<select>` accessible associé au label `Trier par`;
- les choix visibles sont :
  - `Pertinence`;
  - `Prix : du plus bas au plus élevé`;
  - `Prix : du plus élevé au plus bas`;
  - `Plus récents`;
  - `Nom : A à Z`;
- une nouvelle recherche non vide soumise replace automatiquement le tri à `relevance`;
- une recherche vide ou l’effacement complet du champ replace automatiquement le tri à `newest`;
- changer le `<select>` modifie immédiatement `sort` et relance le chargement des produits;
- la recherche reste explicite : aucune requête n’est déclenchée à chaque frappe;
- aucun changement n’a été apporté au backend dans ce commit;
- aucun changement n’a été apporté au checkout, à Stripe, à Printful, à l’authentification ou à la base de données.

**Validation en production :**

- sans recherche active, le contrôle affiche `Plus récents`;
- après soumission d’une recherche non vide, le contrôle passe automatiquement à `Pertinence`;
- après effacement complet de la recherche, le contrôle revient à `Plus récents`;
- le changement vers `Prix : du plus bas au plus élevé` réordonne immédiatement le catalogue;
- les comportements de recherche au clic sur la loupe et avec la touche Entrée demeurent fonctionnels.

### Simplification et finition visuelle des cartes du catalogue

**Commits :**

- `2730428` — `fix(shop): replace hover image preview with click modal`
- `4431aa1` — `feat(shop): add two-state image zoom viewer`
- `7aa37b6` — `fix(shop): stabilize image zoom cursor`
- `ec88059` — `refactor(shop): link catalogue images to product pages`
- `55ee755` — `style(shop): soften product image corners`
- `d875c65` — `style(shop): align product card metadata`
- `e4e5c01` — `style(shop): tighten product title spacing`
- `72b8997` — `style(shop): clamp desktop product titles to one line`

**Fichiers concernés :**

- `src/pages/Shop.jsx`
- `src/pages/styles/Shop.css`

**Modification :**

- l’ancien aperçu d’image plein écran déclenché au survol a d’abord été remplacé par un modal au clic afin de corriger un comportement où l’aperçu était difficile à fermer;
- un second niveau de zoom au clic a ensuite été essayé et corrigé;
- après validation UX, cette mécanique de viewer/zoom a finalement été entièrement retirée du catalogue;
- `ec88059` constitue l’état fonctionnel final de cette décision : cliquer sur l’image d’une carte ouvre directement la fiche `/product/:id`;
- les states, listeners, blocage du scroll, overlay, bouton de fermeture et CSS liés au viewer ont été supprimés;
- le lien texte `Voir le produit` demeure disponible;
- les cadres d’images utilisent maintenant un rayon de `0.75rem`, sans ombre ni bordure décorative;
- les titres et métadonnées des cartes ont été ajustés pour garder les prix et les liens alignés;
- sur les petits écrans, les titres conservent un maximum de deux lignes;
- à partir de `56rem`, les titres sont limités à une seule ligne avec ellipsis si nécessaire;
- aucun changement n’a été apporté aux dimensions de la grille, au ratio 4/5 des images, au backend, au checkout, à Stripe, à Printful ou à la base de données.

**Validation en production :**

- le catalogue déployé ne présente plus le viewer/zoom précédent; l’image de chaque produit est maintenant implémentée comme un lien vers `/product/:id`; le clic vers la bonne fiche produit reste à confirmer empiriquement en production;
- aucun viewer ou zoom du catalogue ne s’ouvre désormais;
- les coins arrondis à `0.75rem` ont été validés visuellement comme suffisamment doux sans transformer les cartes en composants fortement arrondis;
- les quatre prix du catalogue actuel sont alignés horizontalement;
- les quatre liens `Voir le produit` sont également alignés;
- sur desktop, les quatre titres actuels tiennent sur une seule ligne avec la disposition observée;
- l’espace artificiel qui existait entre les titres courts et les prix a été retiré tout en conservant l’alignement des métadonnées;
- le rendu final de la grille a été validé visuellement en production.

### États explicites de chargement et d’erreur du catalogue

**Commits :**

- `eda637f` — `feat(shop): add catalogue loading and error states`
- `078d5f9` — `fix(shop): hide stale product count on error`

**Fichiers concernés :**

- `src/pages/Shop.jsx`
- `src/pages/styles/Shop.css`

**Modification :**

- ajout des états frontend `loading`, `error` et `hasLoadedOnce`;
- le chargement initial du catalogue est maintenant distinct d’une mise à jour déclenchée par une recherche ou un changement de tri;
- chaque requête `/products` remet `loading` à `true` et efface l’erreur précédente avant son exécution;
- une protection locale `cancelled` empêche une ancienne requête de modifier l’interface après un changement rapide de recherche, de tri ou un démontage du composant;
- les produits précédemment chargés ne sont pas volontairement vidés au début d’une nouvelle requête, mais la grille est temporairement masquée par l’état de chargement;
- la section catalogue expose maintenant `aria-busy={loading}`;
- pendant le premier chargement, l’interface peut afficher `Chargement des produits…`;
- pendant une mise à jour après un premier chargement réussi, l’interface affiche `Mise à jour des produits…`;
- le compteur du catalogue affiche `Chargement…` pendant une requête;
- après une réponse réussie, le compteur affiche normalement le nombre de produits;
- si une requête réseau ou serveur échoue, le catalogue affiche `Impossible de charger les produits pour le moment.`;
- après une erreur, le compteur affiche maintenant `Indisponible` plutôt que de conserver visuellement un ancien nombre de produits;
- l’état d’erreur utilise `role="alert"`;
- l’état de chargement utilise `role="status"` et `aria-live="polite"`;
- le message `Aucun produit ne correspond à ta recherche.` n’est rendu qu’après la fin d’une requête réussie retournant zéro produit;
- ce message ne peut donc plus apparaître temporairement pendant un chargement;
- la logique de nettoyage du paramètre `highlight` attend maintenant que le chargement soit terminé avant de conclure qu’un produit est absent;
- aucun spinner ni animation supplémentaire n’a été ajouté;
- aucun changement n’a été apporté au backend, à la recherche, au score de pertinence, au tri, au checkout, à Stripe, à Printful, à l’authentification ou à la base de données.

**Validation en production :**

- une recherche volontairement inexistante a retourné `0 produits` et affiché `Aucun produit ne correspond à ta recherche.`;
- le tri était correctement passé à `Pertinence` pour cette recherche;
- avec le throttling réseau `3G`, un changement de tri a affiché `Chargement…` dans le compteur et `Mise à jour des produits…` à la place de la grille pendant que la requête `/products` était encore en attente;
- la requête de tri a ensuite retourné HTTP 200 et le catalogue a repris son affichage normal;
- l’état de chargement initial n’a pas été capturé visuellement de manière fiable, car le chargement du document et de l’application sous throttling masquait la courte fenêtre correspondante;
- avec DevTools placé en mode `Offline`, un changement de tri a provoqué l’échec de la requête `/products`;
- l’interface a alors affiché `Impossible de charger les produits pour le moment.`;
- après le correctif `078d5f9` et chargement de la nouvelle version frontend, le compteur a affiché `Indisponible` pendant cet état d’erreur;
- l’ancien nombre de produits n’est donc plus présenté comme s’il provenait d’une requête ayant réussi;
- les états aucun résultat, mise à jour en cours et erreur réseau ont été validés empiriquement en production.

### Validation finale de la recherche, du tri et du prix du catalogue

**Commit :**

- `419e860` — `fix(shop): display minimum active product price`

**Fichier concerné :**

- `src/pages/Shop.jsx`

**Modification :**

- le prix principal affiché dans chaque carte du catalogue utilise maintenant `product.min_price`;
- l’ancien affichage basé sur `firstVariant?.price` a été retiré;
- l’image de la carte continue d’utiliser la première variante disponible ou l’image produit;
- la logique de formatage monétaire CAD demeure inchangée;
- le prix affiché est maintenant le même prix minimal actif que celui utilisé par les tris `price_asc` et `price_desc`;
- ce changement aligne le frontend avec la définition officielle de `min_price` dans `PRODUCT_SEARCH_AND_SORT_SPEC.md`;
- aucun changement n’a été apporté au backend, aux variantes, à la recherche, au score de pertinence, aux états loading/error, au checkout, à Stripe, à Printful, à l’authentification ou à la base de données.

**Validation finale en production :**

Une batterie de validation directe de `GET /api/products` a donné les résultats suivants :

- recherche de 100 caractères : HTTP 200;
- recherche de 101 caractères : HTTP 400;
- `sort=invalid` : HTTP 400;
- `sort=name_asc` :
  - Dad memories;
  - Flippin' Maple Teddy Pancakes;
  - Mug with Color Inside;
  - Youth t-shirt;
- `sort=price_asc` :
  - 12.00;
  - 14.50;
  - 29.99;
  - 54.99;
- `sort=price_desc` :
  - 54.99;
  - 29.99;
  - 14.50;
  - 12.00;
- recherche `Youth Maple Teddy` avec `sort=relevance` :
  - Flippin' Maple Teddy Pancakes;
  - Youth t-shirt;
- recherche `Azalea` :
  - Dad memories;
- recherche `XS` :
  - Youth t-shirt;
- une recherche contenant huit termes sans correspondance suivis de `Youth` comme neuvième terme a retourné zéro produit, confirmant que seuls les huit premiers termes distincts sont traités séparément.

Après le déploiement du commit `419e860`, le catalogue a également été validé visuellement en production :

- Dad memories affiche `54,99 $`;
- Flippin' Maple Teddy Pancakes affiche `12,00 $`;
- Mug with Color Inside affiche `14,50 $`;
- Youth t-shirt affiche `29,99 $`;
- ces valeurs correspondent aux `min_price` retournés par l’API et utilisés pour le classement par prix.

**État du chantier :**

- les étapes 1 à 10 de `PRODUCT_SEARCH_AND_SORT_SPEC.md` sont maintenant implémentées;
- les validations de production prévues à l’étape 10 sont complétées pour les données actuellement disponibles;
- la documentation des changements validés satisfait l’étape 11;
- la première version officielle de la recherche et du tri du catalogue public est donc considérée comme terminée;
- les limites déjà documentées de cette v1 demeurent applicables, notamment l’absence de correction automatique des fautes, synonymes, traductions et recherche sémantique avancée;
- les dimensions `brand`, `category` et `description` dont l’isolation n’était pas possible avec les données publiques actuelles demeurent à valider empiriquement lorsqu’un jeu de données contrôlé approprié sera disponible.

---

## État après ces correctifs (série du 28 juillet 2026)

- site public fonctionnel;
- base accessible;
- catalogue fonctionnel;
- environnement production actif;
- cookies `Secure` actifs;
- limiteurs shipping et inventory actifs;
- route publique Printful désactivée;
- aucun changement au checkout, au calcul des prix ou au webhook Stripe dans cette série;
- à cette date, les risques critiques restants, y compris le contrôle navigateur des prix et totaux, demeuraient ceux du rapport d’audit.

---

## 13 août 2026 — Correctif P1 : prix, totaux et livraison autoritaires au checkout

**Constat initial (audit figé) :** le navigateur pouvait influencer les prix articles, le total et les frais de livraison transmis au checkout et à Stripe.

Le correctif a été livré en trois étapes, puis validé en production. Le rapport `TECHNICAL_SECURITY_AUDIT.md` n’a pas été modifié : il reste le constat historique.

### Étape A — Prix articles autoritaires côté serveur

**Commit :** `1f5b72b` — `fix(checkout): use authoritative variant prices`

**Fichier :** `server/controllers/checkoutController.js`

**Comportement :**

- `it.db_variant_id ?? it.id` est traité uniquement comme PK interne `product_variants.id`;
- la quantité est un entier positif sûr;
- les variantes dupliquées sont rejetées;
- lookup groupé par `product_variants.id`;
- la variante doit être active et le produit visible;
- le prix vendu vient de `product_variants.price`;
- le prix envoyé par le navigateur n’a aucune autorité;
- Stripe `price_data.unit_amount`, `orders` / `order_items` et metadata `cart_items` utilisent les lignes serveur;
- la résolution ambiguë par `variant_id` business ou `printful_variant_id` a été retirée du checkout.

**Validation production :**

Checkout contrôlé avec un prix client falsifié `0.01` pour une variante dont le prix DB officiel était `29.99`. Session Stripe créée, non payée.

- Stripe : `amount_subtotal = 2999`, `amount_total = 2999`;
- commande de test 97, status `pending` : `subtotal_cents = 2999`, `total_cents = 2999`;
- `order_item` : `price_at_purchase = 29.99`, `unit_price_cents = 2999`.

Le prix client falsifié n’a contaminé ni Stripe ni la commande.

### Étape B — Fallback webhook `order_items` durci

**Commit :** `82efc25` — `fix(checkout): harden webhook item fallback`

**Fichier :** `server/controllers/webhookController.js`

**Comportement :**

- le fallback n’accepte que le format metadata serveur (`id` PK, `variant_id` business, `quantity`, `unit_price_cents` obligatoires);
- `printful_variant_id` est optionnel, mais strict s’il est fourni;
- aucun fallback vers `price` / `unit_price` / `unitPrice` / `qty` ni identifiants ambigus;
- validation all-or-nothing (aucune ligne invalide n’est ignorée silencieusement);
- lookup groupé par PK DB, concordance PK / identifiant business / Printful;
- le subtotal reconstruit doit égaler exactement `orders.subtotal_cents`;
- overflow protégé;
- insertion uniquement après validation complète, et seulement si la commande n’a encore aucun `order_item`;
- transaction sur une connexion dédiée (`getConnection` / `beginTransaction` / commit ou rollback / `release`).

**Validation :** revue de code et déploiement. `/readiness` production a retourné `ok: true`. Aucun paiement n’a été provoqué pour forcer le fallback; aucun `order_item` n’a été supprimé à cette fin.

### Étape C — Livraison autoritaire côté serveur

**Commit :** `aba0fa2` — `fix(checkout): validate shipping rates server-side`

**Fichiers :**

- `server/controllers/checkoutController.js`
- `src/pages/Checkout.jsx`

**Comportement :**

- le frontend n’envoie que `{ id: shippingRate.id }`;
- `rate` et `name` navigateur n’ont plus d’autorité;
- adresse, identifiants Printful issus de `normalizedLines`, rate id et réponse Printful sont validés avant tout `INSERT INTO orders`;
- le checkout appelle `POST https://api.printful.com/shipping/rates` et exige un match exact de l’id;
- aucun fallback par nom, prix, position ou premier tarif;
- `shippingCents` vient de `matchedRate.rate`; `shippingName` vient de `matchedRate.name`;
- `orders.shipping_cents` / `shipping_cost` / `total_cents` / `total` et Stripe `shipping_rate_data` utilisent ces valeurs serveur;
- metadata `shipping_rate` = `{ id, name, shipping_cents }`.

**Validation production :**

La route `/api/shipping/rates` a retourné, pour la variante de test, le tarif `STANDARD` à `10.95 CAD`. Un checkout contrôlé a ensuite envoyé un prix article `0.01`, un shipping `0.01` et un nom `LIVRAISON FALSIFIEE`, avec l’id `STANDARD` valide. Session Stripe créée, non payée.

Commande de test 98, status `pending` :

- `subtotal_cents = 2999`;
- `shipping_cents = 1095`;
- `total_cents = 4094`;
- `shipping_cost = 10.95`;
- `total = 40.94`;
- item : `price_at_purchase = 29.99`, `unit_price_cents = 2999`.

Le faux prix article et le faux shipping ont été ignorés. Le serveur a repris `29.99` (DB) et `10.95` (Printful). Total autoritaire : `40.94`.

### Limites de validation

- les commandes 97 et 98 sont des commandes de test `pending`; aucun paiement n’a été complété;
- l’étape B n’a pas été exercée par un paiement réel sans `order_items`;
- les sessions Stripe de test n’ont pas été encaissées.

### Statut final P1

Le constat « prix et total contrôlés par le navigateur » est corrigé :

- prix articles autoritaires DB;
- livraison autoritaire via revalidation Printful serveur;
- Stripe et snapshots monétaires construits à partir de valeurs serveur.

Les autres constats du rapport d’audit figé restent hors de ce chantier.

---

## 15 août 2026 — Chantier P3 : protections du checkout public (FERMÉ)

Le checkout public reste volontairement ouvert (invité autorisé). P3 borne l’abus, durcit l’initialisation, retire les IDs client non fiables, valide les entrées, ferme les pending expirées et rend la création de commande idempotente. P1 (prix / shipping autoritaires) n’a pas été rouvert. P4 (idempotence générale `stripe_events`) n’est pas ce chantier.

Le rapport `TECHNICAL_SECURITY_AUDIT.md` n’a pas été modifié.

### P3-A — Limites d’abus

**Commit :** `72a87c4` — `fix(checkout): limit checkout abuse`

- `checkoutLimiter` : 10 requêtes / 60 s / IP → 429 `CHECKOUT_RATE_LIMITED`
- max 20 lignes panier → 400 `CART_TOO_LARGE`
- max quantité 20 par ligne → 400 `QUANTITY_LIMIT_EXCEEDED`

**Validation production :** limites et codes observés. Fermé.

### P3-B — Initialisation atomique

**Commit :** `66255fd` — `fix(checkout): make order initialization atomic`

Transaction MySQL dédiée : `orders` + `order_items` + `order_status_history` (`init` → `pending`). Rollback complet si échec avant commit. Stripe hors transaction.

**Validation production :** commande de test créée atomiquement. Fermé.

### P3-C — IDs relationnels client non fiables

**Commit :** `7af49f0` — `fix(checkout): remove untrusted relational ids`

`cartId`, `shipping_address_id` et `billing_address_id` ne sont plus lus par le checkout. Les nouvelles sessions Stripe n’envoient plus `metadata.cart_id`. Le webhook conserve une compatibilité historique si un ancien `cart_id` est présent.

**Validation production :** commande de test sans IDs relationnels client. Fermé.

### P3-D — Validation email et shipping

**Commit :** `f4b70f3` — `fix(checkout): validate customer and shipping input`

Validations backend avant Printful : email (trim, lowercase, longueur, format), champs shipping requis et bornés, pays `CA`/`US`, state/province exactement 2 caractères. Frontend aligné.

**Validation production :** `INVALID_EMAIL`, `INVALID_SHIPPING_COUNTRY`, `INVALID_SHIPPING_STATE`, `SHIPPING_FIELD_TOO_LONG` → 400 ; checkout valide → commande #101, session Stripe créée, `paid` false. Fermé.

### P3-E2 — Expiration Stripe → cancelled

**Commit :** `562f20e` — `fix(checkout): cancel expired pending orders`

Branche webhook `checkout.session.expired` uniquement. Résolution **stricte** : `orders.stripe_session_id = session.id`. Aucun fallback email / `client_reference_id` / `metadata.order_id`. Transition `pending` → `cancelled` seulement (`cancelled_at`, `updated_at`, history). Une commande déjà non-pending n’est pas réécrite. Erreur DB réelle : `releaseEventIdempotence` + HTTP 500 pour retry Stripe.

Endpoint applicatif : `POST /webhook/stripe`. Aucun secret de signature n’est documenté ici.

**Validation production :** commande #102, session expirée unpaid, webhook HTTP 200 `{"received":true,"orderId":102}`, status `cancelled`, history `init` → `pending` puis `pending` → `cancelled`. Fermé.

### P3-E1 — Idempotence de création

**Migration :** `960bf90` — `chore(db): add checkout idempotency table`
**Code :** `36fd232` — `fix(checkout): make checkout creation idempotent`

Table dédiée `checkout_idempotency` (`CREATE TABLE IF NOT EXISTS`, pas d’ALTER `orders`) : PK `idempotency_key`, `order_id`, `created_at`, index `order_id`, **aucune FK** (Hostinger).

Frontend : UUID v4 (`crypto.randomUUID()`) par tentative logique, `useRef` local, généré seulement après validation + confirmation. Signature `JSON.stringify(checkoutPayload)` locale uniquement (jamais envoyée, jamais en DB, pas une autorité métier). Même payload → même clé ; payload modifié → nouvelle clé ; `CHECKOUT_NO_LONGER_OPEN` reset ; erreurs temporaires / `CHECKOUT_IN_PROGRESS` conservent la clé.

Backend : `idempotency_key` obligatoire, UUID v4 lowercase. Fast path avant `pickCart` / Printful / TX. TX : `orders` → `checkout_idempotency` → `order_items` → history → commit. Duplicate 1062 → rollback. Stripe `{ idempotencyKey }` = même UUID, hors TX. La PK MySQL est la garantie de concurrence ; le SELECT initial ne l’est pas.

**Validation production (sans paiement) :**

- clé `ab833f65-d29f-4b1d-a1a6-4d828b892366`
- deux POST identiques → même session `cs_test_a1zOEoGWkcM0SW06s4AjnzxGyLq40gWs8v3Ckqwyuunshs6yBfls5mtzBP`, `reused: true`
- order **#103**, `pending`, 1 row clé, 1 order avec session

Fermé.

### Statut final P3

Le chantier P3 est **FERMÉ / COMPLET** et validé en production. Au moment de cette clôture, P4 (idempotence générale des events Stripe) et le runner `scripts/run-migrations.js` (non fiable : importe `{ pool }` alors que `server/db.js` exporte `getPool()`) restaient hors de ce chantier.

P4 a depuis été traité et fermé dans la section suivante. Le runner a depuis été corrigé dans P20-B ; cette correction ne faisait pas partie de P3.

---

## 15 août 2026 — Chantier P4 : webhook Stripe et idempotence des événements (FERMÉ)

Objectif : ingestion Stripe fail-closed, replay métier sûr, résolution d’order sans email, `payment_status` pour `completed`, et noyau `pending → paid` atomique. Aucune migration. Printful / fulfillment restent hors P4 (P19). Le rapport `TECHNICAL_SECURITY_AUDIT.md` n’a pas été modifié.

### P4-A — Fail-closed sur l’assert d’idempotence

**Commit :** `57ebe19` — `fix(webhook): fail closed on idempotency errors`

`INSERT IGNORE` réserve `event_id`. Si cet INSERT échoue : aucun métier, HTTP 500 `WEBHOOK_IDEMPOTENCE_UNAVAILABLE`.

### P4-B — Plus de DDL runtime

**Commit :** `5a16e26` — `fix(webhook): remove runtime stripe events ddl`

Plus de `CREATE TABLE IF NOT EXISTS` ni `ALTER TABLE … order_id` dans le webhook. `stripe_events` est un prérequis déjà provisionné.

### P4-C — Duplicate ≠ métier terminé

**Commit :** `7b90801` — `fix(webhook): replay duplicate business events`

`affectedRows === 0` = `event_id` déjà vu. Les events métier (`expired`, `completed`, `async_payment_succeeded`) rejouent ; les invariants de statut / TX empêchent une seconde transition. Les events non métier restent 200 `duplicate`. Permet un retry Stripe après crash post-réservation.

### P4-D — Résolution d’order durcie

**Commit :** `444fb98` — `fix(webhook): harden order resolution`

Autorité : `orders.stripe_session_id = session.id`. Sinon `client_reference_id` / `metadata.order_id` (entiers positifs sûrs, identiques si les deux, et `stripe_session_id` égal à la session ou NULL). Une order liée à une autre session est refusée. Plus de fallback email. Erreur DB → 500 `WEBHOOK_ORDER_RESOLUTION_FAILED`. Aucun match sûr → 200 `order_not_found_no_fallback`. `customer_email` n’est plus une autorité de résolution.

### P4-E — `payment_status` sur completed

**Commit :** `59ca9df` — `fix(webhook): require paid checkout status`

`checkout.session.completed` n’entre dans le chemin paid que si `session.payment_status === 'paid'`. Sinon (unpaid, `no_payment_required`, absent, autre) : journal, `upsertStripeEvent`, 200 `payment_not_yet_paid`, aucune mutation. `async_payment_succeeded` conserve le chemin paid. `no_payment_required` n’est pas assimilé à paid.

### P4-F — Noyau paid atomique

**Commit :** `8f8e2ce` — `fix(webhook): make paid transition atomic`

Connexion dédiée, TX courte : `FOR UPDATE` → recheck items → `UPDATE` `pending` → `paid` (totaux, `paid_at`, email COALESCE, `stripe_payment_intent_id` COALESCE) + history `pending` → `paid` → COMMIT. `WHERE id = ? AND status = 'pending'`. `cancelled` ne redevient pas paid. Échec avant COMMIT → rollback, 500 `WEBHOOK_PAYMENT_TX_FAILED`, `event_id` conservé (P4-C rejoue). Hors TX après COMMIT : reconcile, cart historique, abandoned, Printful, upsert.

### Validation production test (15 août 2026)

Après déploiement P4-F : `GET /readiness` → `ok: true`.

Tentative test :
- clé d’idempotence `9f0c25d1-ff28-414d-b14b-fc87215ee0af`
- session `cs_test_a1cVC4xj4kEju61mB64MqCZgBL8olHtyI9N3s5EDnzt7M2tkzboKVwmMKg`
- order **#104**
- paiement Stripe **mode test uniquement**

Après `checkout.session.completed`, order #104 :
- `status = paid`
- `total = 40.94` CAD
- `shipping_cost = 10.95`
- `stripe_payment_intent_id = pi_3U4bodFA34RmQBx30MLJAzhA`
- `item_count = 1`
- `paid_history_count = 1`
- `paid_at = 2026-08-15 07:15:41` UTC

Historique observé : `init` → `pending`, puis `pending` → `paid`.

Événement : `evt_1U4bofFA34RmQBx3EMGd5ZOM`, type `checkout.session.completed`.

L’événement exact a ensuite été renvoyé manuellement depuis Stripe (mode test). Réponse webhook : HTTP 200 `{"received":true,"orderId":104}`.

Vérification DB après le rejeu :
- order #104 toujours `paid`
- `paid_at` toujours exactement `2026-08-15 07:15:41`
- `stripe_payment_intent_id` inchangé
- `paid_history_count = 1`
- `event_row_count` pour `evt_1U4bofFA34RmQBx3EMGd5ZOM` = 1

Conclusion : le duplicate métier a été rejoué sans nouvelle transition ; aucune deuxième history `pending` → `paid` ; aucune réécriture de `paid_at` ; aucune deuxième row `stripe_events`. P4-C + P4-F sont validés ensemble sur un rejeu réel Stripe test.

### Statut final P4

Le chantier P4 est **FERMÉ / COMPLET**. Hors scope volontaire : Printful (P19), rétention/PII `payload` (P13), correction du runner `npm run migrate`.

---

## 15 août 2026 — Chantier P5 : reconstruction fallback des order_items (FERMÉ)

Objectif : cesser de reconstruire automatiquement les `order_items` après paiement. Le constat d’audit initial (quantités / identifiants / prix metadata / transaction fallback / reconstruction depuis `session.metadata.cart_items`) reste figé dans `TECHNICAL_SECURITY_AUDIT.md`.

**Préalable déjà en place.** P1-B (`82efc25` — `fix(checkout): harden webhook item fallback`) avait durci le helper : format metadata serveur uniquement, entiers positifs sûrs, PK / `variant_id` / Printful ID corroborés, all-or-nothing, subtotal exact vs `orders.subtotal_cents`, overflow protégé, connexion dédiée et vraie transaction. P3-B / P3-E1 ont ensuite créé atomiquement `orders` + `checkout_idempotency` + tous les `order_items` + history `init` → `pending` **avant** Stripe. Une order existante sans items est désormais un état anormal / legacy / corruption, pas un mode dégradé à combler.

### P5-A — Désactivation du fallback actif

**Commit :** `969c8f6` — `fix(webhook): disable order item metadata fallback`
**Fichier :** `server/controllers/webhookController.js`

Avant le noyau paid : `orderHasItems(db, orderId)`.

- Erreur DB → HTTP 500 `{ received: false, orderId, error: 'WEBHOOK_ORDER_ITEMS_CHECK_FAILED' }` : fail-closed, aucun paid, aucun fallback, aucun INSERT items, aucun side effect.
- Zéro item → HTTP 500 `{ received: false, orderId, error: 'WEBHOOK_ORDER_ITEMS_MISSING' }` : aucune reconstruction depuis `session.metadata.cart_items`, aucun INSERT, aucun paid, aucun Printful, aucun side effect.

Dans les deux cas : `event_id` n’est **pas** supprimé ; P4-C permet le replay du même business event (une réparation contrôlée des données pourrait alors laisser un retry continuer ; le webhook ne fabrique aucune ligne manquante). Le recheck P4-F (`SELECT id FROM order_items … LIMIT 1` sous `FOR UPDATE`) reste en plus du check P5. Une commande sans `order_item` ne peut pas devenir `paid`. `usedFallbackItems` reste `const false` : Printful automatique n’est pas activé.

### P5-B — Suppression du code mort

**Commit :** `28ce844` — `refactor(webhook): remove dead order item fallback`

Suppression de `insertOrderItemsFromMetadata`, `parseNonNegativeSafeInteger` et `canAddCents`. Aucun `INSERT INTO order_items` ne reste dans `webhookController.js`. `normalizeMetaCartItem` est conservé (bloc Printful historique). `parsePositiveSafeInteger` est conservé (validations actives, dont la résolution d’order).

### Printful / P19

P5 n’active pas Printful. Le bloc historique `usedFallbackItems && PRINTFUL_AUTOMATIC_ORDER === 'true'` reste inatteignable via le chemin P5. Le parsing `metadata.cart_items` / `normalizeMetaCartItem` peut encore subsister pour ce code. **P19 reste un chantier séparé** ; P5 ne le ferme pas.

### Validations

Statiques avant commits (P5-A et P5-B) : `git diff --check` réussi ; `node --check server/controllers/webhookController.js` réussi. P5-A : helper plus appelé ; `usedFallbackItems = false` ; erreurs `WEBHOOK_ORDER_ITEMS_CHECK_FAILED` / `WEBHOOK_ORDER_ITEMS_MISSING` ; pas de `releaseEventIdempotence` sur ces chemins ; recheck P4-F intact. P5-B : plus d’occurrence de `insertOrderItemsFromMetadata`, `parseNonNegativeSafeInteger`, `canAddCents`, `INSERT INTO order_items` ; `normalizeMetaCartItem` présent ; `usedFallbackItems` toujours false.

Après chaque push P5 : `GET /readiness` → `ok: true`. Après P5-B : `GET https://flippinmaple.com/readiness` → `{ "ok": true }`.

Aucune commande de production n’a été volontairement corrompue (sans `order_items`) pour déclencher le HTTP 500. Le chemin no-items est validé **statiquement** par le code ; le déploiement nominal par readiness. Aucune migration, aucun changement de schéma, aucune donnée production modifiée pour tester P5.

### Statut final P5

P5 est **FERMÉ / COMPLET**. Hors scope volontaire : Printful automatique (P19).

---

## 15 août 2026 — Correction production des URLs de retour Stripe

Découverte pendant les validations Stripe P4/P5 : les URLs de retour des sessions Checkout en production pointaient vers localhost.

**Ancienne valeur Hostinger :** `FRONTEND_URL=http://localhost:3000,http://localhost:5173`

`sanitizeBaseUrl(req)` lit `process.env.FRONTEND_URL` en priorité. Si la valeur contient une virgule, la première entrée est utilisée → `http://localhost:3000`. `createCheckoutSession` construit alors :

- `success_url = ${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
- `cancel_url = ${FRONTEND_URL}/checkout/cancel`

**Correction manuelle Hostinger (aucune autre variable, aucun changement de code) :** `FRONTEND_URL=https://flippinmaple.com`

Après sauvegarde / redémarrage : `GET https://flippinmaple.com/readiness` → `{ "ok": true }`.

Une nouvelle session Stripe **test** a été créée depuis le checkout production. **Aucun paiement** n’a été effectué. Depuis la page Stripe, le bouton de retour a mené à `https://flippinmaple.com/checkout/cancel` : le `cancel_url` production est confirmé empiriquement.

Le `success_url` n’a **pas** été revalidé empiriquement par un nouveau paiement. Dans le code, `success_url` et `cancel_url` partagent le même `FRONTEND_URL` ; la configuration qui produisait les deux URLs localhost a donc été corrigée, sans preuve empirique du redirect success.

Aucun secret n’est impliqué. Ce n’est pas un chantier P-number.

---

## 15 août 2026 — Chantier P6 : gestionnaire global d’erreurs (FERMÉ)

Le constat d’audit initial (signature Express à trois arguments, stack en `NODE_ENV=development`, `/readiness` exposant un détail MySQL, 5xx globaux susceptibles d’exposer `err.message`) reste figé dans `TECHNICAL_SECURITY_AUDIT.md`.

**Déjà corrigé avant P6-A.** Signature `errorHandler(err, req, res, _next)`. Hostinger : `NODE_ENV=production` (pas de stack dans les réponses production). `/readiness` en erreur : `{ ok: false, error: 'service_unavailable' }`, sans `e.message` public.

### P6-A — Masquage des 5xx production

**Commit :** `44b8957` — `fix(server): hide production 5xx details`
**Fichier :** `server/middlewares/errorHandler.js`

Le handler distingue `internalMessage = err?.message || 'Erreur interne'` et un message public : si production et `status >= 500` → `Erreur interne` ; sinon le message métier original.

- Production + 5xx : `{ error: 'Erreur interne' }` — aucun `err.message` public, aucune stack.
- Production + 4xx : message métier conservé.
- Développement : message original + stack comme auparavant.
- Logging : `logError` utilise `internalMessage`, pas le message public générique.

`notFound` inchangé. Aucune modification de route, contrôleur, DB, ordre des middlewares, ni migration.

### Validations

Statiques avant commit : `git diff --check` réussi ; `node --check server/middlewares/errorHandler.js` réussi. Inspection : signature 4 arguments ; `internalMessage` / `publicMessage` ; masquage si `status >= 500` ; stack seulement hors production ; `logError` sur `internalMessage`.

Après push `44b8957` : `GET https://flippinmaple.com/readiness` → `{ "ok": true }`.

Test CORS non destructif : `Origin: https://not-allowed.invalid` sur `GET https://flippinmaple.com/api/products` → HTTP 500, body exact `{"error":"Erreur interne"}`. Aucun message `Not allowed by CORS`, aucune stack, aucun détail d’exception. Aucun checkout, aucune session Stripe, aucune donnée DB créée ou modifiée. Les 4xx métier sont validés **statiquement** par la condition du handler ; aucun test 4xx spécifique P6 n’a été effectué dans cette étape.

### Statut final P6

P6 est **FERMÉ / COMPLET**.

---

## 16 août 2026 — Chantier P7 : authentification, sessions et JWT (FERMÉ)

Objectif : cookies httpOnly comme seule mécanique d’authentification, JWT HS256, registre `refresh_tokens`, révocation au logout, rotation one-time atomique, et refus des refresh legacy sans `jti`. Le constat d’audit initial (JWT dans le JSON, rate limit auth, revalidation compte, algorithme, identité checkout, registre / révocation / rotation) reste figé dans `TECHNICAL_SECURITY_AUDIT.md`.

P7 est **FERMÉ / COMPLET / VALIDÉ EN PRODUCTION**.

### P7-A — JWT hors des réponses JSON

**Commit :** `0ffaced3fddbd84b59cfd54c19bccc9d0b0eaf69` — `fix(auth): keep jwt tokens out of json responses`

Login et refresh ne retournent plus de JWT dans le JSON. Les cookies `access` et `refresh` httpOnly restent la mécanique d’authentification. Frontend confirmé compatible.

**Validation production :** `LOGIN_FIELDS` = `ok, user` ; cookies après login = `access, refresh` ; `REFRESH_FIELDS` = `ok` ; `WHOAMI_OK` = True.

### P7-B — Rate limit auth publique

**Commit :** `42b3555af017c56c2a03f174e0e6ce83328bf804` — `fix(auth): rate limit public auth endpoints`

- login : 10 requêtes / 15 minutes / IP
- register : 5 requêtes / 60 minutes / IP
- refresh : 60 requêtes / 60 secondes / IP

Headers de limitation validés en production. Limite connue : store **en mémoire**, donc non distribué entre instances et réinitialisé au restart. Ce n’est **pas** une faille bloquante P7.

### P7-C — Revalidation du compte au refresh

**Commit :** `4c79e016721e17aa744d0868ba815ae87af9829b` — `fix(auth): revalidate account on refresh`

Le refresh relit systématiquement `customers`. Email/role du JWT refresh ne sont plus une source de vérité. Compte absent → 401. Nouvel access signé depuis la DB.

**Validation production :** login → refresh → whoami réussis.

### P7-D — Algorithme JWT explicite

**Commit :** `bc920673057de634dc0c2a1e8d864aa58f12171f` — `fix(auth): restrict jwt algorithm to hs256`

Sign et verify access/refresh imposent HS256 (`algorithm` / `algorithms: ['HS256']`) sur `authController`, `checkoutController`, `verifyToken` et `requireRole`. Aucun fallback algorithmique implicite sur les chemins actifs.

### P7-E — Revalidation identité checkout

**Commit :** `6afcab66aba0d4dbcae3126cac942fc8dce98dc5` — `fix(auth): revalidate checkout identity`

Le JWT fournit seulement un `candidateUserId`. Le customer est relu en DB. Compte absent → checkout invité. Email/role JWT ne deviennent pas source de vérité. Le checkout n’accepte jamais un `userId` fourni par le frontend.

**Validation production :** refresh-only + panier vide → HTTP 400 ; cookie access réémis ; aucune commande ni paiement créé.

### P7-F0 — Schéma production `refresh_tokens` confirmé

La table production existait déjà (InnoDB) : `id` PK auto_increment, `user_id`, `refresh_token` varchar(255), `created_at`, `expires_at` nullable, index sur le token et sur `user_id`. Aucune vraie foreign key malgré un nom d’index historique. Un SHA-256 hex (64 caractères) rentre dans varchar(255). **Aucune migration** n’a été nécessaire.

### P7-F1 — Persistance des refresh émis

**Commit :** `341ce6de10ac9908eff6ca900fe5816bd3106ac1` — `fix(auth): persist issued refresh tokens`

Tout refresh nouvellement émis possède `jti: randomUUID()`. Le JWT brut n’est jamais stocké : SHA-256 hex uniquement. L’expiration DB est dérivée du `exp` du JWT signé. Login/register persistent le refresh **avant** de poser les cookies.

**Validation production :** longueur hash = 64 ; format SHA-256 hex ; durée observée = 30 jours. Aucune valeur de token n’est documentée.

### P7-F2 — Registre obligatoire pour refresh géré

**Commit :** `34a46d161bfc5c14d2708704ecebb6b5683d705e` — `fix(auth): enforce refresh token registry`

Un refresh possédant un `jti` exige une ligne registre active (`user_id` + SHA-256 + `expires_at > NOW()`). Absent/expiré → 401 côté auth ; checkout managed absent/expiré → checkout invité. Erreurs DB → fail-closed.

**Validation production :** token actif accepté ; `expires_at` temporairement dans le passé → 401 ; expiry restaurée → accepté. Aucune valeur secrète documentée.

### P7-F3 — Révocation au logout

**Commit :** `45e292befe3665671519a207437bcd90674d5c92` — `fix(auth): revoke refresh token on logout`

Logout : SHA-256 du cookie refresh, `DELETE` exact du hash. `affectedRows = 0` = succès idempotent. Cookies effacés après succès DB. Pas de révocation globale de tous les tokens d’un utilisateur.

**Validation production :** `LOGOUT_OK` = True ; cookies après logout vides ; replay exact du refresh révoqué → HTTP 401.

### P7-F4A — Rotation atomique `/auth/refresh-token`

**Commit :** `cd8bcf0c6d0ea2065c6962495c447c722840d5aa` — `fix(auth): rotate managed refresh tokens`

Connexion dédiée, transaction, `SELECT … FOR UPDATE`, customer relu dans la TX, nouvel access, nouveau refresh avec nouveau `jti`, nouveau SHA-256, `UPDATE` de **la même ligne** (ancien hash dans le `WHERE`), `affectedRows === 1`, COMMIT, cookies seulement après commit.

**Validation production :** login / rotation / refresh changé / replay ancien → 401 / nouveau refresh OK.

**Validation DB après rotations :** `total_rows = 5`, `expired_rows = 4`, `active_rows = 1`, `latest_id = 7`, `active_token_length = 64`. Rotation par UPDATE ; aucune nouvelle ligne à chaque refresh.

### P7-F4B — Rotation atomique checkout

**Commit :** `e89ff0e279314988916929b6ada95c02721ce5e5` — `fix(auth): rotate checkout refresh tokens`

Même rotation one-time sur le chemin checkout refresh-only. Managed absent / rejoué / révoqué → identité refusée, checkout **invité**. Erreur DB réelle → **pas** convertie silencieusement en invité.

**Validation production non destructive :** HTTP 400 (panier vide prévu) ; refresh changé ; access émis ; replay ancien → 401 ; nouveau refresh OK. Aucune commande ni session Stripe créée.

P7-F4 est fermé après cette validation. Même constat DB final F4 que F4A.

### P7-F5 — Retrait des refresh legacy sans `jti`

**Commit :** `235e7a7fec065b647ecb1cb604f15635044000b1` — `fix(auth): reject legacy refresh tokens`

Tous les émetteurs refresh runtime actifs utilisent `jti`. `/auth/refresh-token` : JWT valide sans `jti` → 401 **avant** `getPool()` (aucune DB, aucun access, aucune adoption, aucune rotation). Checkout : JWT valide sans `jti` → invité (aucun access, aucune adoption, aucune rotation). Les chemins access-only depuis un refresh legacy ont été retirés.

**Validation production (chemins managed) :** `AUTH_MANAGED_OK` / `AUTH_REFRESH_CHANGED` / checkout HTTP 400 / refresh checkout changé / access checkout émis. Aucun JWT legacy artificiel n’a été fabriqué avec un secret production. Le rejet legacy est confirmé statiquement ; les chemins managed ont été revalidés en production.

### P7-F6 — Alignement cookie access / JWT access

**Commit :** `41a1fc4ef597520682c336685d3de848bd8e285f` — `fix(auth): align access cookie lifetime`

`cookieOptsAccess.maxAge` : 1 heure → **15 minutes** dans `authController.js` et `checkoutController.js`. JWT access inchangé : `JWT_ACCESS_TTL || '15m'`. Cookie refresh inchangé : 30 jours.

Ce n’était pas un bypass d’autorisation : le JWT expirait déjà à 15 minutes. Le correctif évite d’envoyer un cookie access déjà mort pendant ~45 minutes.

**Validation production :** login OK ; `LOGIN_ACCESS_EXPIRES_MIN = 15` ; `LOGIN_REFRESH_EXPIRES_DAYS = 30` ; checkout HTTP 400 ; `CHECKOUT_ACCESS_EXPIRES_MIN = 15` ; `CHECKOUT_REFRESH_EXPIRES_DAYS = 30`. Les deux émetteurs runtime de cookie access sont à 15 minutes.

### État final P7

- JWT access et refresh hors JSON ;
- cookies httpOnly, `Secure` en production, `SameSite=Lax` ;
- access et refresh signés/vérifiés HS256 ;
- access JWT et cookie access : 15 min par défaut ;
- refresh cookie : 30 jours ;
- `jti` obligatoire sur tout refresh actif ;
- SHA-256 uniquement en DB (aucun JWT brut dans `refresh_tokens`) ;
- registre obligatoire ; relecture `customers` au refresh et au checkout ;
- révocation exacte au logout ;
- rotation one-time atomique auth et checkout ;
- replay d’un ancien refresh refusé ; legacy sans `jti` refusé.

### Résidus acceptés / reportés

P7 n’épuise pas tout le durcissement auth. Résidus connus :

1. **`issuer` / `audience`** — absents. **Reporté** à un hardening post-P7. Les ajouter immédiatement au `verify` invaliderait les refresh déjà émis. Une grace period serait nécessaire. Non bloquant pour clôturer P7.
2. **`verifyToken` / whoami sans relecture DB** — email/role UI peuvent être stale jusqu’à ~15 min. Compensé : admin API (`requireRole`) relit `customers` ; checkout et refresh aussi. Risque faible/borné **accepté**. Ce n’est pas une faille admin active.
3. **Wishlist** — identité JWT pendant le TTL access ; l’IDOR client connu est bloqué. Un compte supprimé pourrait conserver cet access ~15 min. **Accepté**, faible, non bloquant.
4. **Register account enumeration** — historiquement : 409 `Un compte existe déjà avec ce courriel.` **Reporté à P8** lors de la clôture P7. **Traité sous P8-C** (commit `5f405dfc7c93c4d99774ad933d96c3f1c4bb2c41`) : l’exposition explicite par statut HTTP, corps de réponse et cookies a été réduite. Une énumération théorique par timing n’est pas prétendue éliminée. P7 reste historiquement fermé. Login conserve déjà une erreur générique.
5. **`authService.js` / `authModel.js`** — code historique **non branché** au runtime. Hors P7. Hygiène possible plus tard.
6. **Lignes `refresh_tokens` expirées** — peuvent rester. Le registre actif exige `expires_at > NOW()`. Purge / family revoke : hardening ultérieur, non bloquant.

### Statut final P7

P7 est **FERMÉ / COMPLET**. Le constat historique d’audit P7 a été traité par les correctifs et validations ci-dessus. Au moment de cette clôture, la prochaine priorité d’audit était **P8** (inscription / consentement marketing / privacy). P8 a depuis été traité et fermé dans la section suivante.

---

## 16 août 2026 — Chantier P8 : inscription, consentement marketing et privacy technique (FERMÉ)

Objectif : séparer l’opt-in marketing de toute sémantique « Loi 25 », persister une preuve serveur lorsque l’opt-in est vrai, réduire l’énumération explicite de comptes au register, retirer la session du register, durcir la validation serveur, et supprimer l’acceptation CGU fantôme. Le constat d’audit initial (mélange `consentLoi25` / `is_subscribed`, `acceptedCGU` non persisté, routes `/cgu` et `/politique-confidentialite` absentes, énumération 409) reste figé dans `TECHNICAL_SECURITY_AUDIT.md`.

P8 est **FERMÉ / COMPLET / VALIDÉ EN PRODUCTION** au sens d’une **remédiation technique**. Ce n’est **pas** une certification de conformité légale. Aucune page publique de CGU, de politique de confidentialité ou de conditions de vente n’a été publiée ni validée juridiquement dans ce chantier.

### P8-A — Séparation du consentement marketing

**Commit :** `7b491ef5bdff39ad69f4db782639970b368e07a0` — `fix(register): separate marketing consent`

- le mélange entre `consentLoi25` et l’abonnement marketing a été retiré ;
- le frontend envoie `marketingConsent` ;
- checkbox marketing **facultative**, **non précochée** ;
- texte : « Je souhaite recevoir par courriel des nouvelles, nouveautés et offres de Flippin’ Maple. » ;
- le backend exige un boolean strict lorsque le champ est fourni ;
- `true` → `is_subscribed = 1` ;
- `false` / absent → `is_subscribed = 0` ;
- une chaîne comme `"false"` est rejetée HTTP 400 ;
- `consentLoi25` et `raw.is_subscribed` n’ont pas été réintroduits.

**Validation production :** boolean `false` accepté jusqu’au traitement normal ; boolean `true` accepté jusqu’au traitement normal ; string `"false"` rejetée HTTP 400 ; `/readiness` vert.

### Correctif de rôle découvert durant P8

**Commit :** `2292c45a7e4da37d652ceb8a440f33ae13cd8078` — `fix(register): use valid customer role`

Schéma production confirmé : `role` `enum('user','admin')` DEFAULT `user`. Le register utilisait incorrectement `customer`. Corrigé vers `user`. Aucun changement de schéma.

### P8-B — Preuve de consentement marketing

**Commit :** `8f5c1f38391de1154c36dce60d8739862fda1d54` — `fix(register): persist marketing consent proof`

Transaction dédiée : création du customer + preuve marketing. Si opt-in `true`, insertion dans `consents`. Aucune preuve créée si `false` / absent.

Champs de preuve **contrôlés par le serveur** (non fournis par le client) :

- `customer_id` = `userId`
- `subject_type` = `user`
- `subject_id` = `userId`
- `email` = email normalisé
- `purpose` = `marketing_email`
- `basis` = `express`
- `method` = `checkbox`
- `text_snapshot` = texte serveur
- `locale` = `fr-CA`
- `source` = `register`
- `ip` = `req.ip`
- `user_agent` = User-Agent
- `granted_at` = `UTC_TIMESTAMP()`

Rollback transactionnel si une écriture échoue. Aucune migration : le schéma `consents` existant était compatible pour `marketing_email`.

**Validation production contrôlée :** compte test créé avec opt-in `true`.

Résultat DB confirmé :

- `is_subscribed = 1` ;
- `role = user` ;
- consent lié au même customer ;
- `subject_type = user` ;
- `subject_id` cohérent ;
- `purpose = marketing_email` ;
- `basis = express` ;
- `method = checkbox` ;
- `locale = fr-CA` ;
- `source = register` ;
- IP enregistrée ;
- User-Agent enregistré ;
- `revoked_at` NULL ;
- refresh actif **lors de cette validation P8-B** (avant P8-C, qui a ensuite retiré la session du register).

Le compte test et ses données ont ensuite été complètement supprimés.

### P8-C — Account enumeration / flux register

**Commit :** `5f405dfc7c93c4d99774ad933d96c3f1c4bb2c41` — `fix(register): reduce account enumeration`

- plus de SELECT préalable vérifiant l’existence d’un email ;
- unicité confiée à l’index DB confirmé `uniq_customers_email` UNIQUE(`email`) ;
- bcrypt demeure avant l’INSERT pour les payloads valides ;
- duplicate MySQL : `ER_DUP_ENTRY` / errno 1062 ;
- nouveau compte et duplicate retournent exactement HTTP 200 et `{ ok: true, message: 'Inscription traitée. Vous pouvez maintenant vous connecter.' }` ;
- aucun `id` public ;
- le register ne crée plus de session : aucun access token, aucun refresh token, aucun cookie ;
- le login reste le point de création de session.

**Validation production :** première inscription HTTP 200 ; deuxième inscription avec le même email HTTP 200 ; corps identiques ; aucun cookie `access` ni `refresh` dans les deux cas. DB : exactement 1 customer, `role` `user`, `is_subscribed` 0 pour le test sans marketing, 0 consent parasite, 0 refresh token. Compte test supprimé après validation.

L’énumération explicite par statut / body / cookies a été réduite. Une possibilité théorique d’énumération par timing n’est pas prétendue éliminée.

### P8-D — Validation serveur du register

**Commit :** `c67c2a79037765057ccf9f8f38d3e5aec2c8e494` — `fix(register): enforce server validation`

- plus de coercition arbitraire `.toString()` sur les champs register ;
- types string requis pour les champs identité / auth utilisés ;
- alias historiques conservés uniquement s’ils sont string ;
- prénom obligatoire, max 50 ;
- nom obligatoire, max 50 ;
- email obligatoire, max 100, trim / lowercase, regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` ;
- password string obligatoire, règle `/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/` (8–16 caractères, majuscule, chiffre, caractère spécial) ;
- `passwordConfirm` obligatoire ; mismatch → HTTP 422 ;
- validations exécutées avant `getPool` / bcrypt / transaction pour un payload manifestement invalide ;
- P8-A / P8-B / P8-C préservés.

**Validation production :** `EMAIL_TYPE` → HTTP 400 ; `EMAIL_SYNTAX` → HTTP 400 ; `WEAK_PASSWORD` → HTTP 400 ; `MISSING_CONFIRM` → HTTP 400 ; `VALID` → HTTP 200. Cas valide : aucun cookie access, aucun cookie refresh ; DB : `role` `user`, `is_subscribed` 0, 0 consent, 0 refresh token. Compte test supprimé après validation.

### P8-E1 — Retrait de l’acceptation CGU fantôme

**Commit :** `780454cd3d3b96b451dd893abdab44fac1f28aad` — `fix(register): remove phantom terms acceptance`

Constat préalable confirmé : aucune route `/cgu`, aucune page CGU, aucune page publique de politique de confidentialité ; `/cgu` tombait sur le wildcard React puis redirigeait vers `/` ; `acceptedCGU` était obligatoire uniquement côté frontend, n’était pas envoyé au backend et n’était pas persisté ; aucun texte juridique publiable / validé n’existe dans le dépôt.

Correction dans `src/pages/Register.jsx` uniquement : suppression du state `acceptedCGU`, de sa validation obligatoire, de son reset, de la checkbox et du lien mort `/cgu`. Aucune checkbox, aucun texte légal, aucun lien temporaire, aucune page placeholder ni texte inventé n’a été substitué. Le consentement marketing demeure intact et séparé.

**Validation production du bundle servi :** `CGU_LINK_PRESENT` False ; `CGU_REQUIRED_TEXT_PRESENT` False ; `CGU_LABEL_PRESENT` False ; `MARKETING_TEXT_PRESENT` True. `/readiness` : `ok` true.

### Limites — hors P8

P8 ne signifie pas que la couche privacy / légale est terminée. Restent notamment hors P8 ou reportés :

1. **Pages publiques réelles** — politique de confidentialité ; CGU / conditions ; éventuellement conditions de vente / retours / livraison selon décisions futures.
2. **Contenu de ces pages** — à produire et à faire valider selon le processus approprié ; ne pas inventer depuis la documentation technique.
3. **Cookies / gestion des préférences** — chantier séparé du consentement marketing.
4. **P9** — historiquement : endpoint public de consentement email ; unsubscribe ; webhooks liés aux emails ; cycle de révocation / preuve ; champs de preuve contrôlables par le client. **Reporté à P9** lors de la clôture P8. **Traité sous P9** (section suivante). P8 reste historiquement fermé.
5. **P10** — secret / token unsubscribe selon la nomenclature de l’audit. Hors P8 ; reste la prochaine priorité après P9.
6. **`consents.purpose` production** reste limité à `marketing_email`. Ce n’est pas un registre générique de CGU.
7. Les CGU ne sont actuellement ni demandées ni persistées au register, **intentionnellement**, jusqu’à ce qu’un document réel / versionné existe et qu’une décision technique / produit soit prise.

### Statut final P8

P8 est **FERMÉ / COMPLET**.

Au sens technique :

- séparation marketing / privacy corrigée ;
- opt-in marketing strict ;
- preuve marketing persistée ;
- rôle register corrigé ;
- account enumeration explicite réduite ;
- session supprimée du register ;
- validation serveur renforcée ;
- lien / acceptation CGU fantôme supprimé ;
- production validée ;
- comptes tests nettoyés.

Cela ne constitue **pas** une certification de conformité légale. Les pages légales publiques et leur validation restent un chantier distinct.

La prochaine priorité d’audit au moment de cette clôture était **P9** (consentements email / unsubscribe / webhooks et cycle de révocation). P9 a depuis été traité et fermé dans la section suivante.

---

## 17 août 2026 — Chantier P9 : consentements email, unsubscribe et webhooks (FERMÉ)

Objectif : fermer ou durcir les surfaces publiques de consentement / désabonnement / webhooks email, rétablir la mise à jour de `is_subscribed`, rendre la révocation atomique (y compris `consents.revoked_at`), remplacer le GET mutateur par un parcours de confirmation, et limiter le POST public. Le constat d’audit initial (POST `/api/consents` public, preuves client, webhooks non authentifiés, `markCustomerSubscribed` sans `req`, GET unsubscribe mutateur, `revoked_at` non renseigné, lien frontend inopérant) reste figé dans `TECHNICAL_SECURITY_AUDIT.md`.

P9 est **FERMÉ / VALIDÉ EN PRODUCTION** au sens d’une **remédiation technique** (correctifs ou confinement fail-closed). Ce n’est **pas** une certification de conformité légale (LCAP, Loi 25 ou autre).

### P9-A — Confinement de l’ancien POST public `/api/consents`

**Commit :** `4dc3381973187b297e95f5f2a902f50fecf19a87` — `fix(compliance): disable public consent endpoint`

L’ancien endpoint permettait à un client non authentifié de fournir lui-même des champs de preuve marketing (`customer_id`, `text_snapshot`, `ip`, `user_agent`, etc.) dans la même table `consents` que le register P8. Aucun caller frontend / checkout actif n’a été trouvé. Le register P8 fournit déjà une preuve serveur contrôlée.

Correction : retrait de la route publique `POST /api/consents`. Le handler `recordConsent` est **conservé** dans le contrôleur mais **n’est plus exposé**.

**Validation production :** `POST /api/consents` → HTTP 404.

### P9-B — Confinement des webhooks email non authentifiés

**Commit :** `a8985eea7f8ed3e5dbbb8ff10b2457c270688456` — `fix(compliance): disable unauthenticated email webhooks`

Aucune signature SendGrid / Mailgun / SES n’existait. Un payload public pouvait écrire `email_events` et, pour bounce / complaint / reject, `unsubscribes`.

Correction : retrait de la route publique `POST /api/email-webhooks/:provider`. Le handler `emailWebhook` est **conservé** mais **non exposé**. Décision **fail-closed**. Le handler historique n’est **pas** présenté comme sécurisé. Toute réactivation future exigera une vérification d’authenticité réelle, spécifique au provider choisi, **avant** exposition publique. P9 **ne réactive aucun webhook**.

**Validation production :** `POST /api/email-webhooks/sendgrid` → HTTP 404.

### P9-C — Réparation de `markCustomerSubscribed`

**Commit :** `982921a608a8a31f0fd274163929f32250afc2fb` — `fix(compliance): decouple subscription updates from request`

Les callers unsubscribe appelaient `markCustomerSubscribed(email, true/false)` alors que la fonction exigeait `req.app.locals.db` → TypeError après certaines écritures. Signature corrigée : `markCustomerSubscribed(email, on)` via `getPool()`, sans `req`.

**Validation production :** compte jetable opt-in ; avant : `customers.is_subscribed = 1` ; `POST /api/unsubscribe` → HTTP 200 ; après : `is_subscribed = 0`, ligne `unsubscribes` présente. Cette validation a aussi montré que `consents.revoked_at` restait NULL → P9-D. Compte test ensuite supprimé.

### P9-D — Révocation unsubscribe atomique

**Commit :** `703c29e74b36dafe70e5aa07b95df1d226420551` — `fix(compliance): make unsubscribe revocation atomic`

Fonction interne `revokeMarketingForEmail(email)` : connexion dédiée (`getPool()` / `getConnection()`), `beginTransaction()`, commit, rollback sur erreur, `release()` dans `finally`. Une seule TX :

1. UPSERT `unsubscribes` (`reason = 'user_click'`) ;
2. `UPDATE customers SET is_subscribed = 0 WHERE email = ?` (0 row n’est pas une erreur) ;
3. `UPDATE consents SET revoked_at = UTC_TIMESTAMP() WHERE email = ? AND purpose = 'marketing_email' AND revoked_at IS NULL`.

Pas de JOIN email inter-table (collations production différentes observées).

**Validation production :** avant : `is_subscribed = 1`, consent actif, `revoked_at` NULL. Après POST : HTTP 200 ; `is_subscribed = 0` ; `unsubscribes.reason = user_click` ; `consents.revoked_at` renseigné ; `unsubscribes.created_at` et `revoked_at` au même timestamp. Compte test ensuite supprimé.

### P9-E — Parcours public : confirmation, plus de GET mutateur, plus d’email en clair

**Commit :** `36a8c4284124e3a24b9c3a272c197f70f4a2a437` — `fix(compliance): require unsubscribe confirmation`

Backend : `POST /api/unsubscribe` seule mutation ; succès `{ ok: true }` (plus d’email) ; `GET /api/unsubscribe` retiré ; `unsubscribeLanding` supprimé.

Frontend : route React `/unsubscribe` ; paramètre `e` opaque ; aucun parse client ; aucun appel API au montage ; clic explicite « Me désabonner » ; `POST /api/unsubscribe` `{ token }` ; états confirm / loading / success / error / retry ; ni email ni token affichés.

Email : `abandonedCartJob` générait déjà `${getFrontendUrl()}/unsubscribe?e=TOKEN`. Le lien était inopérant faute de route React. Le producteur n’a **pas** été modifié.

**Validation production :** état initial `is_subscribed = 1`, `revoked_at` NULL, aucune ligne `unsubscribes`. Ouverture de `https://flippinmaple.com/unsubscribe?e=TOKEN` **sans clic** : aucune mutation. Clic « Me désabonner » : message générique ; `is_subscribed = 0` ; `revoked_at` renseigné ; `unsubscribes.reason = user_click`. Compte test ensuite supprimé.

### P9-F — Rate limit du POST public unsubscribe

**Commit :** `ec4626ff440316740bd4ec257b721598c17b7d93` — `fix(compliance): rate limit unsubscribe requests`

`unsubscribeLimiter` (`express-rate-limit`) : `windowMs = 60 * 1000`, `max = 10`, `standardHeaders: true`, `legacyHeaders: false`. Uniquement `POST /api/unsubscribe`. HTTP 429 `{ error: 'Trop de tentatives de désabonnement. Réessaie dans quelques instants.', code: 'UNSUBSCRIBE_RATE_LIMITED' }`.

**Validation production :** 11 POST successifs avec tokens volontairement invalides. Tentatives 1–10 : HTTP 400 `invalid token`. Tentative 11 : HTTP 429, `code = UNSUBSCRIBE_RATE_LIMITED`. Rejet avant la TX : aucune mutation DB.

### Résidus / décisions — hors P9 ou fail-closed

1. `recordConsent` existe encore comme code historique ; sa route publique est désactivée (P9-A).
2. `emailWebhook` existe encore comme code historique ; sa route publique est désactivée (P9-B).
3. Les webhooks email restent **fail-closed** jusqu’à une vérification authentique du provider. Ils ne sont ni sécurisés ni réactivés.
4. P9 ne réactive aucun webhook.
5. **P10** (hors P9) : secret unsubscribe ; fallback secret ; expiration / version du token ; `timingSafeEqual` ; validation stricte d’email ; format / cryptographie du token.
6. Les paniers abandonnés, le job et le cron restent **P11 / P12** selon l’audit. P9 n’a corrigé que le lien / parcours unsubscribe consommé par ce job, pas le chantier abandoned cart.
7. Les pages légales publiques, le gestionnaire de témoins et une validation juridique externe ne sont **pas** fournis par P9.

### Statut final P9

P9 est **FERMÉ / VALIDÉ EN PRODUCTION**.

Au sens technique :

- POST public `/api/consents` retiré ;
- webhooks email publics non authentifiés retirés (fail-closed) ;
- `markCustomerSubscribed` indépendant de `req` ;
- révocation unsubscribe atomique, y compris `consents.revoked_at` ;
- GET API mutateur retiré ; confirmation React ; plus d’email dans les réponses publiques de succès ;
- rate limit du POST unsubscribe ;
- production validée ;
- comptes tests nettoyés.

Cela ne constitue **pas** une certification de conformité légale.

La prochaine priorité d’audit est **P10** (secret unsubscribe / token hardening).

---

## 17 août 2026 — Chantier P10 : secret unsubscribe / token hardening (FERMÉ)

Objectif : retirer le fallback public du HMAC de désabonnement, rendre `UNSUB_HMAC_SECRET` obligatoire, et durcir la validation du token v1 (`v === 1`, email canonique, MAC SHA-256, `timingSafeEqual`) sans changer le protocole public ni le parcours P9-E. Le constat d’audit initial (fallback `'change-me'`, secret Hostinger non vérifié, token signé non chiffré, email décodable, pas d’expiration, version non imposée, comparaison string, validation email/payload faible) reste figé dans `TECHNICAL_SECURITY_AUDIT.md`.

P10 est **FERMÉ / VALIDÉ EN PRODUCTION** au sens d’une **remédiation technique**. Ce n’est **pas** une certification de conformité légale. Aucune valeur de secret n’est documentée ici.

### P10-A — Inspection statique

Inspection uniquement. Aucun fichier modifié, aucun secret généré, aucun runtime.

Constat code alors en vigueur : `UNSUB_HMAC_SECRET || 'change-me'` ; émission v1 `base64url(JSON({ e, v, mac }))` ; HMAC-SHA256 de `` `${e}::v${v}` `` ; digest MAC base64url ; `v = 1` émis mais non imposé au parse ; comparaison string `!==` ; pas de `timingSafeEqual` ; pas d’`iat` / `exp` ; email trim + lowercase à l’émission, pas de regex ; unique producteur `abandonedCartJob.marketingTemplate` ; unique consommateur runtime `unsubscribePost` (P9-E) ; token non persisté en DB.

**Vérification manuelle Hostinger :** `UNSUB_HMAC_SECRET` était **ABSENT** des variables d’environnement de l’application production. Aucune valeur de secret n’a été révélée publiquement, inscrite dans la documentation ni journalisée. Avec le code alors déployé, la production utilisait donc le fallback public `change-me`, sauf mécanisme externe non identifié.

### P10-B1 — Passerelle de rotation du secret

**Commit :** `e8def11c0f0f3db6e195491e3fb41e9be7a7cccd` — `fix(compliance): prepare unsubscribe secret rotation`

**Fichier :** `server/services/unsubscribeToken.js`

Passerelle temporaire : secret primaire `UNSUB_HMAC_SECRET` (s’il est défini et non vide) et secret legacy historique `'change-me'`. Format v1 inchangé. `makeUnsubToken` émet avec le primaire s’il existe, sinon le legacy. `parseUnsubToken` vérifie d’abord le secret effectif ; si un vrai primaire est configuré et que le MAC primaire échoue, essai temporaire du legacy. Fail-closed **non** activé à cette étape. `timingSafeEqual` **non** ajouté.

**Validation production avant rotation :** token legacy `change-me` → HTTP 200. Un secret cryptographiquement aléatoire a ensuite été généré hors logs et ajouté manuellement dans Hostinger. Aucune valeur n’a été affichée dans le journal ni dans la conversation. `/readiness` après configuration : `ok` true.

**Validation production après rotation (passerelle encore en place) :** token legacy `change-me` → HTTP 200 ; token signé avec le secret primaire réel → HTTP 200 `{ "ok": true }`. Lignes DB de test nettoyées.

P10-B1 n’était **pas** une correction finale : tant que `change-me` restait accepté, un tiers connaissant ce littéral public pouvait encore forger un token.

### P10-B2 — Secret obligatoire / retrait du fallback legacy

**Commit :** `b70b0dad3344e5edacf9c7d34686927d3f1c31c3` — `fix(compliance): require unsubscribe hmac secret`

**Fichier :** `server/services/unsubscribeToken.js`

`UNSUB_HMAC_SECRET` obligatoire. Fail-closed au chargement du module si la variable est absente ou vide (`throw new Error('UNSUB_HMAC_SECRET is required')` — le message ne contient aucune valeur). Suppression complète de `LEGACY_HMAC_SECRET` et du littéral `change-me`. Émission et validation uniquement avec le secret primaire. Format v1 / chaîne HMAC inchangés. `timingSafeEqual` encore reporté à P10-C.

Décision volontaire : les anciens liens signés avec `change-me` deviennent invalides après déploiement.

**Validation production :** durant le déploiement, un token legacy a encore été accepté par l’ancienne version. Une fois le nouveau déploiement actif, le même type de token `change-me` → HTTP 400 `{ "error": "invalid token" }`. `/readiness` = true. Ligne de test nettoyée.

### P10-C — Validation stricte du token + comparaison HMAC en temps constant

**Commit :** `d4d216cf594a6db865027513099bd9559c0fed5b` — `fix(compliance): harden unsubscribe token validation`

**Fichier :** `server/services/unsubscribeToken.js`

Parser final :

- secret primaire obligatoire (P10-B2 conservé) ;
- token brut : string non vide, max 1024, charset base64url `[A-Za-z0-9_-]+` ;
- JSON contrôlé (`try/catch`) ; payload objet, pas `null`, pas tableau, pas primitive ;
- `payload.e` string déjà canonique (`trim` + lowercase) ; max 100 ; regex conservatrice `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (alignée register / checkout) ;
- `payload.v === 1` sans coercition ;
- `payload.mac` string base64url de 43 caractères ; Buffer décodé exactement 32 octets ;
- HMAC-SHA256 attendu calculé en Buffer (`hmacDigest`) ;
- comparaison `crypto.timingSafeEqual` après garde de longueur ;
- échecs malformés normalisés en `Error('bad token')` ;
- `makeUnsubToken` refuse d’émettre un token pour un email vide ou invalide ;
- controller P9-E inchangé → HTTP 400 `{ "error": "invalid token" }` ;
- format public v1 inchangé : `` `${e}::v${v}` ``, HMAC-SHA256, `{ e, v, mac }`, JSON base64url.

**Validation production P10-C :**

- token v2 correctement signé → HTTP 400 `{ "error": "invalid token" }` ;
- token v1 primaire valide → HTTP 200 `{ "ok": true }` ;
- token malformé → HTTP 400 `{ "error": "invalid token" }` ;
- `/readiness` = true ;
- secret retiré de la session de test ;
- ligne DB créée par le token valide nettoyée ;
- aucun résidu de test.

P9-D / P9-E / P9-F n’ont pas été modifiés. P11 / P12 (paniers abandonnés / cron) n’ont pas été corrigés dans P10.

### Décision P10-D — non implémenté

**P10-D n’est pas implémenté.** Décision technique intentionnelle, pas un oubli.

1. **Pas d’expiration (`iat` / `exp`) pour le moment.** Un lien de désabonnement marketing doit rester utilisable longtemps. Le pouvoir du token est limité à la révocation marketing de l’adresse signée. La révocation P9-D est idempotente. Une expiration pourrait empêcher un destinataire de se désabonner à partir d’un ancien email, sans bénéfice proportionné maintenant que la forge via `change-me` est bloquée.

2. **Pas de token opaque DB ni de chiffrement pour le moment.** Le payload v1 reste `base64url(JSON({ e, v, mac }))`. HMAC assure **intégrité / authenticité**, pas la **confidentialité**. L’email reste récupérable par décodage base64url. Le token peut apparaître dans l’URL, l’historique navigateur, ou des logs techniques éventuels. C’est un **résidu de confidentialité accepté** à ce stade. Le masquer réellement exigerait un token opaque avec état serveur ou un format chiffré ; cette complexité n’est pas jugée proportionnée au pouvoir limité du token, ni compatible avec la direction monolithe modulaire / contraintes Hostinger actuelles. Réévaluable plus tard si les exigences privacy, analytics, logs ou architecture changent.

Cela ne constitue **pas** une certification juridique.

### Résidus / décisions — hors P10 ou acceptés

1. L’email dans le token v1 reste décodable (intégrité ≠ confidentialité). Accepté pour P10 ; voir décision P10-D.
2. Pas d’expiration des liens unsubscribe. Accepté pour P10 ; voir décision P10-D.
3. P11 / P12 (paniers abandonnés, job, cron, `req`) **non corrigés**.
4. `recordConsent` / `emailWebhook` restent du code historique non monté (P9-A / P9-B).
5. Les pages légales publiques ne sont **pas** fournies par P10.
6. Aucun secret, longueur de secret, ni exemple de valeur n’est documenté.

### Statut final P10

P10 est **FERMÉ / VALIDÉ EN PRODUCTION**.

Au sens technique :

- fallback public `change-me` retiré ;
- `UNSUB_HMAC_SECRET` obligatoire, fail-closed au chargement ;
- rotation production validée (primaire accepté ; legacy rejeté après P10-B2) ;
- parser v1 durci (structure, email, `v === 1`, MAC 32 octets, `timingSafeEqual`) ;
- format public v1 et parcours P9-E inchangés ;
- production validée ;
- données de test nettoyées ;
- P10-D (expiration / confidentialité URL) volontairement non implémenté.

Cela ne constitue **pas** une certification de conformité légale.

La prochaine priorité d’audit est **P11** (paniers abandonnés), selon la nomenclature du document d’audit gelé.

---

## 18 août 2026 — Chantier P11 : paniers abandonnés (FERMÉ)

Le constat initial d’audit P11 reste figé dans `TECHNICAL_SECURITY_AUDIT.md`. Ce journal documente la remédiation technique.

P11 traite : collecte publique, parsing sendBeacon, validation/sanitization du payload, rate limit, événements navigateur, debounce/refresh, matching recovered, retrait du debug/code mort, et la **décision** de rétention. **P12** (cron, emails de relance, consents, campaign, workers, locks) reste **séparé et non corrigé**. Aucune certification de conformité légale n’est revendiquée.

Handler vivant de collecte : `server/routes/abandonedCartRoutes.js`. Recovered vivant : `markAbandonedRecovered` dans `server/controllers/webhookController.js`. Job P12 : `server/jobs/abandonedCartJob.js` (non modifié).

### P11-A — Inspection

Inspection read-only, **sans commit**.

Constat alors en vigueur : panier `localStorage` ; tracking sur `Checkout.jsx` (`beforeunload` / `pagehide` / `visibilitychange`) ; `sendBeacon` `text/plain` ; `POST /api/log-abandoned-cart` public ; dédup email ~10 min (SELECT puis INSERT) ; recovered webhook email 30 jours `ORDER BY created_at` ; aucune rétention ; debug (`window.__abandonTest`, logs panier, `PreviewOrder`, `cartLogger`) et anciens controller/service non montés. Séparation explicite **P11** (collecte / recovered) vs **P12** (cron / emails).

### P11-B — sendBeacon / text/plain

**Commit :** `9b6a02e8c63d7d654af84b2b9a4b15cb3c5a032d` — `fix(abandoned-cart): parse sendBeacon payload`

**Fichier :** `server/routes/abandonedCartRoutes.js` uniquement.

`express.text({ type: 'text/plain', limit: '100kb' })` sur cette route. Si `req.body` est une string : `JSON.parse` ; JSON invalide / non-objet → HTTP 204. Le parser global `application/json` est inchangé (`app.js` non modifié).

**Validation production :** POST `text/plain` valide → HTTP 201 `{ "ok": true }` ; ligne de test supprimée.

### P11-C — Validation / sanitization

**Commit :** `6f1ec13c2bc1bf6aa00fdfe4149b69811cd09e65` — `fix(abandoned-cart): validate collected payload`

**Fichier :** `server/routes/abandonedCartRoutes.js` uniquement.

Limites alignées sur le checkout (constantes locales, pas d’import du contrôleur) : `MAX_CART_LINES = 20`, `MAX_QUANTITY_PER_LINE = 20`, `MAX_EMAIL_LENGTH = 100`, regex email. Email string obligatoire, trim/lowercase. Snapshot : tableau non vide ≤ 20 lignes. Chaque item sanitizé aux seuls champs `{ id, name, quantity, price, variant_id, printful_variant_id }` ; item invalide → 204, pas d’écriture. `id` entier positif sûr ; `variant_id` / `printful_variant_id` optionnels (null si absents) ; quantité 1–20 ; prix fini ≥ 0. Source whitelist inchangée : `beforeunload` | `manual` | `inactivity`. Le même JSON sanitizé est persisté dans `cart_snapshot` et `cart_contents` (sérialisation texte selon le schéma actuel, **pas** un type JSON MySQL natif revendiqué ici).

**Validation production :** payload valide + champs extra → 201 ; email invalide → 204 ; quantity 21 → 204 ; `JSON_CONTAINS_PATH` 0 pour `secret` / `address` / `hugeNestedObject` ; ligne de test supprimée.

### P11-D — Rate limit

**Commit :** `0edc2debe3a3b24631a2bdadcec9d58e0042d62f` — `fix(abandoned-cart): rate limit public collection`

`abandonedCartLimiter` : `windowMs` 60 s, `max` 30, `standardHeaders: true`, `legacyHeaders: false`, HTTP 429 `{ error: 'Trop de tentatives. Réessaie dans quelques instants.', code: 'ABANDONED_CART_RATE_LIMITED' }`. Ordre : limiter **avant** `express.text`.

**Validation production :** requêtes 1–30 HTTP 204 (payload volontairement non persistant) ; 31e HTTP 429.

### P11-E — Faux abandons navigateur

**Commit :** `8ad34727d3663f1dc3871d6635e508cf2c5a2d7b` — `fix(abandoned-cart): reduce false abandonment events`

**Fichier :** `src/pages/Checkout.jsx` uniquement.

Retrait de `visibilitychange`. `pagehide` ignoré si `event.persisted` (bfcache). `beforeunload` conservé. `sendAbandon`, payload, `reason: 'beforeunload'`, beacon, `sent`, `inCheckout` inchangés. Checkout Stripe non modifié.

**Validation production :** changement d’onglet sur `/checkout` → aucune requête `log-abandoned-cart` ; `pagehide` synthétique `persisted:true` → aucune requête.

Résidu : un beacon navigateur reste best-effort ; ce n’est pas un bug ouvert P11.

### P11-F — Debounce / refresh

**Commit :** `7538abd145db2e9b3fc38606f09252d68d6e75d0` — `fix(abandoned-cart): refresh recent abandoned cart`

**Fichier :** `server/routes/abandonedCartRoutes.js` uniquement.

Ligne récente : `customer_email = ?` AND `is_recovered = 0` AND `COALESCE(last_activity, created_at) >= UTC_TIMESTAMP() - INTERVAL 10 MINUTE`, `ORDER BY COALESCE(last_activity, created_at) DESC LIMIT 1`. Si trouvée : UPDATE `cart_snapshot`, `cart_contents`, `source`, `last_activity = UTC_TIMESTAMP()` ; `created_at` intact ; `updated_at` laissé à `ON UPDATE CURRENT_TIMESTAMP()` ; HTTP 204. Sinon : INSERT existant `(customer_email, cart_snapshot, cart_contents, source)` → 201. Debounce **glissant** 10 minutes. Pas de contrainte UNIQUE ; race SELECT→INSERT **acceptée** comme résidu proportionné. Aucune migration.

**Validation production :** premier POST → 201 / INSERT ; second à +2 s → 204 ; une seule ligne, même `id` ; snapshot/`cart_contents`/source rafraîchis ; `created_at` inchangé ; `last_activity` et `updated_at` avancés ; ligne de test supprimée.

### P11-G — Recovered matching

**Commit :** `c8f779f2f5fd56025ee358a620d1e5e4cddbb6bc` — `fix(abandoned-cart): prioritize recovered matching`

**Fichier :** `server/controllers/webhookController.js` uniquement.

Deux UPDATE distincts. Étape 1 : `checkout_session_id` exact, `is_recovered = 0` ; si `affectedRows > 0`, stop. Étape 2 seulement si 0 : fallback email, `checkout_session_id IS NULL`, fenêtre 30 jours sur `COALESCE(last_activity, created_at)`, même `ORDER BY`, stamp `checkout_session_id` de la session courante. Email de recovery : `orders.email_snapshot`, puis `orders.customer_email`, puis email Stripe/session metadata ; trim/lowercase. Matching **commande paid** inchangé (`stripe_session_id` / `client_reference_id` / `metadata.order_id` ; l’email n’est **jamais** une autorité paid). Recovered = side effect **après COMMIT** ; échec best-effort, pas de rollback paiement ; chemins already-paid / replay non étendus.

Sémantique : recovered **ne prouve pas** que le snapshot exact a été acheté. Sans `checkout_session_id` exact, le fallback signifie plutôt qu’une adresse ayant récemment abandonné a ensuite réalisé un achat.

**Validation production** (transaction / `ROLLBACK`) : session exacte prioritaire vs ligne email plus récente ; fallback email limité aux lignes `checkout_session_id IS NULL`, ligne la plus récemment active ; ligne liée à une autre session intacte ; `p11g_test_rows_remaining = 0`.

### P11-H — Debug / code mort

**Commit :** `9cfb8e1130da8f65b27044208b6ca29821c9fb0c` — `chore(abandoned-cart): remove legacy debug code`

Retraits : `window.__abandonTest` ; deux `console.log` panier production dans `CartContext.jsx` ; route `/preview-order` ; `PreviewOrder.jsx` / `PreviewOrder.css` ; `src/utils/cartLogger.js` ; `server/controllers/abandonedCartController.js` ; `server/services/abandonedCartService.js`. Handler vivant, webhook recovered et `abandonedCartJob` P12 conservés. Aucun comportement métier P11-B à P11-G modifié. Stub admin `/admin/abandoned-carts` non touché.

### P11-I — Décision rétention (non-implémentation volontaire)

Inspection read-only, **sans commit de purge**.

**Aucune purge automatique** de `abandoned_carts` n’est ajoutée dans P11. Ce n’est **pas** un oubli.

Constats techniques : P11-F n’a besoin que de 10 minutes ; P11-G fallback email, 30 jours ; une ligne `is_recovered = 1` n’est plus utilisée par P11-F, P11-G ni P12 ; une ligne non recovered inactive > 30 jours n’est plus utilisée par **P11**, mais le marketing P12 actuel n’a **aucun cutoff haut** (`created_at < 24 h` est un plancher). Le code seul ne permet pas de choisir honnêtement 30 / 60 / 90 jours. Hostinger / `startCronJobs` peut tourner dans plusieurs process sans lock global. Un `DELETE` périodique dans P11 imposerait une politique et une mécanique multi-worker **avant** P12.

Décision : pas de purge auto, pas de `DELETE`/`TRUNCATE`, pas de migration, pas de cron de rétention, pas de mélange avec le job email P12. La politique sera réévaluée avec **P12** et les décisions produit / business / privacy appropriées. **Aucune durée finale** n’est inscrite ici.

La conservation indéfinie des lignes `abandoned_carts` reste un **résidu technique connu** jusqu’à cette décision ultérieure. Aucune conformité légale n’est déclarée.

### Statut final P11

P11 est **FERMÉ / VALIDÉ TECHNIQUEMENT EN PRODUCTION** au sens de la remédiation technique.

- ingestion beacon `text/plain` corrigée ;
- payload strict / sanitizé ;
- rate limit public ;
- faux événements navigateur réduits ;
- debounce / refresh 10 min ;
- recovered matching priorisé (session exacte puis fallback email) ;
- debug / code mort retiré ;
- rétention analysée et **volontairement non automatisée** ;
- données de test nettoyées ;
- P12 explicitement séparé et non corrigé.

Résidus : race SELECT→INSERT P11-F sans UNIQUE ; beacon navigateur best-effort ; fallback recovered email ≠ preuve d’identité du panier payé ; aucune rétention automatique tant que P12 / politique n’est pas définie. Aucune affirmation juridique.

Cela ne constitue **pas** une certification de conformité légale.

La prochaine priorité d’audit est **P12** — job / cron des paniers abandonnés.

---

## 19 août 2026 — Chantier P13 : données Stripe conservées / minimisation (FERMÉ)

Le constat initial d’audit P13 reste figé dans `TECHNICAL_SECURITY_AUDIT.md`. Ce journal documente la remédiation technique. Aucune certification de conformité légale n’est revendiquée.

Objectif : cesser de conserver des événements Stripe complets dans `stripe_events.payload`, restreindre les projections admin order detail, et cesser de dupliquer adresse / lignes panier dans les metadata des **nouvelles** Checkout Sessions. P4 avait volontairement laissé hors scope la rétention / PII de `payload`.

Constat historique (avant correction), non réécrit dans l’audit gelé :

- `stripe_events.payload` conservait `JSON.stringify(event)`, donc des événements Stripe complets ;
- certains payloads contenaient email, adresse, shipping, `payment_method`, `payment_method_details`, `last4`, `metadata` ;
- le détail admin utilisait `SELECT *` / `oi.*` ;
- Checkout metadata dupliquait `shipping` et `cart_items` ;
- aucune preuve identifiée de stockage PAN / CVC / `client_secret` dans des colonnes DB dédiées.

P12 demeure un chantier distinct et n’est pas fermé dans cette section.

### P13-A — Diagnostic production

Inspection / diagnostic uniquement, **sans commit**.

Événements observés en production avant correction, avec PII dans `payload` selon le type :

- `checkout.session.completed` : email / address / shipping ;
- `charge.succeeded` : email / address / shipping / `payment_method` / `payment_method_details` / `last4` ;
- `payment_intent.succeeded` : address / shipping / `payment_method` ;
- `charge.updated` : email / address / shipping / `payment_method` / `payment_method_details` / `last4` ;
- `payment_intent.created` : shipping / `payment_method` ;
- `checkout.session.expired` : email / address / shipping ;
- `balance.available` ;
- `customer.updated` : email / address / shipping.

Aussi observé : **85** anciennes rows avec `event_type` vide et `payload` NULL, timestamps historiques identiques entre elles, `event_id` uniques. Origine probable : migration historique du schéma `stripe_events`. Ces rows ont été **conservées** : elles restent des barrières d’idempotence (`event_id`) et ne contiennent pas de payload PII.

### P13-B — Minimisation des futurs `stripe_events.payload`

**Commit :** `dd9580d` — `fix(stripe): minimize persisted webhook payload`

**Fichier :** `server/controllers/webhookController.js`

Nouveau contrat d’écriture (`upsertStripeEvent`) :

- `checkout.session.*` → `{"object_id":"cs_..."}` ;
- `payment_intent.*` → `{"object_id":"pi_..."}` ;
- `charge.*` → `{"payment_intent_id":"pi_..."}` ;
- événement sans identifiant utile → SQL `NULL`.

Jamais `{}` comme fallback (un objet vide n’est pas un NULL SQL). `reconcileStripeEvents` est **dual-format** : ancien JSON Stripe complet **et** nouveau format minimal. Les autres chemins webhook / idempotence (INSERT IGNORE `event_id`, replay métier P4) restent fonctionnels sans payload complet.

**Validation :** code déployé en production ; compatibilité SQL / code vérifiée ; format minimal présent en base **après P13-C** (réécriture historique). **Aucun nouvel `upsertStripeEvent` live post-`dd9580d` n’a encore été observé.** Ce point est une **validation runtime différée**. Le writer live n’est **pas** déclaré validé en production.

### P13-C — Neutralisation des payloads historiques

Opération SQL production. **Aucun commit Git.**

Backup créé **avant** mutation : table `stripe_events_p13c_backup_20260818`. 48 rows historiques contenant encore des payloads complets y ont été sauvegardées. Le backup est **conservé volontairement**. Aucun `DROP` dans cette clôture. Table hors schéma applicatif vivant : filet de rollback / preuve historique temporaire, pas une entité fonctionnelle.

Transformation appliquée sur les payloads actifs :

- `checkout.session.completed` → `object_id` ;
- `payment_intent.created` → `object_id` ;
- `payment_intent.succeeded` → `object_id` ;
- `checkout.session.expired` → `object_id` ;
- `charge.succeeded` → `payment_intent_id` ;
- `charge.updated` → `payment_intent_id` ;
- `balance.available` → `NULL` ;
- `customer.updated` → `NULL`.

**Validation finale production :**

- `legacy_payloads_remaining` = 0 ;
- `minimal_object_id` = 28 ;
- `minimal_payment_intent_id` = 14 ;
- `expected_null_payloads` = 6.

Scan PII sur les payloads restant non NULL : `email` = 0, `address` = 0, `shipping` = 0, `payment_method` = 0, `payment_method_details` = 0, `last4` = 0, `metadata` = 0.

### P13-D — Restriction des projections admin

**Commit :** `820899b` — `fix(admin): restrict order detail projections`

**Fichier :** `server/controllers/adminController.js`

`GET` admin order detail n’utilise plus `SELECT *` / `oi.*`.

Projection `orders` : `id`, `status`, `total`, `currency`, `customer_email`, `created_at`, `paid_at`, `stripe_session_id`.

Projection items : `id`, `variant_business_id`, `printful_variant_id`, `quantity`, `price_at_purchase`.

**Validation production :** Order #106 — affichage détail fonctionnel ; statut ; total / devise ; email ; dates ; session ; items ; historique fonctionnel.

### P13-E — Minimisation Checkout metadata

**Commit :** `f0cee56` — `fix(stripe): reduce checkout metadata`

**Fichier :** `server/controllers/checkoutController.js`

Nouvelles Checkout Sessions : metadata conservée `source`, `order_id`, `shipping_rate`. Metadata **non envoyée** : `shipping`, `cart_items`.

Les lecteurs legacy de `session.metadata.shipping` / `cart_items` restent présents pour les **anciennes** sessions. Le webhook **ne recommence pas** à reconstruire `order_items` depuis `cart_items` (P5 inchangé). `order_id` / `client_reference_id` restent les mécanismes de résolution autoritaires existants. Aucune refonte du checkout.

**Validation production :** création d’une nouvelle Checkout Session réussie ; Order #107 créée `pending` ; `stripe_session_id` `cs_test_...` présent ; **aucun paiement effectué** ; donc aucun webhook paid utilisé comme validation de cette tranche.

### Statut final P13

P13 est **FERMÉ / COMPLET** au sens de la remédiation technique. Ce n’est **pas** une validation en production de l’ensemble du chantier, et **pas** une certification de conformité légale.

La remédiation technique est terminée :

- futurs payloads limités par conception ;
- payloads historiques actifs neutralisés ;
- PII absente des payloads actifs vérifiés ;
- projection admin réduite ;
- metadata Checkout réduite ;
- compatibilité legacy conservée.

**Résidu explicite :** le premier upsert `stripe_events` produit par un webhook live post-`dd9580d` n’a pas encore été observé. À confirmer lors du prochain webhook naturel ou test. Ce résidu **ne bloque pas** la fermeture technique P13. Il ne doit **pas** être présenté comme déjà validé.

Backup `stripe_events_p13c_backup_20260818` : **conserver** jusqu’à stabilisation documentaire / décision explicite ultérieure. Aucune suppression dans P13.

**P12 demeure un chantier distinct et n’est pas fermé dans cette section.**

---

## 19 août 2026 — Chantier P14 : livraison Printful (FERMÉ)

Le constat initial d’audit P14 reste figé dans `TECHNICAL_SECURITY_AUDIT.md`. Ce journal documente la remédiation technique. Aucune certification de conformité légale n’est revendiquée.

P14 traite la **surface de quote** `POST /api/shipping/rates` : abus / coût Printful, validation du payload, rattachement au catalogue, UX (debounce / abort / stale response). Ce n’est **pas** l’intégrité du montant Stripe : `createCheckoutSession` recalcule et revalide le tarif côté serveur (P1 / P3).

La route reste **volontairement publique** : le checkout invité en dépend.

P12 demeure un chantier distinct et n’est pas fermé dans cette section.

### Constat initial

Le constat P14 gelé concernait notamment :

- `POST /api/shipping/rates` public ;
- risque d’abus / coût d’appels Printful ;
- 20 appels/min/IP déjà présents ;
- requêtes déclenchées lors des modifications d’adresse ;
- absence de debounce / annulation ;
- risque de réponses périmées ;
- payload adresse / items insuffisamment borné ;
- possibilité de fournir un `variant_id` Printful court directement ;
- quantités peu bornées ;
- lookup variante insuffisamment lié au catalogue local ;
- log complet de l’item via `JSON.stringify(it)` si variante introuvable.

### P14-A — Protections préexistantes confirmées

**Sans commit P14.** Ces éléments existaient déjà et n’ont pas été ajoutés par `5950200` / `92498fb` / `39670ec`.

- Route : `POST /api/shipping/rates` (`server/routes/shippingRoutes.js`, montage `/api/shipping`).
- `shippingLimiter` monté **avant** `getRates` : 20 appels / minute / IP (`server/middlewares/rateLimiters.js`).
- Trust proxy production déjà traité sous P0 (fiabilité de `req.ip`).
- Garde UI `isCurrent` déjà présente avant P14-D (stale response partiellement protégée).
- Changement d’adresse : invalidation de la sélection shipping (`setShippingRate(null)` côté Checkout / reset dans `ShippingOptions`).
- Aucune autre route publique identique ne contourne ce limiter. `POST /api/create-checkout-session` a son **propre** limiter (`checkoutLimiter`) et son **propre** recalcul Printful (intégrité P1/P3), ce n’est pas un clone de la quote.

### P14-B/C — Durcissement backend

**Commit :** `5950200` — `fix(shipping): harden Printful rate requests`

**Fichier :** `server/controllers/shippingController.js`

**Recipient** (strings uniquement, trim) : `name` requis max 100 ; `address1` requis max 200 ; `city` requis max 100 ; `state` ou `state_code` → exactement 2 lettres uppercase ; `country` ou `country_code` → `CA` ou `US` uniquement ; `zip` requis max 10. Email **non requis** et **non transmis** à Printful sur cette route.

**Items :** tableau 1–20 lignes ; `printful_variant_id` entier positif sûr ; `quantity` entier 1–20 ; doublons `printful_variant_id` refusés ; une ligne invalide → HTTP 400 pour **toute** la requête (plus de `continue` silencieux). `items[].variant_id` client **n’est pas** une autorité (ignoré).

**Catalogue :** une requête groupée `product_variants` JOIN `products` sur `printful_variant_id IN (...)` (paramètres bindés) ; `pv.is_active = 1` ; `p.is_visible = 1`. Le `variant_id` court envoyé à Printful vient de la DB. Variante inconnue, inactive, produit masqué, ou ID Printful ambigu → HTTP 400 **avant** tout appel Printful.

**Appel Printful :** au plus un `POST https://api.printful.com/shipping/rates` après validation ; `timeout` local explicite 10 000 ms ; pas de retry ; pas de cache. Un cache de quotes **n’est pas** une condition de fermeture P14 (le cache de la phase 8 d’audit vise l’inventaire / **P15**).

**Logs :** branche `JSON.stringify(it)` retirée. Le catch ne dump plus `err.response.data` complet. Réponse client d’erreur Printful / timeout : générique (`Impossible d’obtenir les options de livraison.`).

### P14-D — Debounce / annulation frontend

**Commits :**

- `92498fb` — `fix(shipping): debounce and cancel stale rate requests`
- `39670ec` — `tune(shipping): increase rate debounce`

**Fichier :** `src/components/ShippingOptions.jsx`

Debounce avant `POST /api/shipping/rates`. Valeur **finale production : 800 ms**. Un `AbortController` par exécution d’effet ; `signal` passé à Axios. Cleanup (adresse complète) : `isCurrent = false`, `clearTimeout`, `abort`. `isCurrent` reste une garde défensive. Annulation Axios ignorée silencieusement ; une vraie erreur réseau conserve le comportement d’erreur existant. La sélection shipping est invalidée **immédiatement** (`onShippingSelected(null)`) quand l’adresse / le panier change. Contrat API frontend inchangé : `{ recipient, items: [{ printful_variant_id, quantity }] }`.

Le debounce évite les appels **avant envoi**. L’abort annule **côté client** les requêtes périmées encore annulables. `isCurrent` empêche une réponse obsolète d’écrire dans l’état React. Un abort client **ne garantit pas** qu’une requête déjà arrivée au serveur n’atteindra jamais Printful.

### Validations production

**Chemin légitime.** Checkout avec adresse canadienne valide ; tarif Printful affiché correctement ; aucune régression fonctionnelle observée.

**Payload invalide.** `POST /api/shipping/rates` avec `country = XX` → HTTP 400 `{ error: 'Adresse de livraison invalide.' }`.

**Variante hors catalogue.** `printful_variant_id` arbitraire → HTTP 400 `{ error: 'Variante indisponible.' }`.

**Debounce.** Après hard refresh du bundle : saisie rapide de 6 caractères → 1 POST `shipping/rates` ; suppression rapide des mêmes 6 caractères → 1 POST ; debounce final = 800 ms.

Une validation antérieure (debounce 400 ms) avait produit plusieurs requêtes, jusqu’à HTTP 429 du limiter, parce que les modifications étaient suffisamment **espacées** pour dépasser 400 ms. Ce n’est **ni** une boucle React **ni** un bug du limiter. Cela a mené à l’ajustement `39670ec` (800 ms).

### Résidus acceptés (non bloquants)

- route publique volontaire ;
- nom et adresse envoyés à Printful pour obtenir le devis ;
- pas de cache sur les quotes shipping ;
- le limiter compte aussi les requêtes rejetées (HTTP 400) ;
- second lookup Printful dans `createCheckoutSession`, **voulu** pour l’intégrité P1/P3 ;
- un message d’erreur Printful minimal peut encore apparaître dans `logError` ; ce handler ne journalise pas l’item client complet, ni headers, ni config Axios, ni clé API.

### Statut final P14

P14 est **FERMÉ / COMPLET** au sens de la remédiation technique. Ce n’est **pas** une certification de conformité légale, et **pas** une garantie qu’aucun appel Printful abusif ne puisse jamais exister. La surface est raisonnablement bornée par validation, catalogue local, limiter et debounce.

**P15** (inventaire Printful) demeure distinct et est le **prochain chantier MODÉRÉ**.

**P12** demeure distinct : correctif déjà déployé ; validation runtime cron finale encore différée ; **non fermé** ici.

---

## 19 août 2026 — Chantier P15 : inventaire Printful (FERMÉ)

Le constat initial d’audit P15 reste figé dans `TECHNICAL_SECURITY_AUDIT.md`. Ce journal documente la remédiation technique. Aucune certification de conformité légale n’est revendiquée.

P15 traite la **surface de disponibilité** `GET /api/inventory/printful-stock/:id` : proxy Printful, validation d’identifiant, rattachement au catalogue, sémantique `available`, cache court, logs, stale response UI. Ce n’est **pas** l’autorité du checkout (P1 / P3), **pas** P14 (quotes shipping), **pas** P17 (produits publics), **pas** P19 (Printful automatique du webhook).

La route reste **publique**, derrière `inventoryLimiter`.

P12, P17 et P19 demeurent des chantiers distincts et ne sont pas fermés dans cette section.

### Constat initial

Le constat P15 gelé concernait notamment :

- `GET /api/inventory/printful-stock/:id` public ;
- `inventoryLimiter` 60/min/IP existant, mais décrit comme non monté dans l’audit figé (constat historique ; le code vivant le monte — voir ci-dessous) ;
- `:id` interpolé directement dans `GET https://api.printful.com/sync/variant/:id` ;
- aucune validation stricte de l’ID ;
- aucun gate catalogue local actif / visible avant Printful ;
- possibilité d’itérer des IDs Printful arbitraires dans la limite du limiter ;
- un GET client = un appel Printful ; pas de cache ; pas de déduplication in-flight ;
- `ProductDetail` rappelait la disponibilité à l’affichage / changement de variante ;
- `CartContext.validateStockBeforeAdd` refaisait un GET avant ajout panier ;
- absence de protection stale-response dans `ProductDetail` ;
- faux stock : `active` / `active-supplier` → `available = 999`, sinon `0` ;
- fallback frontend historique `?? 99` ;
- `999` n’était **pas** un stock réel Printful (le service ne lit que `availability_status`) ;
- erreurs publiques trop détaillées, hint mentionnant `PRINTFUL_API_KEY` / `PRINTFUL_STORE_ID` ;
- `logError(..., ..., error)` alors que `logError` n’accepte que deux arguments : l’objet Axios était ignoré.

### Limiter (préexistant, confirmé vivant)

Route : `GET /api/inventory/printful-stock/:id` (`server/routes/inventoryRoutes.js`, montage `/api/inventory`).

`inventoryLimiter` est monté **avant** `getPrintfulStock` : 60 requêtes / minute / IP (`server/middlewares/rateLimiters.js`). Store **mémoire par process** (non distribué). Le constat d’audit « nulle part importé » est **obsolète dans le code vivant** ; l’audit gelé n’est pas réécrit.

Le montage du limiter antérieur (`a183038`) **ne fermait pas** P15.

### P15-B/C/G — Validation et gate catalogue

**Commit :** `ae08fca` — `fix(inventory): restrict Printful stock lookups`

**Fichier :** `server/controllers/inventoryController.js`

`:id` : string, trim, représentation décimale canonique positive (`/^[1-9]\d{0,18}$/`), maximum BIGINT signé `9223372036854775807` (comparaison lexicale, **sans** `Number`). ID invalide → HTTP 400 `{ error: 'Identifiant de variante invalide.' }` **avant** lookup et **avant** Printful.

Lookup paramétré : `product_variants` INNER JOIN `products` sur `pv.printful_variant_id = ?`, `pv.is_active = 1`, `p.is_visible = 1`, `LIMIT 2`. `printful_variant_id` n’est **pas** UNIQUE dans le schéma actuel : 0 ou ≥2 lignes → HTTP 400 `{ error: 'Variante indisponible.' }`. Seul le `printful_variant_id` **relu depuis la DB** est transmis à `getPrintfulVariantAvailability`. Pas de conversion vers `variant_id` court (endpoint Printful `GET /sync/variant/:id` attend le sync ID long).

La route n’est plus un proxy arbitraire vers Printful.

**Validations production :**

- variante réelle visible de la boutique : fonctionnement normal ;
- `/api/inventory/printful-stock/abc` → HTTP 400 `{ error: 'Identifiant de variante invalide.' }` ;
- `/api/inventory/printful-stock/1` → HTTP 400 `{ error: 'Variante indisponible.' }`.

### P15-F/J — Contrat booléen et quantité métier

**Commit :** `f82f7b4` — `fix(inventory): use boolean Printful availability`

**Fichiers :** `server/controllers/inventoryController.js`, `src/pages/ProductDetail.jsx`, `src/CartContext.jsx`

Contrat public : `{ available: true }` ou `{ available: false }`. `true` seulement si `availability_status === 'active'` ou `'active-supplier'`. Le endpoint exprime une **disponibilité**, pas une quantité Printful.

Supprimé : `available = 999` / `0` comme stock ; fallback `?? 99` ; « Stock limité : N » ; `max={availableStock}` ; comparaison de quantité contre un faux stock Printful.

Frontend : `true` → « Disponible » ; `false` → « Indisponible » ; quantité UI 1–20. `CartContext` : `addToCart`, `validateStockBeforeAdd` et `updateQuantity` imposent 1–20 ; quantités acceptées normalisées en `Number` ; **pas** de clamp silencieux ; `> 20` refusé. Le bouton `+` du checkout (`addToCart({ ...item, quantity: 1 })`) est bloqué à 20 par `addToCart`.

**Validations production :**

- API réelle : HTTP 200 `{ available: true }` ;
- après chargement du nouveau bundle frontend : affichage « Disponible » ;
- quantité 20 : ajout panier accepté ;
- checkout, ligne déjà à 20 + clic `+` : quantité reste 20 ; toast `La quantité maximale est de 20 par article.`

Un ancien bundle avait brièvement affiché `Stock limité : true disponible` **avant** hard refresh. Après chargement du nouveau bundle, le comportement final était correct. Ce n’est **pas** l’état final.

**Résidu :** un panier `localStorage` historique déjà `> 20` n’est pas migré / clampé. Les nouvelles opérations frontend empêchent le dépassement. Le checkout backend reste autoritaire et refuse `> 20`.

### P15-E — Cache Printful

**Commit :** `5a3a1fb` — `perf(inventory): cache Printful availability`

**Fichier :** `server/services/printfulService.js`

Cache mémoire process-local `availabilityCache` : clé = `printful_variant_id` en `String` ; valeur `{ status, cachedAt }`. TTL **60 s**. Maximum **500** entrées. Éviction FIFO (`Map`) : insertion d’une nouvelle clé si taille ≥ 500 → suppression de la plus ancienne. Entrée expirée supprimée **à la lecture**, puis nouvel appel Printful. Pas de `setInterval`, pas de timer permanent.

Les erreurs (timeout, 404, 429, 5xx, Axios) **ne sont pas** écrites dans le cache. Une réponse Printful **réussie** avec `availability_status` `null` peut être cachée pendant le TTL ; le contrôleur l’interprète ensuite comme indisponible.

In-flight : `availabilityInflight` — même ID déjà en cours → même `Promise` ; un seul Axios par ID et par process ; retrait dans `finally` ; une erreur ne reste pas dans cette Map.

Contrat public `{ available: boolean }` inchangé.

**Validation production :** après déploiement du cache, une fiche produit réelle a continué à afficher « Disponible » (absence de régression nominale). **Aucun cache hit n’a été empiriquement observé en production** : le serveur n’a pas été instrumenté à cette fin. La logique cache / in-flight est validée **statiquement** par le code.

**Résidus :** cache par process, non distribué, reset au redémarrage ; disponibilité pouvant rester périmée jusqu’à 60 s.

### P15-I — Erreurs et logs

**Commit :** `f5e22ef` — `fix(inventory): sanitize Printful availability errors`

**Fichiers :** `server/services/printfulService.js`, `server/controllers/inventoryController.js`

Catch séparé :

- lookup DB interne → HTTP 500 `{ error: 'INVENTORY_LOOKUP_FAILED' }` ;
- dépendance Printful → HTTP 502 `{ error: 'PRINTFUL_AVAILABILITY_UNAVAILABLE' }`.

Les 400 métier restent : `Identifiant de variante invalide.` / `Variante indisponible.`

Plus exposés au client : `err.message`, `hint`, `PRINTFUL_API_KEY`, `PRINTFUL_STORE_ID`, détails Axios, `response.data` brut.

Log serveur Printful : message borné `Printful availability request failed` + `status=` (HTTP 100–599) et/ou `code=` (token Axios filtré). Pas d’Authorization, headers, clé API, store ID, config Axios, body, ni objet Axios complet. L’appel historique `logError(..., ..., error)` (3ᵉ argument ignoré) est retiré. Throw interne `PRINTFUL_AVAILABILITY_FAILED` : **non** exposé au client.

Cache P15-E inchangé : aucune erreur mise en cache.

**Validation production :** après déploiement, disponibilité nominale d’une variante réelle toujours fonctionnelle. **Aucune panne DB ou Printful n’a été provoquée en production** pour obtenir 500 / 502. La séparation et les payloads d’erreur sont validés **statiquement** par inspection du code ; le smoke test nominal est validé en production.

### P15-H — Stale response / AbortController

**Commit :** `6661061` — `fix(inventory): prevent stale availability updates`

**Fichier :** `src/pages/ProductDetail.jsx`

`AbortController` par requête de disponibilité ; `signal` passé à Axios. Cleanup : `isCurrent = false` puis `controller.abort()`. Garde `isCurrent` : une ancienne requête ne peut plus modifier `isAvailable` ni `loading`. Une annulation cleanup ne transforme pas la nouvelle variante en « Indisponible ». Le `finally` d’une ancienne requête ne met pas `loading = false` pendant que la nouvelle charge. Sans `printful_variant_id` : aucun GET inventory ; `isAvailable = false` ; `loading = false`. **Pas** de debounce (le cache serveur + in-flight suffisent pour le coût ; une variante nouvellement sélectionnée doit être vérifiée immédiatement).

Un abort navigateur **ne garantit pas** l’arrêt d’un appel Printful déjà arrivé au serveur. Bénéfice garanti : annulation HTTP cliente lorsque possible ; aucune mise à jour React obsolète.

**Validation production :** DevTools Network, throttling 3G, changements rapides de variante : requêtes précédentes en `(canceled)` ; capture finale : quatre requêtes annulées ; seule la dernière disponibilité en HTTP 200 ; comportement de la dernière sélection conservé. Cela ferme le risque stale-response de `ProductDetail`.

### Résidus acceptés (non bloquants)

- route publique volontaire, derrière limiter 60/min/IP (store mémoire par process) ;
- cache disponibilité par process, TTL 60 s, non distribué ;
- IDs Printful encore exposés par les APIs produit (P17, distinct) ;
- panier `localStorage` historique `> 20` non migré ;
- Printful n’est pas autoritaire pour le paiement (checkout recalcule côté serveur).

### Statut final P15

P15 est **FERMÉ / COMPLET / VALIDÉ EN PRODUCTION**. Ce n’est **pas** une certification de conformité légale.

Fermeture technique et smoke tests production :

- proxy d’ID Printful arbitraire supprimé ;
- validation ID stricte (BIGINT signé, sans `Number`) ;
- gate catalogue `is_active` / `is_visible` ;
- disponibilité booléenne honnête ; faux stock `999` / `99` supprimé ;
- limite quantité 1–20 cohérente (UI, panier, checkout backend autoritaire) ;
- cache court borné + in-flight dedup (logique code ; hit cache non observé en prod) ;
- erreurs publiques minimales ; logs serveur bornés (500 / 502 non déclenchés volontairement en prod) ;
- stale responses `ProductDetail` neutralisées (throttling 3G) ;
- smoke tests production réussis.

**P16** (page de succès), sévérité **MODÉRÉ**, est le **prochain chantier**.

**P12** demeure distinct : correctif déjà déployé ; validation runtime cron finale encore différée ; **non fermé** ici.

**P17** (produits publics) demeure distinct : l’exposition d’identifiants internes / Printful par les APIs produit n’est **pas** fermée ici.

**P19** (Printful automatique du webhook) demeure distinct et **non fermé** ici.

---

## 20 août 2026 — Chantier P16 : page de succès (FERMÉ)

Le constat initial d’audit P16 reste figé dans `TECHNICAL_SECURITY_AUDIT.md`. Ce journal documente la remédiation technique. Aucune certification de conformité légale n’est revendiquée.

P16 traite la **page de succès checkout** : faux succès UX, corrélation du retour Stripe avec le checkout de cet onglet, race webhook / redirect, et suppression de `/shop?flash=merci` comme autorité du toast. Ce n’est **pas** l’autorité du paiement (webhook Stripe signé), **pas** P23 (durcissement de `/payments/verify`), **pas** P17 (produits publics), **pas** P19 (Printful automatique du webhook).

Aucun backend n’a été modifié dans ce chantier.

P12, P17, P19 et P23 demeurent des chantiers distincts et ne sont pas fermés dans cette section.

### Constat initial

Le constat P16 gelé concernait notamment :

- `Success.jsx` lit `session_id` et appelle `/payments/verify` **une seule fois** ;
- le backend verify lit seulement MySQL, pas Stripe directement ;
- `paid` n’est vrai que lorsque le webhook a déjà mis la commande à `paid` ;
- le panier n’était vidé que si `paid === true` (correct) ;
- aucune nouvelle tentative : si le webhook est retardé, le panier n’était pas vidé ;
- `Success.jsx` redirigeait **toujours** vers `/shop?flash=merci` : même sans `session_id`, même si la session est introuvable, même si la vérification échoue ;
- `Shop.jsx` affichait « Merci pour ton achat » uniquement selon `flash=merci` ;
- un faux message de réussite était donc possible ;
- `window.location.replace` retirait `session_id` de l’URL courante ;
- `Shop.jsx` nettoyait `flash` avec `replace`.

Complément vivant documenté lors de la remédiation (hors mot-à-mot de l’audit) : le backend retournait déjà `{ id: session.id, url: session.url }` (éventuellement `reused: true`), mais Checkout.jsx **ne mémorisait pas** `id` avant `window.location.href = url`. Un `session_id` Stripe payé copié depuis ailleurs pouvait donc, dans le navigateur courant, vider le panier local après un verify `paid`.

### Correctif

**Commit :** `b783383` — `fix(checkout): harden payment success flow`

**Fichiers :** `src/pages/Checkout.jsx`, `src/pages/Success.jsx`, `src/pages/Shop.jsx`

Aucun backend, aucune route paiement, aucun webhook, aucune DB.

#### Corrélation du checkout

Avant redirection Stripe, `Checkout.jsx` mémorise le vrai `response.data.id` dans `sessionStorage` sous la clé `flippinMapleCheckoutSessionId`.

Le redirect n’a lieu que si `response.data.url` et `response.data.id` sont des strings non vides **et** que `sessionStorage.setItem` réussit. Si `sessionStorage` échoue : pas de redirect Stripe ; message d’erreur ; **aucun** fallback `localStorage`.

`sessionStorage` n’est **pas** une preuve de paiement. Il sert seulement à corréler le retour Stripe avec le checkout lancé dans cet onglet.

#### Success.jsx — corrélation avant verify

Égalité stricte exigée **avant** tout effet de succès :

`session_id` URL === `sessionStorage.flippinMapleCheckoutSessionId`

Si `session_id` absent, session attendue absente, ou IDs différents : aucun `GET /payments/verify` ; aucun `clearCart` ; aucun merci ; aucun `clearInCheckoutFlag` ; le marqueur attendu n’est **pas** consommé (il peut appartenir à un vrai checkout en cours) ; redirect vers `/shop` sans signal de succès.

Une URL success étrangère ne peut plus agir sur le panier local.

#### Vérification paid

`/payments/verify` reste un reflet MySQL. La source de vérité du paiement demeure :

webhook Stripe signé → `orders.status = 'paid'` → verify reflète cet état.

Success.jsx ne considère le paiement confirmé que si `found === true` **et** `paid === true`. Le frontend ne marque jamais une commande `paid`. Success.jsx n’interroge pas Stripe.

#### Race webhook

Pour absorber le retour Stripe pouvant arriver avant `checkout.session.completed` :

- 8 tentatives maximum ;
- première immédiatement ;
- environ 1 seconde entre les tentatives ;
- timeout Axios **local** de 5000 ms par requête (`VERIFY_REQUEST_TIMEOUT_MS` dans Success.jsx) ;
- erreurs réseau / timeout retryables dans cette limite ;
- `AbortController` + garde `cancelled` au démontage ;
- aucun polling infini ; aucun `setInterval` permanent.

`src/utils/api.js` n’a pas été modifié.

Après épuisement sans `paid` : panier conservé ; aucun merci ; session attendue **consommée** (un ancien `session_id` ne doit plus pouvoir vider un nouveau panier plus tard) ; retour `/shop`. `inCheckout` n’est nettoyé que si `paid` est confirmé.

#### Effets après paid confirmé

Seulement après corrélation **et** `found === true` **et** `paid === true` : `clearCart` ; `clearInCheckoutFlag` ; retrait de la session attendue ; navigation `/shop` avec React Router `state: { purchaseSuccess: true }`.

React Router `state` n’est **pas** une preuve de paiement : c’est un transport UX après une décision déjà prise par Success.jsx.

#### Suppression de `flash=merci`

`/shop?flash=merci` ne déclenche plus le toast achat. `Shop.jsx` affiche « Merci pour ton achat ! » seulement si `location.state?.purchaseSuccess === true`, puis consomme ce flag par `replace` en conservant `location.search` et donc les query params réellement présents, notamment `highlight`.

### Validations statiques / build

- lint ciblé des trois fichiers P16 : OK ;
- `git diff --check` : OK ;
- build production Vite : OK ;
- 1747 modules transformed ;
- build terminé avec succès.

### Validations production

1. URL directe `https://flippinmaple.com/shop?flash=merci` : boutique affichée ; **aucun** toast « Merci pour ton achat ! ». Le query param seul ne fabrique plus un succès.
2. URL directe `https://flippinmaple.com/checkout/success` sans `session_id` : retour vers `/shop` ; aucun toast succès.
3. URL avec faux `session_id` (`/checkout/success?session_id=cs_fake_test`) : retour vers `/shop` ; aucun toast succès ; aucun effet indésirable observé.
4. Vrai checkout Stripe en production (environnement / test prévu) : flow réussi au retour ; toast « Merci pour ton achat ! » ; panier vidé ; aucune boucle / page bloquée.
5. État navigateur après le retour payé : `sessionId: null`, `inCheckout: null`, `cart: '[]'` — session attendue consommée ; flag checkout nettoyé ; panier vidé.

Aucune race webhook supérieure à la fenêtre de retry (~7 s hors réseau) n’a été artificiellement démontrée. Aucune panne réseau prolongée n’a été testée.

### Résidus acceptés (non bloquants)

- si le webhook prend plus longtemps que la fenêtre de retry, l’UX reste silencieuse et le panier demeure présent (préférable à un faux succès) ;
- `sessionStorage` indisponible → pas de redirect Stripe depuis Checkout (fail-safe) ;
- `sessionStorage` n’authentifie pas un paiement ;
- React Router `state` n’authentifie pas un paiement ;
- `/payments/verify` demeure public (P23, distinct) : limiter, `orderId` retourné, validation serveur du format `session_id`, auth — **non traités** ici.

### Statut final P16

P16 est **FERMÉ / COMPLET / VALIDÉ EN PRODUCTION**. Ce n’est **pas** une certification de conformité légale.

Fermeture technique et smoke tests production :

- faux succès `flash=merci` retiré ;
- corrélation onglet exigée avant verify / `clearCart` / merci ;
- `clearCart` seulement si corrélation + `found === true` + `paid === true` ;
- retry borné de verify pour la race webhook normale ;
- timeout local 5 s par requête verify ;
- vrai toast via React Router `state` consommé après affichage ;
- checkout Stripe réel validé en production.

**P17** (produits publics), sévérité **MODÉRÉ**, est le **prochain chantier**.

**P12** demeure distinct : correctif déjà déployé ; validation runtime cron finale encore différée ; **non fermé** ici.

**P19** (Printful automatique du webhook) demeure distinct et **non fermé** ici.

**P23** (API de vérification du paiement) demeure distinct et **non fermé** ici.

---

## 20 août 2026 — Chantier P17 : produits publics (FERMÉ)

Le constat initial d’audit P17 reste figé dans `TECHNICAL_SECURITY_AUDIT.md`. Ce journal documente l’état vivant et la fermeture. Aucune certification de conformité légale n’est revendiquée.

P17 traite la **surface publique catalogue** : listes, featured, détail, recherche/tri, validation d’identifiant, variants exposés. Ce n’est **pas** l’autorité du checkout (P1 / P3), **pas** P15 (inventaire Printful), **pas** P18 (wishlist), **pas** P19 (Printful automatique du webhook).

**Aucun correctif de code n’a été ajouté pour fermer P17.** Les remédiations nécessaires existaient déjà dans le code vivant, réalisées **avant** l’ouverture formelle de ce chantier. Cette section rattache P17 à ces commits historiques et aux validations production du 20 août 2026.

P12, P18, P19, P20 et P23 demeurent des chantiers distincts et ne sont pas fermés dans cette section.

### Constat initial

Le constat P17 gelé concernait notamment :

- les listes visible et featured filtrent `is_visible=1` ;
- les requêtes utilisent des paramètres ;
- les colonnes sont explicites ;
- aucun appel Printful ;
- `getProductDetails` ne filtrait pas `is_visible` ;
- un produit masqué restait accessible par son ID ;
- toutes ses variantes étaient alors retournées ;
- `productId` vérifiait seulement `Number.isNaN` (entier positif fini non imposé) ;
- la recherche `q` utilise `LIKE` avec wildcard initial ;
- longueur de `q` non limitée ;
- le frontend pouvait déclencher une requête à chaque frappe ;
- `printful_variant_id` est public dans le catalogue (pas un secret, mais cela facilitait l’appel automatisé de l’inventaire).

### Remédiations déjà existantes (antérieures à l’ouverture formelle P17)

**Fichier principal :** `server/controllers/productsController.js`

- `12fd1e2` — `fix(products): hide non-visible product details` : `getProductDetails` exige `WHERE id = ? AND is_visible = 1`.
- `d06d4af` — `fix(products): validate product ids strictly` : identifiant string digits only (`/^\d+$/`), `Number`, `Number.isSafeInteger`, `> 0`.
- `cc0aea3` — `fix(products): limit search query length` : `q` refusé au-delà de 100 caractères.
- `74d36c8` — `fix(products): hide inactive variants publicly` : variantes publiques limitées à `is_active = 1`.

Recherche frontend (soumission explicite, plus de fetch à chaque frappe), commits historiques confirmés :

- `51747b8` — `fix(shop): limit search input length`
- `79876d4` — `feat(shop): submit product search explicitly`
- `b2ff863` — `fix(shop): restore catalogue when search is cleared`

Ces commits étaient déjà déployés. P17 n’en crée pas de nouveau.

### État vivant

Routes publiques (`server/routes/productsRoutes.js`, montage `/api/products`) :

- `GET /api/products` — catalogue visible, `q` / `sort` optionnels ;
- `GET /api/products/featured` — jusqu’à 4 produits `is_featured = 1` et visibles ;
- `GET /api/products/:id` — détail ;
- `GET /api/products/details/:id` — alias rétro-compatible du détail.

Listes : `products.is_visible = 1`. Détail : `WHERE id = ? AND is_visible = 1`. Produit masqué ou inexistant : HTTP 404 `{"error":"Produit non trouvé"}`.

Variantes publiques : `is_active = 1`. Un produit masqué n’atteint pas la requête variantes. JSON variante public : `{ id, variant_id, printful_variant_id, price, size, color, image }`. Pas de SKU, pas de `is_active`, pas de `is_visible`, pas de secret.

Validation `productId` : `/^\d+$/` ; `Number` ; `Number.isSafeInteger` ; `> 0`. Invalide → HTTP 400 `{"error":"ID de produit invalide"}`.

Recherche : `q` trim ; maximum 100 caractères ; maximum 8 termes distincts ; `sort` whitelist (`relevance`, `price_asc`, `price_desc`, `newest`, `name_asc`) ; SQL paramétré ; `ORDER BY` issu d’une whitelist interne ; **wildcard initial `LIKE '%…%'` toujours présent** ; champs name / description / brand / category / color / size (variantes actives). Frontend : `searchInput` / `submittedSearch` ; pas de requête réseau à chaque frappe (confirmé par inspection du code vivant, **non** re-mesuré dans Network lors de cette fermeture).

Les prix et identifiants publics n’ont **pas** d’autorité au checkout : le serveur relit variante, prix, visibilité et activité dans sa propre DB.

### Validations production (20 août 2026)

Lecture seule. Aucune modification DB.

Produit masqué contrôlé : `id = 33`, name = Tourbillon, `is_visible = 0`.

- `GET /api/products/33` → `{"error":"Produit non trouvé"}`
- `GET /api/products/details/33` → `{"error":"Produit non trouvé"}`

Les deux routes détail appliquent la protection.

Validation ID :

- `GET /api/products/abc` → `{"error":"ID de produit invalide"}`
- `GET /api/products/1.5` → `{"error":"ID de produit invalide"}`
- `GET /api/products/0` → `{"error":"ID de produit invalide"}`

Recherche :

- `q` de 101 caractères → `{"error":"Recherche trop longue."}`
- `q` de 100 caractères → `[]` (HTTP 200, requête acceptée)

### Décisions / résidus acceptés (non bloquants)

`printful_variant_id` **demeure public**. Ce n’est pas un secret. Il reste techniquement requis par le frontend vivant (notamment `ProductDetail.jsx` / `CartContext` pour `GET /api/inventory/printful-stock/:id`). Le supprimer casserait ce contrat sans refonte de l’API inventory. P15 a déjà validé l’ID, exigé variante active + produit visible, ajouté limiter et cache, et retiré le proxy Printful arbitraire. L’exposition restante est un identifiant technique du **catalogue vendable déjà public**. **Résidu accepté. P15 n’est pas rouvert.**

Autres résidus non bloquants, réévaluables si le catalogue grandit :

1. `LIKE '%…%'` avec wildcard initial (toujours présent ; petit catalogue actuel) ;
2. absence de limiter spécifique `/api/products` (disponibilité / scraping d’un catalogue déjà public, **pas** une fuite de produits masqués) — aucun limiter créé dans P17 ;
3. `printful_variant_id` public (ci-dessus) ;
4. payload variantes relativement complet dans liste / featured (Shop / Home n’en consomment qu’une partie) ;
5. IDs produits séquentiels ; masqué et inexistant produisent le même 404 ; le catalogue visible est déjà listé publiquement.

### Statut final P17

P17 est **FERMÉ / COMPLET / VALIDÉ EN PRODUCTION**. Ce n’est **pas** une certification de conformité légale.

Fermeture **sans nouveau correctif technique** : les remédiations nécessaires existaient déjà ; les smoke tests production du 20 août 2026 confirment l’état vivant.

**P18** (wishlist), sévérité **MODÉRÉ**, est le **prochain chantier**.

**P12** demeure distinct : correctif déjà déployé ; validation runtime cron finale encore différée ; **non fermé** ici.

**P19** (Printful automatique du webhook) demeure distinct et **non fermé** ici.

**P20** (base de données et migrations) demeure distinct et **non fermé** ici.

**P23** (API de vérification du paiement) demeure distinct et **non fermé** ici.

---

## 2 septembre 2026 — Chantier P18 : wishlist (FERMÉ)

Le constat initial d’audit P18 reste figé dans `TECHNICAL_SECURITY_AUDIT.md`. Ce journal documente le diagnostic, la décision et la remédiation. Aucune certification de conformité légale n’est revendiquée.

P18 traite la **surface wishlist orpheline** : routes encore montées, auth présente, exécution cassée, aucune UI. Ce n’est **pas** une nouvelle feature favoris, **pas** P20 (schéma / migrations), **pas** P19 (Printful automatique du webhook).

P12, P19, P20 et P23 demeurent des chantiers distincts et ne sont pas fermés dans cette section.

### Constat initial

Le constat P18 gelé concernait notamment :

- les routes protégées par `verifyToken` ;
- le contrôleur comparait correctement le `customerId` demandé à `req.user.id` ;
- un utilisateur ne pouvait pas simplement accéder à la wishlist d’un autre ;
- le service travaillait au niveau produit seulement ;
- `variant_id` et `printful_variant_id` étaient ignorés ;
- le toggle n’était pas atomique ;
- le modèle attendait `req` pour `req.app.locals.db` ;
- le service n’envoyait jamais `req` ;
- les endpoints échouaient donc probablement avec une erreur 500 ;
- aucun appel wishlist dans `src` ni dans `dist` ;
- fonctionnalité orpheline et cassée ;
- correction future proposée : réparer et réintégrer, **ou** désactiver explicitement.

### Diagnostic vivant

La wishlist n’était pas une fonctionnalité vivante du produit :

- aucune UI wishlist active ;
- aucun appel frontend dans `src` ;
- aucune route React wishlist ;
- aucun besoin produit court terme trouvé dans la documentation canonique pertinente.

Les routes restaient montées :

- `GET /api/wishlist/:customerId`
- `POST /api/wishlist/toggle`

derrière `verifyToken`. L’autorisation contrôleur bloquait l’accès à la wishlist d’un autre utilisateur (`customerId` demandé === `req.user.id`). Pas d’IDOR simple confirmé. Le chemin **autorisé** (propre wishlist du propriétaire) était cassé : `wishlistService` appelait le modèle sans `req`, alors que le modèle faisait `req.app.locals.db` avec `req === undefined`. Cette conclusion 500 est **statique** (diagnostic) ; ce 500 **n’a pas été observé** comme test production lors de la fermeture.

Écarts supplémentaires constatés au diagnostic (devenus sans surface runtime après désactivation) : granularité code = produit vs DATA_MODEL = variante ; toggle non atomique ; validation IDs faible (`Number` / `isNaN`) ; possibilité théorique d’ajouter un produit masqué si la feature avait été réparée naïvement. Ce ne sont **pas** des vulnérabilités actives accessibles une fois l’API retirée.

### Décision

**DÉSACTIVER EXPLICITEMENT.** Ne pas réparer ni réintégrer une feature inutilisée. Ne pas transformer P18 en nouvelle feature.

### Correctif

**Commit :** `d550fee` (`d550feed9cd2c191500a8c45468eeccd702e9727`) — `fix(wishlist): disable orphaned wishlist API`

**Fichiers :**

- `server/app.js` : retrait de `{ default: wishlistRoutes }` et de `import('./routes/wishlistRoutes.js')` du `Promise.all` dynamique (alignement conservé) ; retrait de `app.use('/api/wishlist', wishlistRoutes)`.
- Suppressions : `server/routes/wishlistRoutes.js`, `server/controllers/wishlistController.js`, `server/services/wishlistService.js`, `server/models/wishlistModel.js`.

Aucun 410 spécifique. Aucun placeholder. Les requêtes `/api/wishlist/...` tombent dans le handler global existant `app.use(notFound)`.

**Non modifié :** DB ; table `wishlist` / `wishlists` ; migrations ; frontend ; auth / `verifyToken` ; checkout ; Printful ; inventory ; DATA_MODEL ; audit figé. Le nettoyage éventuel de la table appartient à **P20** ou à une décision produit future. P20 n’est pas fermé ici.

### Validations techniques avant commit

- aucun consommateur wishlist externe dans `server` / `src` ;
- aucune référence runtime wishlist restante après suppression ;
- `node --check server/app.js` : OK ;
- `npm run build` : OK, 1747 modules transformed ;
- `git diff --check` : OK ;
- `Promise.all` dynamique resté correctement aligné ;
- seuls `server/app.js` et les quatre fichiers wishlist ont changé.

### Validations production

Après déploiement :

- `GET /api/wishlist/1` → HTTP 404 `{"error":"Not Found","path":"/api/wishlist/1","method":"GET"}`
- `POST /api/wishlist/toggle` avec body `{}` → HTTP 404 `{"error":"Not Found","path":"/api/wishlist/toggle","method":"POST"}`

GET et POST sont désactivés. Le handler 404 global est l’autorité. Aucun traitement wishlist. Aucun accès DB wishlist.

### Statut final P18

P18 est **FERMÉ / COMPLET / VALIDÉ EN PRODUCTION**. Remédiation : **désactivation explicite**, pas réparation / réintégration. Ce n’est **pas** une certification de conformité légale.

**P19** (Printful automatique du webhook), sévérité **MODÉRÉ**, est le **prochain chantier**.

**P12** demeure distinct : correctif déjà déployé ; validation runtime cron finale encore différée ; **non fermé** ici.

**P20** (base de données et migrations) demeure distinct : la table wishlist / wishlists n’a pas été supprimée ; toute décision de conservation, migration ou nettoyage du schéma **n’est pas** prise ici.

**P23** (API de vérification du paiement) demeure distinct et **non fermé** ici.

---

## 2 septembre 2026 — Chantier P19 : Printful automatique du webhook (FERMÉ)

Le constat initial d’audit P19 reste figé dans `TECHNICAL_SECURITY_AUDIT.md`. Ce journal documente le diagnostic, la décision et la remédiation. Aucune certification de conformité légale n’est revendiquée.

P19 traite l’**automatisation Printful après paiement Stripe** dans le webhook. Sévérité audit : **MODÉRÉ**. Risque d’implémentation traité comme **ÉLEVÉ** (effet externe potentiellement coûteux). Ce n’est **pas** une nouvelle architecture de fulfillment, **pas** P14 (shipping), **pas** P15 (inventaire), **pas** P20 (migrations / schéma).

P12, P20 et P23 demeurent des chantiers distincts et ne sont pas fermés dans cette section. P3, P4, P5, P13, P14, P15, P16, P17 et P18 ne sont pas rouverts.

### Constat initial

Le constat P19 gelé concernait notamment :

- le bloc ne s’exécutait que si `usedFallbackItems === true` ;
- il ne s’exécutait pas pour une commande normale ayant déjà ses `order_items` ;
- `PRINTFUL_AUTOMATIC_ORDER` était désactivé ;
- `mapCartToPrintfulVariants` cherchait `item.id` ;
- `mapCartToPrintfulVariants` utilisait incorrectement `getDb.query` alors que `getDb` est une fonction ;
- `createPrintfulOrder` centralisé n’envoyait pas `X-PF-Store-Id` ;
- le chemin échouerait probablement s’il était activé ;
- `confirm:false` montrait l’intention d’un brouillon Printful ;
- décision historique : ne pas activer avant correction et validation.

### Diagnostic vivant

Les remédiations précédentes avaient rendu ce chemin encore plus clairement obsolète.

**P5 :** plus de reconstruction `order_items` depuis les metadata ; `usedFallbackItems` fixé à `false` ; une commande sans vrais `order_items` ne peut pas devenir `paid`.

**P13 :** les nouvelles Checkout Sessions n’envoient plus `metadata.shipping` ni `metadata.cart_items`. Le bloc P19 en dépendait encore.

Le bloc était donc **inatteignable** sur le chemin normal et s’appuyait sur des contrats qui n’étaient plus autoritaires. Les vrais `order_items` portent déjà `printful_variant_id`. Le recipient autoritaire est le snapshot de commande, pas les metadata Stripe.

Diagnostic supplémentaire (sans surface active une fois le bloc retiré) : pas d’`external_id` déterministe ; pas d’idempotence Printful robuste ; pas de retry contrôlé ; timeout ambigu possible ; crash après POST avant persistance = draft orphelin théorique ; `confirm:false` sans chemin de confirmation ; pas de vraie visibilité admin fulfillment ; logs du bloc potentiellement riches (réponse Printful) ; coupler cet effet externe au webhook n’était pas justifié par une exigence produit actuelle.

Le risque réel était un **code mort dangereux à réactiver** (flag env / changement de `usedFallbackItems`), pas une automatisation vivante.

### Décision

**GARDER DÉSACTIVÉ ET RETIRER.** Ne pas réparer l’automatisation dans le webhook. Ne pas créer une nouvelle architecture de fulfillment. Ne créer aucune commande Printful.

### Correctif

**Commit :** `3dc825d` (`3dc825d209cb3a44a5f2315e2469eb24e5b0da6b`) — `fix(webhook): remove dead Printful order automation`

**Fichiers :** `server/controllers/webhookController.js`, `server/services/printfulService.js`

`webhookController.js` : retrait de l’import `mapCartToPrintfulVariants` / `createPrintfulOrder` ; suppression de `normalizeMetaCartItem`, du parsing mort `metadata.cart_items`, de `usedFallbackItems`, et du bloc Printful automatique (flag `PRINTFUL_AUTOMATIC_ORDER`, `pfSource`, recipient, `createPrintfulOrder`, `confirm:false`, `UPDATE printful_order_id`, logs associés). `shippingMeta` **conservé** (fallback email legacy). Lecteur `metadata.cart_id` **conservé** (verrouillage panier).

`printfulService.js` : suppression de `mapCartToPrintfulVariants` et `createPrintfulOrder` ; retrait de l’import `getDb` devenu inutilisé. Cache / in-flight / `getPrintfulVariantAvailability` / `X-PF-Store-Id` inventory (**P15**) **intacts**. Shipping Printful (**P14**) **non touché**.

**Invariants Stripe / paiement non modifiés :** `constructEvent` ; signature ; `INSERT IGNORE` / idempotence `stripe_events` ; résolution order ; gate `orderHasItems` ; `WEBHOOK_ORDER_ITEMS_MISSING` ; transaction ; `beginTransaction` ; `FOR UPDATE` ; `pending → paid` ; `paid_at` ; `order_status_history` ; reconciliation ; panier `ordered` ; `markAbandonedRecovered` ; `upsertStripeEvent` ; réponses webhook. Le comportement **PAYMENT** reste identique.

**Non modifié :** DB ; `orders.printful_order_id` ; migrations ; `.env` ; checkout ; auth ; routes ; inventory P15 ; shipping P14. Aucun `POST /orders` Printful pendant les validations.

### Validations techniques avant commit

Workspace initial propre. Aucun consommateur inattendu. Runtime : plus de `PRINTFUL_AUTOMATIC_ORDER`, `mapCartToPrintfulVariants`, `normalizeMetaCartItem`, `usedFallbackItems`. Export service `createPrintfulOrder` retiré. `node --check` webhook et printfulService : OK. `npm run build` : OK, 1747 modules transformed. Aucun test mock webhook dans `package.json`. `git diff --check` : OK.

### Validations production (non destructives)

1. **Déploiement Hostinger :** le commit déployé est `3dc825d` — `fix(webhook): remove dead Printful order automation`. Le retrait P19 est la version en production.

2. **Smoke test non destructif :** `POST https://flippinmaple.com/webhook/stripe` sans header `stripe-signature` → HTTP 400 `Webhook Error: No stripe-signature header value was provided.` La route webhook est vivante ; la signature reste exigée **avant** tout traitement métier ; aucun paiement modifié ; **aucune commande Printful créée**. Ce test **n’exécute pas** le chemin `paid`.

### Résidus hors scope

1. `ordersController.createPrintfulOrder(req, res)` : handler homonyme **non monté** dans `ordersRoutes.js`. Non touché dans P19. **Pas** une surface publique active.

2. `printfulSync` / mapping de statuts Printful → `orders.status` : non modifié.

3. Architecture fulfillment future (si le produit l’exige un jour) : workflow explicite / job / admin **hors webhook**, items autoritaires, snapshot shipping, `external_id` déterministe, `printful_order_id`, état fulfillment séparé de `orders.status`, retry contrôlé, crash recovery, logs sans PII, aucun appel réseau dans une TX MySQL. Peut dépendre de **P20**. Non implémentée ici.

### Statut final P19

P19 est **FERMÉ / COMPLET / VALIDÉ EN PRODUCTION** (validation **non destructive**). Remédiation : **garder désactivé et retirer**. Le webhook Stripe ne contient plus aucun chemin de création automatique de commande Printful. Ce n’est **pas** une certification de conformité légale.

**P20** (base de données et migrations), sévérité **MODÉRÉ**, est le **prochain chantier**.

**P12** demeure distinct : correctif déjà déployé ; validation runtime cron finale encore différée ; **non fermé** ici.

**P23** (API de vérification du paiement) demeure distinct et **non fermé** ici.

---

## 3 septembre 2026 — Chantier P20 : base de données et migrations (EN COURS)

Le constat initial d’audit P20 reste figé dans `TECHNICAL_SECURITY_AUDIT.md`. Ce journal documente le diagnostic, l’inventaire production read-only, la réparation du runner et le baseline production de `schema_migrations`. Aucune certification de conformité légale n’est revendiquée.

P20 traite la **base de données et les migrations**. Sévérité audit : **MODÉRÉ**. Risque d’implémentation : **ÉLEVÉ** (schéma MySQL production, contraintes, index, données existantes, historique). Ce n’est **pas** P12, **pas** P18 applicatif (wishlist déjà désactivée), **pas** P19 (Printful webhook déjà retiré), **pas** P23.

P12 et P23 demeurent des chantiers distincts et ne sont pas fermés dans cette section. P3–P11 et P13–P19 ne sont pas rouverts.

**P20 n’est pas fermé.** P20-C et P20-D1 à P20-D4 et P20-D6 sont **validés en production**. P20-D5 est **fermé** (analyse terminée, aucune mutation). Le chantier global P20 n’est pas clos.

### Portée / statut

| Étape | Objet | Statut |
| --- | --- | --- |
| P20-A | Inventaire production READ-ONLY | **Terminé** (aucune mutation) |
| P20-B | Runner de migrations sécurisé | **Terminé techniquement** (`77e0d86`) |
| P20-C | Création + baseline explicite de `schema_migrations` | **Terminé / validé en production** |
| P20-D1 | FK contradictoire `order_items.order_id` | **Terminé / validé en production** (`1dbb6fe`) |
| P20-D2 | FK redondante `order_items.variant_id` | **Terminé / validé en production** (`59020d6`) |
| P20-D3 | FK redondante `order_status_history.order_id` | **Terminé / validé en production** (`86bbd1c`) |
| P20-D4 | Identifiants Stripe `orders` UNIQUE + `utf8mb4_bin` | **Fermé / validé en production** (`5fc9bf8`) |
| P20-D5 | `carts.uq_user_open` UNIQUE(`user_id`, `status`) | **Fermé / analyse terminée / aucune migration justifiée** |
| P20-D6 | Retrait table legacy `wishlists` | **Fermé / validé en production** (`11cc279`) |
| P20-D7+ | Autres divergences ciblées (DDL runtime `logs`, collations, DATA_MODEL restante) | **À faire** |

`DATA_MODEL.md` documente aussi, depuis P20-D4, les identifiants Stripe uniques `utf8mb4_bin` ; depuis P20-D5 la portée réelle de `uq_user_open` (inchangée) et le caractère legacy/inactif de `carts` ; depuis P20-D6 l’absence de table `wishlists` (retirée). Les décisions P20-D restantes (DDL `logs`, collations, etc.) ne sont pas encore prises.

### Stratégie retenue

1. Ne jamais rejouer aveuglément les migrations historiques Git sur la production existante.
2. P20-A — inventaire réel production, lectures seules.
3. P20-B — runner sécurisé, sans créer `schema_migrations` et sans exécuter `npm run migrate`.
4. P20-C — baseline explicite de `schema_migrations`, seulement après backup/restauration vérifiés et autorisation. Les deux fichiers historiques doivent être **marqués comme déjà absorbés**, jamais rejoués. **Réalisé le 3 septembre 2026.**
5. Ensuite seulement, traiter les divergences ciblées de schéma.
6. Nettoyer les résidus uniquement après preuve de non-utilisation et décision explicite.
7. Documenter et valider chaque mutation séparément.

### P20-A — Inventaire production read-only

Aucune mutation DB, aucune migration, aucun `ALTER` / `CREATE` / `DROP` / `DELETE`. Aucun `npm run migrate`.

**Base production observée :** `u601077843_flippinmaple`.

**Constats :**

- 27 tables, toutes InnoDB ;
- aucune table `schema_migrations` ;
- collations mixtes : `utf8mb4_general_ci`, `utf8mb4_unicode_ci`, `utf8mb4_uca1400_ai_ci` ;
- le schéma production a évolué **au-delà** des deux fichiers historiques sous `db/migrations/`.

**Migrations Git historiques :**

- `2025-10-18_stripe_events.sql` — mélange `CREATE` et upgrades historiques non idempotents ; plusieurs statements ; `ALTER` susceptibles d’échouer si rejoués ; **ne représente plus** le schéma production actuel de `stripe_events` (`received_at`, `order_id`, etc.). **Ne doit pas être rejoué** sur la prod actuelle.
- `2026-08-15_checkout_idempotency.sql` — correspond fonctionnellement à la table actuelle, mais la table **existait déjà** en production au moment de P20-A. **Baseliné en P20-C** (SQL non rejoué).

**Dérives / résidus observés, non corrigés :**

- `order_items.order_id` : deux FK vers `orders.id` avec règles DELETE contradictoires (`RESTRICT` et `CASCADE`) — **corrigé ensuite en P20-D1** ;
- `order_items.variant_id` : deux FK équivalentes vers `product_variants.id` — **corrigé ensuite en P20-D2** ;
- `order_status_history.order_id` : deux FK équivalentes vers `orders.id` — **corrigé ensuite en P20-D3** ;
- `orders.stripe_session_id` et `orders.stripe_payment_intent_id` : index **NON UNIQUE** ; les contrôles read-only n’ont trouvé aucun doublon non vide au moment de P20-A — **corrigé ensuite en P20-D4** ;
- `carts` : `UNIQUE(user_id, status)` — unicité par statut, pas seulement pour `open` — **analysé ensuite en P20-D5 ; aucune mutation** ;
- table résiduelle `wishlists` encore présente après désactivation de l’API P18 — **retirée ensuite en P20-D6** ;
- `logs` encore créée au runtime (`CREATE TABLE IF NOT EXISTS`) ;
- collations mixtes ;
- d’autres tables / relations portent une dérive historique à examiner séparément.

Aucune de ces dérives n’a été corrigée pendant P20-A. Aucune normalisation de collation. Aucune table résiduelle supprimée. Aucune FK modifiée.

Ces sujets restent des **constats / travaux P20 futurs** sauf le conflit `order_items.order_id` RESTRICT/CASCADE (P20-D1), la duplication `order_items.variant_id` (P20-D2), la duplication `order_status_history.order_id` (P20-D3), les identifiants Stripe non uniques (P20-D4), `uq_user_open` (P20-D5, non muté) et la table `wishlists` (P20-D6). Ils ne sont **pas** fermés ici : collations, DDL runtime `logs`.

### P20-B — Runner de migrations

**Commit :** `77e0d86` — `fix(db): harden migration runner`

**Fichier :** `scripts/run-migrations.js`

**Ancien problème :** import `{ pool }` depuis `server/db.js` (export inexistant) ; exécution de chaque fichier SQL complet via le pool ; continue-on-error ; aucun suivi ; aucun checksum ; aucun verrou. Un simple « fix d’import » suivi d’un `npm run migrate` sur une DB existante aurait pu rejouer les SQL historiques.

**Nouveau comportement :**

- `import 'dotenv/config'` ;
- utilise `resolveDbConfig()` ;
- connexion MySQL dédiée `mysql2/promise` — **pas** le pool global applicatif ;
- `multipleStatements: true` **uniquement** sur cette connexion dédiée ; `server/dbConfig.js` **non modifié** ;
- verrou advisory `GET_LOCK` (timeout 10 s) ; `RELEASE_LOCK` dans le `finally` ;
- exige que `schema_migrations` existe déjà ; **ne la crée pas** ;
- si absente : `Migration baseline missing: schema_migrations does not exist. Refusing to run migrations.` puis code de sortie non zéro ;
- fichiers `.sql` sous `db/migrations/` triés lexicalement ;
- SHA-256 du contenu exact UTF-8 ;
- compare filename + checksum aux lignes enregistrées ;
- checksum divergent → abort immédiat, aucune SQL pending exécutée ;
- déjà appliquée + checksum identique → skip ;
- pending → exécute le SQL, puis `INSERT` `(filename, checksum)` **seulement après succès** ;
- première erreur SQL → abort ; plus de continue-on-error ;
- connexion fermée dans le `finally` ;
- aucune transaction présentée comme rollback atomique du DDL.

**Contrat alors prévu pour P20-C (`schema_migrations`) — réalisé ensuite :**

- `filename VARCHAR(255) PRIMARY KEY`
- `checksum CHAR(64) NOT NULL`
- `applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`

**P20-B n’a créé aucune table. P20-B n’a exécuté aucune migration. `npm run migrate` n’a pas été exécuté. La production n’a subi aucune mutation.**

### Validations P20-B

- `node --check scripts/run-migrations.js` : OK
- `npx eslint .\scripts\run-migrations.js` : code 0
- avertissement npm `Unknown env config "devdir"` observé, hors scope
- `git diff --check` : OK
- diff audité
- workspace propre après commit
- aucune connexion DB / aucun SQL / aucune migration exécutée pendant les validations

### Limites connues

Le DDL MySQL peut provoquer des commits implicites. Le runner **ne peut pas** garantir une atomicité complète entre l’exécution d’une migration DDL et l’enregistrement dans `schema_migrations`. Les futures migrations doivent être versionnées, contrôlées, aussi idempotentes / récupérables que possible, et appliquées avec un backup approprié.

Les contraintes Hostinger (ALTER souvent 1044) restent valides. P20-B n’accorde aucun nouveau droit DDL. P20-C n’en accorde pas non plus.

### P20-C — Baseline production de schema_migrations

Base : `u601077843_flippinmaple`.

**Prérequis de sécurité confirmés avant mutation :**

- sauvegarde Hostinger la plus récente confirmée : **2 septembre 2026 à 23:25** ;
- Hostinger affiche une option permettant de restaurer cette base depuis cette sauvegarde ;
- une restauration Hostinger avait déjà réussi historiquement sur ce projet ; P20-C s’est appuyé sur la sauvegarde récente ci-dessus ;
- autorisation explicite de Martin obtenue séparément avant (1) la création de `schema_migrations` et (2) l’insertion des deux lignes de baseline ;
- aucun secret utilisé ni documenté.

**Checksums des migrations historiques**, calculés localement avec PowerShell `Get-FileHash -Algorithm SHA256`, puis vérifiés avec le mécanisme Node du runner (`fs.readFileSync(..., 'utf8')` + `crypto.createHash('sha256').update(content, 'utf8')`). Résultats identiques :

- `2025-10-18_stripe_events.sql` → `ee11ca63afa96831f73d19d08dd5d93dc4b2487c497930ae0b812cebdbcfd1dc`
- `2026-08-15_checkout_idempotency.sql` → `e38f7d6e18c39201dece9816c287f5cf2fc523f80cd0bf1f3832e66d1af0efff`

**Validation avant mutation (read-only `information_schema`) :** `schema_migrations` n’existait pas dans `u601077843_flippinmaple`.

**Première mutation :** création explicite de `schema_migrations`. Contrat réel confirmé après création :

- `filename VARCHAR(255) NOT NULL PRIMARY KEY`
- `checksum CHAR(64) NOT NULL`
- `applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
- Engine : InnoDB
- Charset : utf8mb4

Validation read-only après création : table vide ; `migration_count = 0`.

**Deuxième mutation — baseline :** insertion de **deux lignes uniquement** dans `schema_migrations`.

- aucun contenu des fichiers historiques exécuté ;
- aucun `ALTER` historique ;
- aucun `CREATE TABLE` historique ;
- aucun `npm run migrate` ;
- les migrations ont seulement été **marquées comme déjà absorbées**.

Lignes (`applied_at = 2026-09-03 11:53:07` pour les deux) :

1. `filename` = `2025-10-18_stripe_events.sql` ; `checksum` = `ee11ca63afa96831f73d19d08dd5d93dc4b2487c497930ae0b812cebdbcfd1dc`
2. `filename` = `2026-08-15_checkout_idempotency.sql` ; `checksum` = `e38f7d6e18c39201dece9816c287f5cf2fc523f80cd0bf1f3832e66d1af0efff`

**Validation après baseline (read-only) :** deux lignes présentes ; `LENGTH(checksum) = 64` pour les deux ; comparaison exacte contre les checksums locaux : `checksum_matches = 1` pour les deux. Le baseline enregistré correspond exactement aux fichiers Git actuels.

**Runner :** `npm run migrate` **n’a pas** été exécuté contre la production. Tentative locale uniquement de résoudre la config via `resolveDbConfig()` : échec **avant toute connexion** (`DB config missing (host/user/password/database)` ; aucun `.env` local / aucune variable DB dans ce shell). Aucune connexion MySQL ouverte par cette tentative. Aucun secret créé ou lu. Aucun `.env` local créé pour forcer un test. Le runner **n’est pas** présenté comme testé contre la prod pendant P20-C.

Git est resté propre après les mutations P20-C (aucun commit applicatif dans cette étape).

**P20-C est TERMINÉ / VALIDÉ EN PRODUCTION** pour : création de `schema_migrations` ; baseline des deux migrations historiques ; correspondance exacte des checksums. Cela **ne ferme pas** P20.

Aucune divergence de schéma listée en P20-A n’a été modifiée dans P20-C.

**Rollback / réversibilité.** P20-C n’a modifié aucune table métier ni aucune donnée métier. Les seules mutations ont été (1) la création de la nouvelle table technique `schema_migrations` et (2) l’insertion de deux lignes de baseline. Tant qu’aucune migration future n’a été appliquée en s’appuyant sur ce registre, un rollback ciblé de P20-C consiste à supprimer `schema_migrations`. Ce rollback ciblé serait préférable à une restauration complète de la base : une restauration Hostinger pourrait écraser des données métier créées après la sauvegarde. Toute suppression éventuelle exige elle aussi une autorisation explicite. Une fois que de futures migrations auront été enregistrées ou appliquées via `schema_migrations`, ce rollback simpliste ne sera plus valide ; il faudra alors un plan spécifique à l’état atteint.

### Verrou temporaire de la surface publique avant P20-D

Mesure transversale temporaire pendant la poursuite de l’audit / P20-D. **Ce n’est pas** une nouvelle divergence de schéma, **pas** un sous-chantier P20-C/P20-D, **pas** une déclaration que tous les risques de sécurité sont corrigés.

**Raison :** réduire temporairement l’accès public à Flippin’ Maple sans couper les health checks Hostinger ni les webhooks Stripe.

**Commit :** `8a1f159` — `feat(security): add temporary site basic auth`

**Fichier :** `server/app.js`

**Comportement :** protection active uniquement si `SITE_BASIC_AUTH_ENABLED=true`. Frontend protégé. Toutes les routes `/api/...` protégées. Credentials absents alors que la protection est activée → fail closed HTTP 503. Credentials Basic invalides ou absents → HTTP 401 + `WWW-Authenticate: Basic realm="Flippin Maple Private"`. Comparaison via `timingSafeEqual`. Aucun bypass IP, localhost, User-Agent ou query string. `multipleStatements`, DB, parser raw Stripe et routes métier **non touchés**.

Variables utilisées (noms seulement, **aucune valeur** documentée) : `SITE_BASIC_AUTH_ENABLED`, `SITE_BASIC_AUTH_USERNAME`, `SITE_BASIC_AUTH_PASSWORD`.

**Exemptions :** `/health`, `/readiness`, `/webhook` et `/webhook/...`.

**Déploiement :** commit `8a1f159` poussé sur `main` ; déploiement Hostinger confirmé `Completed` / `Current` ; les trois variables ont ensuite été appliquées en production. Aucun secret écrit ici.

**Validations production :**

1. Navigation privée `https://flippinmaple.com` → fenêtre native Basic Auth ; après credentials valides, site fonctionnel.
2. `GET https://flippinmaple.com/api/products` sans credentials → HTTP 401, `WWW-Authenticate: Basic realm="Flippin Maple Private"`, body `Authentication required`.
3. `GET https://flippinmaple.com/readiness` sans credentials → HTTP 200 `{"ok":true}`.
4. `POST https://flippinmaple.com/webhook/stripe` sans `stripe-signature` → HTTP 400 `Webhook Error: No stripe-signature header value was provided.` Basic Auth ne bloque pas le webhook ; la signature Stripe reste exigée ; aucun traitement métier Stripe déclenché par ce smoke test.

**Statut :** verrou temporaire **VALIDÉ EN PRODUCTION**. P20 reste **EN COURS**. P20-C reste terminé. P20-D1 à P20-D6 ont depuis été clos / traités ; P20-D7 est la prochaine phase de schéma.

**Rollback / retrait futur :** pour rouvrir temporairement le site, désactiver explicitement `SITE_BASIC_AUTH_ENABLED` dans Hostinger, puis appliquer / redémarrer selon le mécanisme Hostinger. Ne pas supprimer username/password des variables **avant** d’avoir désactivé le flag : un flag encore `true` sans credentials produit un fail-closed 503. Après la fin de l’audit, décider séparément si le middleware est retiré du code ou conservé désactivé comme mécanisme opérationnel. Toute réouverture publique doit être validée séparément.

### P20-D1 — FK contradictoire `order_items.order_id`

**P20-D1 est TERMINÉ / VALIDÉ EN PRODUCTION.** Ce n’est **pas** P20-D2. P20 global reste **EN COURS**.

**Analyse.** Production `u601077843_flippinmaple`, table `order_items` : deux FK sur la même relation `order_id → orders.id` :

- `fk_order` — ON UPDATE RESTRICT, ON DELETE RESTRICT
- `fk_order_items_order` — ON UPDATE RESTRICT, ON DELETE CASCADE

Règles DELETE contradictoires. `order_items` est le snapshot historique / contractuel des lignes achetées. Aucune route HTTP DELETE de commande ; aucun `DELETE FROM orders` / `DELETE FROM order_items` dans le code applicatif ; le webhook ne doit ni supprimer ni réécrire les `order_items` existants. L’audit exige une décision explicite avant toute suppression de snapshots.

**Décision :** conserver `fk_order` (RESTRICT) et retirer seulement `fk_order_items_order` (CASCADE). Les FK `variant_id` (`fk_order_items_product_variant`, `order_items_ibfk_2`) **non touchées**.

**Commit technique :** `1dbb6fe` — `fix(db): remove contradictory order items cascade fk`

**Fichier :** `db/migrations/2026-09-03_order_items_order_fk_restrict.sql`

**Application production :** backup manuel Hostinger effectué et confirmé restaurable **avant** ALTER ; ALTER exécuté **manuellement** avec autorisation explicite. `npm run migrate` **n’a pas** été utilisé. Seule `fk_order_items_order` a été supprimée. Aucune donnée métier modifiée.

**Validation `information_schema` après mutation :**

- `fk_order` existe toujours : RESTRICT / RESTRICT
- `fk_order_items_order` est absente
- `fk_order_items_product_variant` existe toujours : RESTRICT / CASCADE
- `order_items_ibfk_2` existe toujours : RESTRICT / CASCADE

**`schema_migrations` :** la ligne a été ajoutée **explicitement après succès** (pas par le runner) :

- `filename` = `2026-09-03_order_items_order_fk_restrict.sql`
- `checksum` = `7893970049bb34932b2dbbab6fb864f4fa941d06f4292d4d0b4262e327b4f874`
- `LENGTH(checksum) = 64`
- `checksum_matches = 1`
- `applied_at = 2026-09-04 01:15:00`

### P20-D2 — FK redondante `order_items.variant_id`

**P20-D2 est TERMINÉ / VALIDÉ EN PRODUCTION.** Ce n’est **pas** P20-D3. P20 global reste **EN COURS**.

**Analyse.** Production `u601077843_flippinmaple`, table `order_items` : deux FK **strictement équivalentes** sur `variant_id → product_variants.id` :

- `fk_order_items_product_variant` — ON UPDATE RESTRICT, ON DELETE CASCADE
- `order_items_ibfk_2` — ON UPDATE RESTRICT, ON DELETE CASCADE

Index `idx_product_variant_id` sur `order_items.variant_id` confirmé. Aucune dépendance runtime aux noms de ces contraintes.

**Décision :** conserver la FK descriptive `fk_order_items_product_variant` ; retirer uniquement `order_items_ibfk_2`. Ne toucher à aucun index ni donnée. `fk_order` non touchée.

**Commit technique :** `59020d6` — `fix(db): deduplicate order items variant fk`

**Fichier :** `db/migrations/2026-09-04_order_items_variant_fk_deduplicate.sql`

**Backup :** le backup manuel Hostinger disponible avait été créé plus tôt dans la même séquence, **avant P20-D1**. Hostinger limite les backups manuels à un par 24 h. P20-D2 n’a **pas** eu un nouveau backup manuel distinct. Aucune restauration n’a été nécessaire.

**Application / observation phpMyAdmin.** Après autorisation explicite, une tentative

`ALTER TABLE u601077843_flippinmaple.order_items DROP FOREIGN KEY order_items_ibfk_2;`

a été exécutée. phpMyAdmin a ensuite affiché **#1091** (contrainte `order_items_ibfk_2` introuvable). Cette tentative **n’est pas** documentée comme un ALTER « réussi ». La cause exacte du #1091 **n’est pas inventée** ici (race, message tardif, état déjà absent, etc.). `npm run migrate` **n’a pas** été utilisé.

**État cible validé en lecture seule immédiatement après :**

- `information_schema.KEY_COLUMN_USAGE` : `fk_order` présente ; `fk_order_items_product_variant` présente ; `order_items_ibfk_2` **absente**
- `SHOW INDEX` : `idx_product_variant_id` existe toujours sur `variant_id`
- `information_schema.REFERENTIAL_CONSTRAINTS` : `fk_order_items_product_variant` toujours présente, ON UPDATE RESTRICT, ON DELETE CASCADE

Donc **l’état cible P20-D2 est atteint et validé en production**. Le moment / mécanisme exact de la disparition de `order_items_ibfk_2` ne doit pas être surinterprété à cause du #1091.

**`schema_migrations` :** la ligne a été ajoutée **explicitement après validation de l’état cible** (pas par le runner) :

- `filename` = `2026-09-04_order_items_variant_fk_deduplicate.sql`
- `checksum` = `f055c65bc3efe798a0fbb731697fe6b8a2d118e1cb3b19c8aa8335d7f993b642`
- `LENGTH(checksum) = 64`
- `checksum_matches = 1`
- `applied_at = 2026-09-04 01:49:21`

### P20-D3 — FK redondante `order_status_history.order_id`

**P20-D3 est TERMINÉ / VALIDÉ EN PRODUCTION.** Ce n’est **pas** P20-D4. P20 global reste **EN COURS**.

**Analyse.** Production `u601077843_flippinmaple`, table `order_status_history` : deux FK **strictement équivalentes** sur `order_id → orders.id` :

- `fk_status_history_order` — ON UPDATE RESTRICT, ON DELETE CASCADE
- `order_status_history_ibfk_1` — ON UPDATE RESTRICT, ON DELETE CASCADE

Index `idx_status_order_id` sur `order_status_history.order_id` confirmé. Aucune référence runtime active aux noms de ces contraintes.

**Décision :** conserver la FK descriptive `fk_status_history_order` ; retirer uniquement `order_status_history_ibfk_1`. Ne toucher à aucun index ni donnée.

**Commit technique :** `86bbd1c` — `fix(db): deduplicate order status history fk`

**Fichier :** `db/migrations/2026-09-04_order_status_history_fk_deduplicate.sql`

**Backup :** pas de nouveau backup manuel distinct. Hostinger limite les backups manuels à un par 24 h. Le backup manuel existant de cette séquence (créé avant P20-D1) reste le filet de sécurité disponible. Aucune restauration n’a été nécessaire.

**Application production :** après autorisation explicite, ALTER manuel ciblé :

`ALTER TABLE u601077843_flippinmaple.order_status_history DROP FOREIGN KEY order_status_history_ibfk_1;`

`npm run migrate` **n’a pas** été utilisé. Aucune donnée métier supprimée.

**Validation production après mutation :**

- `information_schema.REFERENTIAL_CONSTRAINTS` : `fk_status_history_order` présente, ON UPDATE RESTRICT, ON DELETE CASCADE ; `order_status_history_ibfk_1` **absente**
- `SHOW INDEX` : `idx_status_order_id` toujours présent

**`schema_migrations` :** la ligne a été ajoutée **explicitement après validation de l’état cible** (pas par le runner) :

- `filename` = `2026-09-04_order_status_history_fk_deduplicate.sql`
- `checksum` = `ff228bbd92b3d72b25b0ccfeb57df01f00e6d643fae2eaaebf20e19b4bbed97a`
- `LENGTH(checksum) = 64`
- `checksum_matches = 1`
- `applied_at = 2026-09-04 02:26:02`

### P20-D4 — Identifiants Stripe uniques sur `orders`

**P20-D4 est FERMÉ / VALIDÉ EN PRODUCTION.** Ce n’est **pas** P20-D5. P20 global reste **EN COURS**.

**Problème.** Production `u601077843_flippinmaple`, MariaDB 11.8.8, table `orders` (105 rows). `stripe_session_id` et `stripe_payment_intent_id` : `VARCHAR(255) NULL DEFAULT NULL`, collation `utf8mb4_general_ci`, index BTREE **NON UNIQUE** (`idx_orders_stripe_session`, `idx_orders_pi`). Le runtime résout déjà par `WHERE … = ? LIMIT 1` et un job utilisait `BINARY` sur `stripe_session_id` ; le schéma ne garantissait pas l’unicité exacte.

**Analyse (avant ALTER).** `stripe_session_id` : 52 NULL, 53 distincts non NULL, 0 doublon `utf8mb4_bin`, 0 whitespace invalide. `stripe_payment_intent_id` : 99 NULL, 6 distincts non NULL, 0 doublon `utf8mb4_bin`, 0 whitespace invalide. Cardinalité BINARY = cardinalité `utf8mb4_bin`. Aucune normalisation lowercase/uppercase dans le code.

**Décision.** Contrat : **un identifiant Stripe exact = au maximum une commande.** Colonnes inchangées en taille et nullabilité (`VARCHAR(255) NULL DEFAULT NULL`). Collation cible `utf8mb4` / `utf8mb4_bin`. Mêmes noms d’index, désormais UNIQUE. Plusieurs NULL restent permis. Aucun nettoyage / TRIM / DELETE de lignes. Les préconditions de migration échouent sur vide, whitespace-only, espaces en bord, ou doublon `utf8mb4_bin`.

**Commit technique :** `5fc9bf8` — `fix(db): enforce unique Stripe order identifiers`

**Fichier :** `db/migrations/2026-09-04_orders_stripe_identifiers_unique.sql`

**Backup / autorisation.** Backup Hostinger restaurable de 21h01 disponible **avant** mutation (non restauré). Aucune order créée ou modifiée depuis ce backup : `latest created_at = 2026-08-20 18:56:13`, `latest updated_at = 2026-08-20 18:56:34` ; 0 created / 0 updated depuis le backup. ALTER exécuté **manuellement** après autorisation explicite. `npm run migrate` **n’a pas** été utilisé. Aucun rollback testé.

**Validation production après ALTER.** Les deux colonnes : `VARCHAR(255) NULL DEFAULT NULL`, `utf8mb4_bin`. `idx_orders_stripe_session` et `idx_orders_pi` : UNIQUE, `NON_UNIQUE = 0`. Cardinalité inchangée : 105 orders ; session 52 NULL / 53 distincts non NULL ; PI 99 NULL / 6 distincts non NULL.

**`schema_migrations` :** ligne ajoutée **explicitement après validation** (pas par le runner) :

- `filename` = `2026-09-04_orders_stripe_identifiers_unique.sql`
- `checksum` = `72bba1d5ff92ecf88fc0a0ef961c96367abdf1671c20ed167d9b7c5610fab3cb`
- `LENGTH(checksum) = 64`
- `checksum_matches = 1`
- `applied_at = 2026-09-04 03:04:01`

### P20-D5 — `carts.uq_user_open` UNIQUE(`user_id`, `status`)

**P20-D5 est FERMÉ / ANALYSE TERMINÉE / AUCUNE MIGRATION JUSTIFIÉE.** Ce n’est **pas** P20-D6. P20 global reste **EN COURS**.

**Problème.** Le nom et la documentation historique (`uq_user_open`, « un seul panier open ») suggéraient une unicité limitée à `status = 'open'`. En production, `uq_user_open` est `UNIQUE(user_id, status)` : pour un `user_id` non NULL, au plus une ligne `open`, une `ordered` et une `abandoned`.

**Inventaire production.** `carts` : `id` int unsigned PK auto_increment ; `user_id` int unsigned NULL ; `status` enum(`open`,`ordered`,`abandoned`) NOT NULL DEFAULT `open` ; `idx_carts_user_id` NON UNIQUE ; `uq_user_open` UNIQUE(`user_id`, `status`). Table **vide** (0 rows). `abandoned_carts` : 3 rows ; `cart_id` non NULL = 0 ; distinct `cart_id` = 0.

**Dépendance FK.** `fk_ac_cart_id` : `abandoned_carts.cart_id` → `carts.id` ON UPDATE CASCADE ON DELETE SET NULL. Aucun trigger, aucune view, aucune routine stockée ne référence `carts`.

**Runtime.** Recherche `server/src/db` : aucun `INSERT INTO carts`, aucun writer qui crée une ligne `carts`, aucun passage vers `status='abandoned'`. Seul usage : `webhookController.js` lit `session.metadata?.cart_id` puis `UPDATE carts SET status='ordered' WHERE id=? AND status='open'` (chemin **legacy**). `77c1fda` a introduit/déplacé le lock panier vers le webhook. `7af49f0` a retiré `raw.cartId` / `raw.cart_id` du checkout, `cart_id` des nouvelles metadata Stripe, et le branchement `cart_id` vers `abandoned_carts`. Les nouvelles sessions n’envoient plus `cart_id` ; le webhook conserve le lecteur pour anciennes sessions.

**Historique Git du schéma.** Aucun `CREATE TABLE carts`, aucun `ALTER TABLE carts`, aucune création versionnée de `uq_user_open` trouvés. Le commit initial ne référence pas la table `carts` elle-même (seulement `abandoned_carts`).

**Décision.** **Ne pas modifier** `uq_user_open`. Table inactive dans le runtime actuel, vide, aucune donnée liée depuis `abandoned_carts`. Élargir ou restreindre une contrainte sur une table inactive n’apporte pas de bénéfice opérationnel et créerait un risque sans besoin métier actuel. Aucun ALTER, aucune migration, aucun `schema_migrations`, aucun backup requis (aucune mutation). Aucun commit technique P20-D5.

`carts` n’est **pas** déclarée supprimable immédiatement. Structure legacy/inactive ; le lecteur webhook et `fk_ac_cart_id` subsistent. Un éventuel retrait de `carts`, de la FK et du lecteur legacy est un **chantier séparé**, après preuve qu’aucun besoin historique ne reste.

### P20-D6 — Retrait de la table legacy `wishlists`

**P20-D6 est FERMÉ / VALIDÉ EN PRODUCTION.** Ce n’est **pas** P20-D7. P20 global reste **EN COURS**.

**Problème.** Après P18 (API wishlist désactivée), la table résiduelle `wishlists` subsistait en production sans consommateur runtime.

**Inventaire avant DROP.** Table présente ; 2 lignes ; dernière activité `2025-08-06 01:03:50` ; même `customer_id` ; 2 `variant_id` distincts. Colonnes : `id` int PK auto_increment ; `customer_id` int NULL ; `product_id` int NOT NULL ; `variant_id` int NOT NULL ; `printful_variant_id` bigint NOT NULL ; `created_at` / `updated_at` datetime. Index : PRIMARY(`id`) ; UNIQUE `unique_customer_variant`(`customer_id`, `variant_id`) ; index non unique `variant_id`. FK sortantes : `fk_wishlists_customer` (`customer_id` → `customers.id`, ON UPDATE RESTRICT, ON DELETE CASCADE) ; `fk_wishlists_variant` (`variant_id` → `product_variants.id`, ON UPDATE RESTRICT, ON DELETE CASCADE). Aucune FK sur `product_id`.

**Dépendances DB.** Aucune FK entrante vers `wishlists`. Aucun trigger sur `wishlists`. Aucun trigger / view / routine ne référence `wishlists`.

**Runtime.** Aucune référence à `wishlist` / `wishlists` / `wishlist_id` / `unique_customer_variant` dans `server/src/db`. Aucun writer. Aucun reader.

**Historique Git.** Aucun `CREATE TABLE wishlists` ni `ALTER TABLE wishlists` versionné trouvés. `7975a28` avait introduit une wishlist sur la table plurielle `wishlists`. `0ab4012` avait ensuite dérivé vers un modèle incompatible `wishlist` singulier / `user_id`. P18 a désactivé l’API.

**Données.** Les 2 lignes stockaient `product_id = 1` alors que leurs variantes actuelles appartenaient au `product_id = 33` (`product_id_matches = 0`). Une des deux avait aussi un `printful_variant_id` incohérent avec sa variante actuelle. Données historiques, partiellement incohérentes avec le catalogue. Aucune archive ni copie des 2 lignes n’a été créée dans le cadre de P20-D6.

**Décision.** Retirer la table `wishlists`. Pas d’autre table touchée. Les index et FK appartenant à `wishlists` partent avec le `DROP TABLE`.

**Commit technique :** `11cc279` — `fix(db): remove legacy wishlists table`

**Fichier :** `db/migrations/2026-09-04_drop_legacy_wishlists.sql` — `DROP TABLE IF EXISTS wishlists;`

**Checksum SHA-256 :** `930ae8b2bd2554a64026063bca1dea5fb47ae5e9d823805f7452e45e92b4ebff`

**Backup / autorisation.** Backup Hostinger d’hier 21h01 disponible et restaurable **avant** mutation (non restauré). Table inchangée depuis `2025-08-06`, donc ce backup contenait déjà les mêmes 2 lignes. DROP exécuté **manuellement** après autorisation explicite : `DROP TABLE IF EXISTS` sur `u601077843_flippinmaple.wishlists`. `npm run migrate` **n’a pas** été utilisé. Aucun rollback testé.

**Validation immédiate après DROP :** `table_exists = 0` ; `tracking_rows = 0`.

**Tracking.** Autorisation explicite ensuite. Ligne ajoutée **manuellement** dans `schema_migrations` (pas par le runner) :

- `filename` = `2026-09-04_drop_legacy_wishlists.sql`
- `checksum` = `930ae8b2bd2554a64026063bca1dea5fb47ae5e9d823805f7452e45e92b4ebff`
- `LENGTH(checksum) = 64`
- `checksum_matches = 1`
- `applied_at = 2026-09-04 12:19:56`

**Validation finale :** `table_exists = 0`. Checksum 64 caractères, correspondance exacte.

### Prochaines étapes / statut courant

**P20-D7** (étape suivante, ordre P20-A) : examiner puis traiter **séparément** le DDL runtime `logs` (`CREATE TABLE IF NOT EXISTS logs`). Non autorisé ici. Non modifié ici.

Restent également ouverts :

- collations mixtes ;
- autres dérives historiques.

Chaque mutation reste un sous-chantier séparé, avec backup approprié, inspection du SQL, autorisation et validation.

**Statut courant P20 :** **EN COURS**. P20-A terminé (read-only). P20-B terminé techniquement. P20-C terminé / validé en production. Verrou temporaire Basic Auth de la surface publique : **validé en production** (mesure transversale). P20-D1 à P20-D4 et P20-D6 fermés / validés en production. P20-D5 fermé (analyse terminée, aucune migration). P20-D7 et la suite : à faire. **Non fermé.**

---

## Règle de mise à jour

- ajouter une entrée après chaque correctif déployé;
- inscrire le commit;
- inscrire les fichiers concernés;
- inscrire les validations effectuées;
- inscrire les résultats ou anomalies;
- ne jamais inscrire de secret;
- ne jamais déclarer un problème corrigé avant validation en production lorsque le correctif concerne la production.
