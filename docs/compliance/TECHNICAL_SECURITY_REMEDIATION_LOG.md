# Journal des correctifs techniques et de sécurité

**Statut :** journal actif — chantiers P3 (checkout public), P4 (webhook Stripe / idempotence), P5 (fallback `order_items`), P6 (gestionnaire d’erreurs) et P7 (authentification / sessions / JWT) : **FERMÉS / COMPLETS**. Prochaine priorité d’audit : **P8** (inscription / consentement marketing / privacy).

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

P4 a depuis été traité et fermé dans la section suivante. Le runner de migrations n’a pas été corrigé.

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
4. **Register account enumeration** — 409 `Un compte existe déjà avec ce courriel.` **Reporté à P8** (inscription / privacy / consentement). Login conserve déjà une erreur générique.
5. **`authService.js` / `authModel.js`** — code historique **non branché** au runtime. Hors P7. Hygiène possible plus tard.
6. **Lignes `refresh_tokens` expirées** — peuvent rester. Le registre actif exige `expires_at > NOW()`. Purge / family revoke : hardening ultérieur, non bloquant.

### Statut final P7

P7 est **FERMÉ / COMPLET**. Le constat historique d’audit P7 a été traité par les correctifs et validations ci-dessus. La prochaine priorité d’audit est **P8** (inscription / consentement marketing / privacy).

---

## Règle de mise à jour

- ajouter une entrée après chaque correctif déployé;
- inscrire le commit;
- inscrire les fichiers concernés;
- inscrire les validations effectuées;
- inscrire les résultats ou anomalies;
- ne jamais inscrire de secret;
- ne jamais déclarer un problème corrigé avant validation en production lorsque le correctif concerne la production.
