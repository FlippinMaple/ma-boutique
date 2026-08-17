# Architecture — Flippin’ Maple

**Document :** `docs/engineering/ARCHITECTURE.md`  
**Statut :** actif — direction architecturale  
**Date :** 2026-08-16  
**Portée :** comment c’est bâti, frontières du core, providers et portabilité  
**Hors portée :** détails de schéma, invariants checkout, contraintes Hostinger, textes juridiques, inventaire de couplage

---

## 1. Statut et portée

Ce document fixe une **direction architecturale**. Il ne décrit pas une plateforme déjà portable, et il n’autorise pas un refactor immédiat.

Flippin’ Maple demeure la marque et le produit principal actuel. Le moteur technique doit, à terme, pouvoir être réutilisé comme **core e-commerce** pour d’autres boutiques, sans que Stripe, Printful ou l’identité Flippin’ Maple deviennent le cœur conceptuel du système.

**Priorité d’audit inchangée.** P8 (inscription / consentement marketing / privacy technique) est **FERMÉ / COMPLET**. La prochaine priorité d’audit est **P9**. Le chantier réel de portabilité se fera **après** ou **séparément** de l’audit courant, sauf si une correction future doit naturellement respecter ces frontières.

Autorités spécialisées (ce document ne les duplique pas) :

| Sujet | Autorité |
|---|---|
| Schéma métier | `docs/engineering/DATA_MODEL.md` |
| Checkout / paiement | `docs/engineering/CHECKOUT_INVARIANTS.md` |
| Hébergement / MySQL prod | `docs/engineering/HOSTING_CONSTRAINTS.md` |
| Recherche / tri catalogue | `docs/engineering/PRODUCT_SEARCH_AND_SORT_SPEC.md` |
| Constitution / vision | `docs/00_PROJECT_MASTER.md` |

---

## 2. Architecture actuelle

État confirmé par le dépôt et la documentation existante. Une seule application déployable, **monolithe applicatif** :

| Couche | État confirmé |
|---|---|
| Frontend | React / Vite (`src/`) |
| Backend | Node.js / Express (`server/`) |
| Données | MySQL |
| Paiement (instance actuelle) | Stripe — session Checkout, webhook `POST /webhook/stripe` |
| Fulfillment / POD (instance actuelle) | Printful — moyen de production, pas l’identité de la marque |
| Jobs | Présents sous `server/jobs/` (sync Printful, purge de logs, panier abandonné) |
| Hébergement | Hostinger (contraintes dans `HOSTING_CONSTRAINTS.md`) |

Le frontend proxyfie `/api` vers le backend. Frontend et API cohabitent dans le même dépôt.

Les domaines (auth, catalogue, checkout, webhooks, jobs) existent dans ce monolithe, mais **ne sont pas encore** isolés derrière des frontières de providers. Stripe et Printful sont aujourd’hui des intégrations concrètes de l’instance Flippin’ Maple, souvent couplées au code métier.

---

## 3. Direction architecturale

Cible : **monolithe modulaire**.

Pas de passage aux microservices. Une seule application peut continuer à contenir frontend, API, jobs, webhooks et accès MySQL.

Le code doit tendre vers des responsabilités clairement séparées afin de :

- modifier un domaine sans réécrire les autres ;
- limiter les dépendances croisées ;
- isoler les intégrations fournisseurs ;
- rendre configurables les éléments propres à Flippin’ Maple ;
- permettre éventuellement de réutiliser le core pour une autre boutique.

Principe : **extraire / abstraire lorsqu’il existe une frontière métier ou un besoin réel.** Le monolithe modulaire reste le choix par défaut.

---

## 4. Frontières conceptuelles

Ces frontières sont conceptuelles. Elles ne fixent ni noms de classes, ni arborescence obligatoire, ni API interne.

### Commerce Core

Règles et fonctions réutilisables du commerce, indépendantes d’une marque et d’un fournisseur donné :

- comptes / authentification ;
- catalogue et variantes ;
- panier ;
- checkout (règles métier, pas l’implémentation Stripe) ;
- commandes ;
- administration ;
- consentements techniques ;
- sécurité ;
- fonctions communes.

### Brand / Instance Configuration

Valeurs et actifs propres à une boutique / entreprise / juridiction :

- nom de marque, identité visuelle, palette, typographies, logos ;
- textes, domaine, SEO, coordonnées ;
- emails (expéditeur, contenus de marque) ;
- paramètres business et légaux ;
- URLs vers les politiques **lorsque celles-ci existent**.

Flippin’ Maple est l’instance actuelle. Ce n’est pas le core.

### Payment Provider

Intégration qui **réalise** un paiement. Aujourd’hui : Stripe, pour l’instance Flippin’ Maple.

Le domaine métier devrait, à terme, distinguer « effectuer / confirmer un paiement » de « utiliser Stripe pour cette opération ».

### Fulfillment Provider

Intégration qui **produit / expédie**. Aujourd’hui : Printful, pour une partie du fulfillment / POD de l’instance Flippin’ Maple.

Printful est un provider, pas le core. Le futur système doit pouvoir envisager Printful, un autre provider, un stock manuel, ou un modèle hybride.

### Communications / External Services

Email, webhooks fournisseurs, et autres services externes. Mêmes règles : isolation progressive, configuration d’instance, pas de texte juridique universel inventé dans le core.

---

## 5. Principe de portabilité

Direction cible, **non réalisée** aujourd’hui :

| Instance | Marque | Paiement | Fulfillment |
|---|---|---|---|
| A (actuelle) | Flippin’ Maple | Stripe | Printful |
| B (exemple futur) | autre marque | autre compte / configuration de paiement | Printify |
| C (exemple futur) | autre marque | autre fournisseur de paiement si supporté | inventaire / fulfillment manuel |

Cette interchangeabilité **n’existe pas** encore. On ne change pas de provider avec une variable de configuration. Tout couplage actuel devra être inventorié avant un refactor.

---

## 6. Provider / adapter boundary

Le core ne devrait idéalement pas dépendre partout d’appels du type `printful.createOrder(...)` ou `stripe.something(...)`.

Les domaines applicatifs devraient progressivement s’appuyer sur des services internes suffisamment génériques **lorsque cela apporte une vraie valeur**. Exemples conceptuels seulement : `paymentProvider` / `fulfillmentProvider`, ou `paymentService` / `fulfillmentService`. L’instance Flippin’ Maple peut alors déléguer à Stripe ou Printful.

Ce document **ne fixe pas** :

- les noms de classes ou de fichiers ;
- une interface TypeScript ;
- une architecture de dossiers obligatoire ;
- une API interne précise.

Stripe est une intégration critique et fonctionnelle. La direction ne doit pas :

- fragiliser Stripe ;
- abstraire artificiellement chaque ligne Stripe ;
- modifier le checkout actuel pendant l’audit.

Toute abstraction future de paiement **doit préserver** les invariants de `docs/engineering/CHECKOUT_INVARIANTS.md`.

Printful : le couplage actuel devra être inventorié avant tout refactor. Ne pas prétendre qu’un changement de provider est déjà possible.

---

## 7. Branding et configuration d’instance

À terme, les éléments suivants devraient être identifiables comme **configuration d’instance** ou **actifs de marque**, plutôt que dispersés arbitrairement dans le core lorsque cela peut raisonnablement être évité :

- Flippin’ Maple ;
- « NO FIXED LINE. » ;
- logos, palette, typographies ;
- textes marketing ;
- coordonnées, domaine, expéditeur email ;
- paramètres business et checkout propres à la boutique ;
- textes et URLs légales.

**Ne pas les déplacer maintenant.**

Les textes et paramètres légaux sont propres à une instance, une juridiction et une entreprise. La plateforme ne doit pas contenir une fausse politique générique « universelle ». P8 a confirmé : ne pas inventer de CGU ni de politique vide.

À terme, prévoir conceptuellement : URLs légales configurables, identité de l’entreprise, expéditeur, versions de textes si nécessaire, paramètres de consentement dépendant de l’instance. **Aucun texte juridique n’est rédigé ici.**

---

## 8. Invariants

- Les invariants checkout / paiement restent dans `CHECKOUT_INVARIANTS.md`.
- Le schéma métier reste dans `DATA_MODEL.md`.
- Les contraintes Hostinger / MySQL prod restent dans `HOSTING_CONSTRAINTS.md`.
- La recherche et le tri du catalogue public restent dans `PRODUCT_SEARCH_AND_SORT_SPEC.md`.
- Ce document ne duplique pas leurs détails. En cas de conflit sur leur domaine, l’autorité spécialisée prime.

---

## 9. Ce que cette décision ne signifie pas

- pas de migration automatique vers des microservices ;
- pas de séparation en plusieurs bases de données ;
- pas de Kubernetes ;
- pas de files / message brokers sans besoin réel ;
- pas d’abstraction pour le plaisir d’abstraire ;
- pas de réécriture générale ;
- pas de refactor massif pendant l’audit actuel.

Extraire ou abstraire seulement s’il existe une frontière métier ou un besoin réel. Le monolithe modulaire reste le choix par défaut.

---

## 10. État actuel vs cible

| Élément | Déjà vrai aujourd’hui | Partiellement vrai | Cible future |
|---|---|---|---|
| Une application déployable (front + API + jobs + webhooks + MySQL) | Oui | — | Conservé (monolithe modulaire) |
| Flippin’ Maple comme marque distincte du POD | Oui (Constitution) | Valeurs de marque encore dispersées dans le code | Configuration d’instance identifiable |
| Stripe comme moyen de paiement de l’instance actuelle | Oui | Couplage métier / Stripe non inventorié | Paiement via une frontière provider, invariants checkout préservés |
| Printful comme moyen de fulfillment / POD de l’instance actuelle | Oui | Couplage métier / Printful non inventorié | Fulfillment via une frontière provider (Printful, autre, manuel, hybride) |
| Core réutilisable pour une autre boutique | Non | Socle e-commerce unique, non paramétré multi-instance | Même core, autre marque / paiement / fulfillment |
| Interchangeabilité des providers par configuration | Non | — | Après inventaire et extraction progressive |
| Pages légales publiques validées | Non | — | Propres à l’instance, jamais inventées dans le core |

---

## 11. Règle pour les changements futurs

Lorsqu’une nouvelle fonctionnalité dépend d’un fournisseur ou d’une valeur propre à Flippin’ Maple, se demander :

> Est-ce une règle du **commerce core**, une **configuration d’instance**, ou une **intégration fournisseur** ?

Si c’est clairement une intégration fournisseur : éviter d’introduire de nouveaux couplages inutiles dans plusieurs domaines du core.

Si l’abstraction coûterait beaucoup plus cher que sa valeur immédiate : **documenter le couplage et reporter proprement** plutôt que sur-concevoir.

Cette règle s’applique aux évolutions courantes. Elle ne déclenche pas le chantier de portabilité et ne change pas l’ordre de l’audit (P9 ensuite).

---

## 12. Chantier futur de portabilité

Avant tout gros refactor, inventorier :

- couplages Stripe ;
- couplages Printful ;
- valeurs Flippin’ Maple hardcodées ;
- emails / configuration business ;
- URLs et textes légaux ;
- dépendances entre domaines.

Ce rapport d’inventaire **n’est pas créé ici**. Le chantier se fera après ou séparément de l’audit courant, sauf frontière naturelle dans une correction future.

---

## Avertissement

Ce document est une direction interne. Il ne constitue pas une implémentation, une certification de portabilité, ni une autorisation de réécrire le checkout, Stripe, Printful ou les pages légales.
