# Journal des correctifs techniques et de sécurité

**Statut :** corrections en cours

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

---

## État après ces correctifs

- site public fonctionnel;
- base accessible;
- catalogue fonctionnel;
- environnement production actif;
- cookies `Secure` actifs;
- limiteurs shipping et inventory actifs;
- route publique Printful désactivée;
- aucun changement au checkout, au calcul des prix ou au webhook Stripe dans cette série;
- les risques critiques restants demeurent ceux du rapport d’audit.

---

## Règle de mise à jour

- ajouter une entrée après chaque correctif déployé;
- inscrire le commit;
- inscrire les fichiers concernés;
- inscrire les validations effectuées;
- inscrire les résultats ou anomalies;
- ne jamais inscrire de secret;
- ne jamais déclarer un problème corrigé avant validation en production lorsque le correctif concerne la production.
