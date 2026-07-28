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
