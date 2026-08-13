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
