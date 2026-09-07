# Flippin’ Maple

## 1. Identité du projet

**Nom officiel :** Flippin’ Maple

Flippin’ Maple est une marque canadienne inspirée de la culture skate et du design, actuellement développée au moyen d’une infrastructure e-commerce et d’un modèle Print-on-Demand appelé à évoluer.

Le Print-on-Demand est un moyen de production, pas l’identité de la marque.

Le nom technique historique du dépôt (`mon-shop-artofwhere`) est un héritage d’outillage. Il ne remplace pas le nom de marque.

---

## 2. Statut actuel

Point d’entrée opérationnel du dépôt. Ce n’est ni la Constitution, ni un journal de session. Les phases stratégiques restent dans `docs/00_PROJECT_MASTER.md` §10 ; ce README ne déclare pas une « phase courante » Constitution.

### 2.1 Constats

- Le socle technique e-commerce existe (catalogue, panier, paiement, fulfillment).
- L’identité de marque est en cours de refondation. Le système graphique officiel (Wordmark principal FLIPPIN’M, Compact F’M, Mark M) est livré dans `src/assets/brand/` ; les photographies de marque restent absentes.
- Le projet n’est pas encore prêt pour un lancement public.
- La documentation spécialisée existe pour la marque, l’engineering, la conformité, la sécurité et la page d’accueil ; certains documents sont encore des drafts ou des plans de travail internes.

**Constat déduit (pas un statut de phase écrit dans la Constitution) :** les critères de sortie de la Phase 1 — Fondation de marque ne sont pas tous atteints. Exemple déjà documenté : photographies de marque encore absentes (`docs/web/HOMEPAGE_ASSETS.md`).

### 2.2 Programmes fermés

**Sécurité — numérotation P.**

Les chantiers **P3–P24** sont fermés. Détail et validations : [`docs/compliance/TECHNICAL_SECURITY_REMEDIATION_LOG.md`](docs/compliance/TECHNICAL_SECURITY_REMEDIATION_LOG.md). **Aucun P25 n’est ouvert.** Ce programme n’est pas une roadmap produit.

**Passe storefront — nomenclature de chantier/session.**

Une passe storefront globale a été complétée jusqu’à `b80e408`. Elle couvrait les fondations visuelles, les principales surfaces storefront, les états système et l’accessibilité.

Sa nomenclature de travail R2–R10 était une nomenclature de chantier/session. Elle ne correspond **pas** aux règles fondamentales R1–R10 de `docs/00_PROJECT_MASTER.md` §7. Aucun « R11 » officiel n’est défini.

L’historique détaillé des commits reste dans Git.

### 2.3 Prochaine phase produit

**Aucun chantier produit suivant n’est officiellement choisi.**

Il n’existe pas de phase « R11 ». Ne pas en inventer une.

Candidats déjà documentés — **décision humaine requise** avant ouverture, sans ordre imposé :

- photographie / homepage, seulement lorsqu’un document spécialisé les autorise explicitement (`docs/web/HOMEPAGE_ASSETS.md` §29 n’autorise aucune étape) ;
- reprise ou revalidation de l’audit décrit dans `docs/compliance/PRIVACY_COOKIES_CHATBOT_PLAN.md` §23 (texte antérieur à P8–P24 ; ne plus le traiter comme prochaine action automatique) ;
- dette / résidus déjà identifiés (inventaire héritage ; éléments signalés en session, non priorisés ici).

Cette liste n’ouvre aucun chantier.

---

## 3. Source de vérité

| Sujet | Document |
|---|---|
| Constitution / stratégie | [docs/00_PROJECT_MASTER.md](docs/00_PROJECT_MASTER.md) |
| Vision et positionnement détaillés | [docs/brand/VISION_AND_POSITIONING.md](docs/brand/VISION_AND_POSITIONING.md) |
| Voix de marque | [docs/brand/VOICE.md](docs/brand/VOICE.md) |
| Identité visuelle | [docs/brand/VISUAL_IDENTITY.md](docs/brand/VISUAL_IDENTITY.md) |
| Modèle de données | [docs/engineering/DATA_MODEL.md](docs/engineering/DATA_MODEL.md) |
| Contraintes d’hébergement (Hostinger / prod) | [docs/engineering/HOSTING_CONSTRAINTS.md](docs/engineering/HOSTING_CONSTRAINTS.md) |
| Invariants checkout et paiement | [docs/engineering/CHECKOUT_INVARIANTS.md](docs/engineering/CHECKOUT_INVARIANTS.md) |
| Architecture générale / portabilité | [docs/engineering/ARCHITECTURE.md](docs/engineering/ARCHITECTURE.md) |
| Recherche et tri du catalogue public | [docs/engineering/PRODUCT_SEARCH_AND_SORT_SPEC.md](docs/engineering/PRODUCT_SEARCH_AND_SORT_SPEC.md) |
| Confidentialité, témoins, chatbot | [docs/compliance/PRIVACY_COOKIES_CHATBOT_PLAN.md](docs/compliance/PRIVACY_COOKIES_CHATBOT_PLAN.md) |
| Audit de sécurité (constats figés) | [docs/compliance/TECHNICAL_SECURITY_AUDIT.md](docs/compliance/TECHNICAL_SECURITY_AUDIT.md) |
| Journal des correctifs de sécurité | [docs/compliance/TECHNICAL_SECURITY_REMEDIATION_LOG.md](docs/compliance/TECHNICAL_SECURITY_REMEDIATION_LOG.md) |
| Spécifications de homepage | [docs/web/HOMEPAGE_SPEC.md](docs/web/HOMEPAGE_SPEC.md) |

Toute personne ou tout agent IA doit lire la Constitution avant une analyse ou une modification importante du projet.

Ce README sert d’entrée au dépôt et d’index documentaire. Il ne remplace ni la Constitution ni les documents techniques officiels.

---

## 4. Architecture générale

Résumé confirmé par la structure du dépôt :

| Couche | Technologie |
|---|---|
| Frontend | React / Vite (`src/`) |
| Backend | Node.js / Express (`server/`) |
| Paiement | Stripe |
| Production / fulfillment | Printful (moyen de production) |
| Base de données | MySQL |
| Documentation | `docs/` |

Le frontend proxyfie les appels `/api` vers le backend (voir `vite.config.js`).

---

## 5. Démarrage local

### Frontend

À la racine du dépôt :

```bash
npm install
npm run dev
```

URL prévue (`vite.config.js`, port `3000`) :

`http://localhost:3000`

### Backend

Les scripts suivants sont définis dans `server/package.json` :

```bash
cd server
npm install
npm run dev
```

Équivalent sans rechargement automatique : `npm start` (dans `server/`).

Le frontend attend le backend sur `http://localhost:4242` (cible du proxy Vite). La configuration complète (variables d’environnement, base de données) n’est pas documentée ici ; elle devra être validée dans une étape technique distincte.

---

## 6. Documentation actuelle

### Constitution

| Document | Rôle |
|---|---|
| [docs/00_PROJECT_MASTER.md](docs/00_PROJECT_MASTER.md) | Constitution stratégique |

### Marque

| Document | Rôle |
|---|---|
| [docs/brand/VISION_AND_POSITIONING.md](docs/brand/VISION_AND_POSITIONING.md) | Source officielle détaillée de vision et de positionnement |
| [docs/brand/VOICE.md](docs/brand/VOICE.md) | Draft v1 : voix, ton et règles de rédaction |
| [docs/brand/VISUAL_IDENTITY.md](docs/brand/VISUAL_IDENTITY.md) | Draft v1 : fondations visuelles de travail |

### Engineering

| Document | Rôle |
|---|---|
| [docs/engineering/DATA_MODEL.md](docs/engineering/DATA_MODEL.md) | Source officielle du schéma métier (sections migrées) |
| [docs/engineering/ARCHITECTURE.md](docs/engineering/ARCHITECTURE.md) | Architecture générale, frontières du core, providers et portabilité |
| [docs/engineering/HOSTING_CONSTRAINTS.md](docs/engineering/HOSTING_CONSTRAINTS.md) | Contraintes Hostinger / prod |
| [docs/engineering/CHECKOUT_INVARIANTS.md](docs/engineering/CHECKOUT_INVARIANTS.md) | Référence fonctionnelle du pipeline de paiement |
| [docs/engineering/PRODUCT_SEARCH_AND_SORT_SPEC.md](docs/engineering/PRODUCT_SEARCH_AND_SORT_SPEC.md) | Spécification de la recherche et du tri du catalogue public |

### Compliance

| Document | Rôle |
|---|---|
| [docs/compliance/PRIVACY_COOKIES_CHATBOT_PLAN.md](docs/compliance/PRIVACY_COOKIES_CHATBOT_PLAN.md) | Plan interne de confidentialité, témoins et chatbot ; pas un avis juridique |
| [docs/compliance/TECHNICAL_SECURITY_AUDIT.md](docs/compliance/TECHNICAL_SECURITY_AUDIT.md) | Audit de référence figé : constats initiaux seulement |
| [docs/compliance/TECHNICAL_SECURITY_REMEDIATION_LOG.md](docs/compliance/TECHNICAL_SECURITY_REMEDIATION_LOG.md) | Journal courant des correctifs, validations et résultats |

L’audit et le journal ne sont pas interchangeables : l’audit conserve les constats figés ; le journal conserve les corrections déployées et validées.

### Web / page d’accueil

| Document | Rôle |
|---|---|
| [docs/web/HOMEPAGE_SPEC.md](docs/web/HOMEPAGE_SPEC.md) | Draft v1 : spécification de la page d’accueil |
| [docs/web/HOMEPAGE_WIREFRAME.md](docs/web/HOMEPAGE_WIREFRAME.md) | Draft v1 : wireframe basse fidélité |
| [docs/web/HOMEPAGE_VISUAL_DESIGN.md](docs/web/HOMEPAGE_VISUAL_DESIGN.md) | Draft v1 : direction visuelle haute fidélité |
| [docs/web/HOMEPAGE_COPY.md](docs/web/HOMEPAGE_COPY.md) | Draft v1 : textes de travail, non approuvés définitivement |
| [docs/web/HOMEPAGE_ASSETS.md](docs/web/HOMEPAGE_ASSETS.md) | Draft v1 : plan d’actifs visuels, non approuvés définitivement |

### Héritages (non officiels)

| Document | Rôle |
|---|---|
| [docs/INVENTAIRE_Flippin_Maple.md](docs/INVENTAIRE_Flippin_Maple.md) | Dette, TODO et flux encore à migrer (le descriptif des tables pointe vers DATA_MODEL) |
| [NOTES.md](NOTES.md) | Note historique à évaluer |

L’inventaire et `NOTES.md` ne sont **pas** des sources stratégiques. Pour le schéma, utiliser DATA_MODEL, pas l’inventaire.

---

## 7. Règles de contribution

- Lire [docs/00_PROJECT_MASTER.md](docs/00_PROJECT_MASTER.md) avant toute modification importante.
- Ne pas dupliquer une information déjà détenue par une source officielle.
- Ne pas supprimer un document avant migration et validation de son contenu utile.
- Privilégier des changements petits, vérifiables et réversibles.
- Ne pas exécuter `npm audit fix --force` sans analyse préalable.
