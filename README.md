# Flippin’ Maple

## 1. Identité du projet

**Nom officiel :** Flippin’ Maple

Flippin’ Maple est une marque canadienne inspirée de la culture skate et du design, actuellement développée au moyen d’une infrastructure e-commerce et d’un modèle Print-on-Demand appelé à évoluer.

Le Print-on-Demand est un moyen de production, pas l’identité de la marque.

Le nom technique historique du dépôt (`mon-shop-artofwhere`) est un héritage d’outillage. Il ne remplace pas le nom de marque.

---

## 2. Statut actuel

- Le socle technique e-commerce est en développement.
- L’identité de marque est en cours de refondation.
- Le projet n’est pas encore prêt pour un lancement public.
- La documentation est en cours de restructuration.

---

## 3. Source de vérité

La source officielle de vérité stratégique est :

**[docs/00_PROJECT_MASTER.md](docs/00_PROJECT_MASTER.md)**

Toute personne ou tout agent IA doit lire ce document avant une analyse ou une modification importante du projet.

Ce README sert d’entrée au dépôt et d’index documentaire. Il ne remplace pas la Constitution.

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

| Document | Rôle |
|---|---|
| [docs/00_PROJECT_MASTER.md](docs/00_PROJECT_MASTER.md) | Constitution stratégique et source de vérité |
| [docs/INVENTAIRE_Flippin_Maple.md](docs/INVENTAIRE_Flippin_Maple.md) | Inventaire technique historique, actuellement à migrer |
| [NOTES.md](NOTES.md) | Note historique à évaluer |

`docs/INVENTAIRE_Flippin_Maple.md` et `NOTES.md` ne sont **pas** des sources stratégiques officielles.

---

## 7. Règles de contribution

- Lire [docs/00_PROJECT_MASTER.md](docs/00_PROJECT_MASTER.md) avant toute modification importante.
- Ne pas dupliquer une information déjà détenue par une source officielle.
- Ne pas supprimer un document avant migration et validation de son contenu utile.
- Privilégier des changements petits, vérifiables et réversibles.
- Ne pas exécuter `npm audit fix --force` sans analyse préalable.
