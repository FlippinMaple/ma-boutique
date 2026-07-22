# Flippin’ Maple — Textes de travail de la page d’accueil

## 1. Métadonnées

| Champ | Valeur |
|---|---|
| **Titre** | Flippin’ Maple — Homepage Copy |
| **Chemin** | `docs/web/HOMEPAGE_COPY.md` |
| **Statut** | **Draft — Homepage Copy v1** |
| **Nature** | Textes de travail soumis à validation — **aucun texte n’est approuvé définitivement** |
| **Date** | 2026-07-22 |
| **Version** | v1 (brouillon rédactionnel) |
| **Langue source** | Français québécois naturel |
| **Adaptation secondaire** | Anglais canadien (adaptation naturelle, non littérale) |
| **Portée** | Page d’accueil uniquement |
| **Documents sources** | `docs/00_PROJECT_MASTER.md` · `docs/brand/VISION_AND_POSITIONING.md` · `docs/brand/VISUAL_IDENTITY.md` · `docs/brand/VOICE.md` · `docs/web/HOMEPAGE_SPEC.md` · `docs/web/HOMEPAGE_WIREFRAME.md` · `docs/web/HOMEPAGE_VISUAL_DESIGN.md` |
| **Exclusions** | Implémentation technique · i18n · routes · composants · logo final · photos finales · catalogue réel · validation juridique de `NO FIXED LINE.` · politiques légales définitives |

**Choix orthographique anglais (proposition de travail) :** orthographe canadienne cohérente dans tout ce document (`favour`, `colour`, `centre` lorsque ces formes apparaissent). Le détail orthographique exact demeure **Provisoire** dans `VOICE.md`.

**Signature :** `NO FIXED LINE.` demeure en anglais dans les deux versions. Usage public final **dépendant d’une validation juridique encore ouverte**.

---

## 2. Règles de lecture

1. Le **français** constitue la langue source et principale.
2. L’**anglais** constitue une adaptation complète et naturelle — jamais un calque.
3. Sur le site, **une seule langue** est affichée à la fois dans les contenus principaux.
4. Dans **ce document seulement**, FR et EN sont présentés côte à côte pour faciliter la validation.
5. Les indications entre crochets `[…]` sont des **notes documentaires**, pas du contenu public.
6. Les contenus marqués **Conditionnel** doivent disparaître lorsque les données ou actifs requis n’existent pas.
7. Les libellés dynamiques (`[Nom du produit]`, etc.) ne sont pas des produits inventés.
8. Aucune formulation de ce document ne doit être traitée comme texte final approuvé.

---

## 3. Résumé de la direction rédactionnelle

Flippin’ Maple parle de façon **directe**, **calme**, **précise**, **mature** et **accessible**. La confiance se lit sans arrogance. Une légère irrévérence est possible si elle reste contrôlée.

**Refus :** caricature québécoise · ton adolescent · slang forcé · exagération publicitaire · fausse urgence · promesse non vérifiée · discours POD comme identité · folklore canadien · superlatifs vides.

Le Print-on-Demand reste un **moyen de production**, jamais le sujet du récit.

---

## 4. Page d’accueil — version française source

Ordre = wireframe (`HOMEPAGE_WIREFRAME.md`) : Header → Hero → Produits → Déclaration → Éditorial → Catégories → Capsule → Courriel → Footer.

---

### 4.1 Header

| Champ | Contenu |
|---|---|
| **Rôle** | Identifier la marque ; offrir l’accès boutique, compte et panier ; rester discret face au Hero |
| **Statut** | Draft |
| **Wordmark / accessibilité** | Texte accessible : `Flippin’ Maple — Accueil` (wordmark typographique tant que le logo final est absent) |
| **Navigation (travail)** | `Boutique` · `Nouveautés` · `Essentiels` · `À propos` |
| **Libellés utilitaires** | `Compte` · `Panier` |
| **CTA secondaires** | Aucun CTA marketing dans le header |
| **Notes de longueur** | Libellés courts (1–2 mots) |
| **Conditions** | Liens uniquement vers des destinations réelles ; pas de barre promo permanente |
| **À compléter** | Libellés de nav définitifs ; destinations exactes si certaines pages n’existent pas encore |

**Variante :** aucune (décision structurelle déjà définie).

---

### 4.2 Hero

| Champ | Contenu |
|---|---|
| **Rôle** | Installer Flippin’ Maple ; exprimer l’attitude ; mener vers la boutique |
| **Statut** | Draft |
| **Sur-titre** | `FLIPPIN’ MAPLE` |
| **Titre principal (proposition A — principale)** | `NO FIXED LINE.` |
| **Texte d’accompagnement (A)** | `Une marque canadienne indépendante. Le skate comme point de départ, pas comme limite.` |
| **CTA principal (A)** | `Voir la boutique` |
| **CTA secondaire** | Aucun |
| **Notes de longueur** | Sur-titre court · H1 compact · appui = 1–2 phrases courtes · un seul CTA principal |
| **Accessibilité** | Alt image : description concise de la personne, du vêtement et du contexte **réellement** visibles ; si fallback couleur : ne pas dépendre du texte dans l’image |
| **Conditions** | `NO FIXED LINE.` = emplacement de travail (**Provisoire** dans les sources) ; usage public final soumis à validation juridique (**Ouvert**) ; une seule occurrence dominante sur la page |
| **Données requises** | Image Hero crédible **ou** fallback Deep Forest / Charcoal ; destination réelle du CTA |

#### Proposition A — principale (Draft)

| | |
|---|---|
| **FR** | Sur-titre `FLIPPIN’ MAPLE` · H1 `NO FIXED LINE.` · Appui `Une marque canadienne indépendante. Le skate comme point de départ, pas comme limite.` · CTA `Voir la boutique` |
| **Justification (interne)** | Identifie clairement la marque ; affirme son indépendance canadienne ; place la culture skate à l’origine ; indique que la marque ne se limite pas aux pratiquants ni à une seule scène ; laisse `NO FIXED LINE.` porter l’attitude sans second slogan ; reste courte et exploitable visuellement. |
| **Risque principal (interne)** | `NO FIXED LINE.` dépend toujours de la validation juridique. L’expression « marque canadienne » désigne l’identité et l’origine de la marque — **pas** une fabrication au Canada ; si la nuance semble ambiguë dans le contexte global de la page, la reformuler avant publication. |

#### Proposition B — conditionnelle (Draft)

À n’utiliser que si un **titre de campagne réel** remplace la signature dans le Hero. Ne jamais inventer ce titre. Dans ce cas, `NO FIXED LINE.` peut devenir le titre de la Déclaration (sous réserve de validation juridique).

| | |
|---|---|
| **FR** | Sur-titre `FLIPPIN’ MAPLE` · H1 `[Titre de campagne réel]` · Appui `Une marque canadienne indépendante. Le skate comme point de départ, pas comme limite.` · CTA `Voir la boutique` |
| **Justification (interne)** | Même appui positif que A ; le Hero devient moment de campagne sans inventer de titre ; CTA mène explicitement à la boutique. |
| **Risque principal (interne)** | Sans vrai titre de campagne, cette variante ne doit pas être inventée ni publiée. Même nuance « marque canadienne » ≠ fabrication canadienne. |

**Interdits Hero (internes) :** « Exprime ton style » · histoire longue inventée · promesses absolues · jargon créatif · badges promo · multi-CTA · logo soudé à la signature · formulations défensives adressées au client.

---

### 4.3 Produits (Sélection principale)

| Champ | Contenu |
|---|---|
| **Rôle** | Montrer une curation courte ; prouver une marque de vêtements, pas un catalogue POD |
| **Statut** | Draft (structure) · À compléter (données produit) |
| **Titre de section (H2)** | `Sélection` |
| **Lien de section** | `Voir la boutique` |
| **Carte produit** | `[Nom du produit]` · `[Prix]` · variante seulement si utile · image 4:5 |
| **Microcopie** | Aucune accroche marketing sur la carte ; pas de « premium », « limité », « exclusif » |
| **Notes de longueur** | Titre court ; nom produit = nomenclature réelle ; prix = donnée réelle uniquement |
| **Conditions d’affichage** | 3 produits recommandés (4 si curation réelle) ; minimum 2 s’il n’existe que 2 pièces fortes ; **jamais** remplir avec un dump Printful |
| **Données factuelles requises** | Produits réels · photos cohérentes · prix réels · liens PDP réels |

---

### 4.4 Déclaration de marque

| Champ | Contenu |
|---|---|
| **Rôle** | Donner de la profondeur d’attitude sans long manifeste |
| **Statut** | Draft |
| **Titre (H2) — proposition principale** | `Ta ligne. Ton rythme.` |
| **Paragraphe (proposition principale)** | `Flippin’ Maple puise dans la culture skate une idée simple : choisir sa direction. Mouvement, liberté et confiance calme guident la marque, sans t’enfermer dans une scène. Tu avances à ton rythme. Tu changes de direction quand tu le décides.` |
| **Longueur** | ~50 mots (cible source : 40–80) |
| **CTA** | Optionnel : `À propos` — seulement si une véritable page de destination existe ; ne pas inventer de route |
| **Conditions** | Si le Hero utilise `NO FIXED LINE.` (**proposition A**), la Déclaration conserve le titre `Ta ligne. Ton rythme.` et **ne répète pas** la signature. Si le Hero utilise un véritable titre de campagne (**proposition B**), la Déclaration peut utiliser `NO FIXED LINE.` comme titre ; le même paragraphe principal est conservé ; la validation juridique de la signature demeure obligatoire. |

---

### 4.5 Éditorial (matière / territoire)

| Champ | Contenu |
|---|---|
| **Rôle** | Contraste tactile ; lier matière, territoire et mouvement |
| **Statut** | Conditionnel |
| **Titre (H2) — structure de travail** | `[Titre éditorial réel — ex. travail : Matière et territoire]` |
| **Texte — structure de travail** | `[Court paragraphe factuel ou éditorial réel : matière visible, lieu, saison, mouvement — sans fabrication inventée]` |
| **Lien optionnel** | `Lire la suite` / `À propos` — seulement si destination réelle |
| **Conditions** | Absente ou réduite si aucune image crédible **et** aucun texte prêt ; pas de faux article ; **aucun discours artisanal inventé** |
| **Repli permis** | Titre + lien court si le texte est prêt mais l’image manque ; sinon retrait de la section |
| **Repli interdit** | Fausse histoire de fabrication · faux événement · fausse collaboration |

**Exemple de formulation de travail (non publiable comme contenu réel sans actif/contexte) :**

Titre : `Matière et territoire`
Texte : `Texture, coupe, froid urbain. Des détails concrets — pas une légende de fabrication.`

---

### 4.6 Catégories

| Champ | Contenu |
|---|---|
| **Rôle** | Entrée structurée vers le catalogue sans longue grille |
| **Statut** | Draft (structure) · À compléter (catégories réelles) |
| **Titre de section (H2)** | `Catégories` |
| **Libellés de travail (non verrouillés)** | `T-shirts` · `Cotons ouatés` · `[Troisième catégorie réelle uniquement si validée]` |
| **Microcopie** | Titres en texte réel (pas dans l’image) ; pas de badges |
| **CTA** | Toute la tuile cliquable → liste/filtre catégorie réel |
| **Conditions** | 2 catégories recommandées ; 3 seulement si destinations réelles ; sinon retirer la section ou limiter aux destinations existantes |
| **Interdit** | Catégories fictives · « Essentiels iconiques » · libellés lifestyle vagues |

---

### 4.7 Capsule

| Champ | Contenu |
|---|---|
| **Rôle** | Second moment de campagne, sans concurrencer le Hero |
| **Statut** | Conditionnel |
| **Titre (H2)** | `[Nom réel de la capsule ou collection limitée]` |
| **Phrase** | `[Une phrase courte liée au concept réel]` |
| **CTA** | `[CTA explicite]` — seulement si destination réelle |
| **Conditions** | **Absente du flux** s’il n’existe pas de capsule/collection limitée réelle ; aucun espace réservé vide ; aucun faux contenu |
| **Repli** | Retrait complet |

---

### 4.8 Courriel (inscription)

| Champ | Contenu |
|---|---|
| **Rôle** | Relation directe ; annoncer des collections sans popup agressif |
| **Statut** | Conditionnel (retirer si le formulaire n’est pas fonctionnel) |
| **Titre (H2)** | `Reste dans la boucle` |
| **Phrase** | `Nouveautés et collections — sans bruit inutile.` |
| **Champ** | Libellé / placeholder : `Adresse courriel` |
| **CTA** | `S’inscrire` |
| **Microcopie légale** | `Confidentialité` (lien vers la politique réelle) |
| **États** | Erreur : `Entre une adresse courriel valide.` · Succès : `C’est noté.` |
| **Conditions** | Pas de privilèges fictifs · pas d’urgence · pas de rabais inventé · retirer la section si non fonctionnelle |
| **Variante de titre (Draft)** | `Des nouvelles, quand ça compte` |

---

### 4.9 Footer

| Champ | Contenu |
|---|---|
| **Rôle** | Navigation secondaire, service, légal, signature discrète |
| **Statut** | Draft |
| **Wordmark** | `Flippin’ Maple` (typographique si logo absent) |
| **Groupe boutique** | `Boutique` · `Nouveautés` · `Essentiels` |
| **Groupe marque** | `À propos` · `Contact` |
| **Groupe service** | `Livraison` · `Retours` |
| **Groupe légal** | `Confidentialité` · `Conditions` |
| **Réseaux** | Uniquement les comptes **réels** disponibles |
| **Notes** | Pas de H1 · pas de `NO FIXED LINE.` répété · pas de colonnes vides · pas de CTA marketing vague |
| **À compléter** | Pages réellement publiées ; URLs confirmées ; réseaux confirmés |

---

## 5. Page d’accueil — adaptation anglaise canadienne

Même ordre et même hiérarchie. `NO FIXED LINE.` **inchangé**.

---

### 5.1 Header

| Champ | Contenu |
|---|---|
| **Statut** | Draft |
| **Accessible label** | `Flippin’ Maple — Home` |
| **Nav (working)** | `Shop` · `New` · `Essentials` · `About` |
| **Utilities** | `Account` · `Cart` |

---

### 5.2 Hero

Natural Canadian English adaptation — not a word-for-word translation. Status : **Draft**.

#### Proposition A — principale (Draft)

| | |
|---|---|
| **EN** | Eyebrow `FLIPPIN’ MAPLE` · H1 `NO FIXED LINE.` · Support `An independent Canadian brand. Skate is the starting point, not the limit.` · CTA `Shop all` |
| **Justification (internal)** | Matches FR intent: clear brand ID, Canadian independence, skate as origin not ceiling ; `NO FIXED LINE.` carries attitude ; short and layout-ready ; CTA leads to the shop. |
| **Main risk (internal)** | `NO FIXED LINE.` still needs legal validation. “Canadian brand” means brand identity/origin — **not** made-in-Canada manufacturing ; reassess before publish if the page context blurs that line. |

#### Proposition B — conditionnelle (Draft)

Only if a **real campaign title** replaces the signature in the Hero. Never invent that title. Then `NO FIXED LINE.` may title the Déclaration (legal validation still required).

| | |
|---|---|
| **EN** | Eyebrow `FLIPPIN’ MAPLE` · H1 `[Real campaign title]` · Support `An independent Canadian brand. Skate is the starting point, not the limit.` · CTA `Shop all` |
| **Justification (internal)** | Same support as A when Hero is campaign-led ; CTA stays shop-bound. |
| **Main risk (internal)** | Must not invent a campaign title. Same “Canadian brand” ≠ manufacturing claim. |

---

### 5.3 Products (Primary selection)

| Champ | Contenu |
|---|---|
| **Statut** | Draft structure · À compléter (live data) |
| **Section H2** | `Selection` |
| **Section link** | `Shop all` |
| **Product card** | `[Product name]` · `[Price]` · variant only if useful |

---

### 5.4 Brand declaration

| Champ | Contenu |
|---|---|
| **Statut** | Draft |
| **H2 (main)** | `Your line. Your pace.` |
| **Body (main)** | `Flippin’ Maple draws a simple idea from skate culture: choose your own direction. Movement, freedom, and quiet confidence shape the brand without tying you to a single scene. Move at your own pace. Change direction when you choose.` |
| **Optional CTA** | `About` — only if a real destination exists ; do not invent a route |
| **Rule** | If Hero uses `NO FIXED LINE.` (proposition A), keep title `Your line. Your pace.` and do not repeat the signature. If Hero uses a real campaign title (proposition B), Déclaration may use `NO FIXED LINE.` as title with the same body ; legal validation remains required. |

---

### 5.5 Editorial (matter / territory)

| Champ | Contenu |
|---|---|
| **Statut** | Conditional |
| **H2** | `[Real editorial title — working example: Matter and territory]` |
| **Body** | `[Short factual or editorial paragraph: visible material, place, season, movement — no invented manufacturing story]` |
| **Optional link** | `Read more` / `About` — real destination only |
| **Fallback** | Title + short link if copy ready but image missing ; otherwise remove section |

**Working example (not publishable without real asset/context) :**

Title : `Matter and territory`
Body : `Texture, cut, cold city air. Concrete details — not a manufacturing legend.`

---

### 5.6 Categories

| Champ | Contenu |
|---|---|
| **Statut** | Draft structure · À compléter |
| **H2** | `Categories` |
| **Working labels (unlocked)** | `Tees` · `Hoodies` · `[Third real category only if validated]` |
| **Note** | `Hoodies` used as natural EN for « cotons ouatés » — not a slang flourish |

---

### 5.7 Capsule

| Champ | Contenu |
|---|---|
| **Statut** | Conditional |
| **H2** | `[Real capsule or limited-collection name]` |
| **Line** | `[One short line tied to the real concept]` |
| **CTA** | `[Explicit CTA]` — only with a real destination |
| **Fallback** | Full removal if no real capsule |

---

### 5.8 Email signup

| Champ | Contenu |
|---|---|
| **Statut** | Conditional |
| **H2** | `Stay in the loop` |
| **Line** | `New drops and collections — without the noise.` |
| **Field** | `Email address` |
| **CTA** | `Subscribe` |
| **Legal** | `Privacy` |
| **States** | Error : `Enter a valid email address.` · Success : `You’re on the list.` |
| **Title variant (Draft)** | `Updates when they matter` |

---

### 5.9 Footer

| Champ | Contenu |
|---|---|
| **Statut** | Draft |
| **Wordmark** | `Flippin’ Maple` |
| **Shop** | `Shop` · `New` · `Essentials` |
| **Brand** | `About` · `Contact` |
| **Service** | `Shipping` · `Returns` |
| **Legal** | `Privacy` · `Terms` |
| **Social** | Real accounts only |
| **Rule** | No repeated `NO FIXED LINE.` · no empty columns · no vague marketing CTAs |

---

## 6. Inventaire des CTA

| Section | Fonction | Français | Anglais | Destination attendue | Statut | Dépendance |
|---|---|---|---|---|---|---|
| Header | Accueil | Flippin’ Maple — Accueil | Flippin’ Maple — Home | Page d’accueil | Draft | Wordmark / route accueil |
| Header | Boutique | Boutique | Shop | Boutique / catalogue | Draft | Page boutique réelle |
| Header | Nouveautés | Nouveautés | New | Liste nouveautés ou filtre | Draft | Destination réelle |
| Header | Essentiels | Essentiels | Essentials | Collection/filtre essentiels | Draft | Destination réelle |
| Header | À propos | À propos | About | Page à propos | Draft | Page existante |
| Header | Compte | Compte | Account | Compte / connexion | Draft | Auth réelle |
| Header | Panier | Panier | Cart | Panier | Draft | Panier réel |
| Hero A | Voir boutique | Voir la boutique | Shop all | Boutique | Draft | Boutique réelle ; signature juridiquement Ouverte |
| Hero B | Voir boutique | Voir la boutique | Shop all | Boutique | Draft | Uniquement si proposition B (titre de campagne réel) |
| Produits | Voir boutique | Voir la boutique | Shop all | Boutique | Draft | — |
| Produits | Fiche | `[Nom du produit]` (carte) | `[Product name]` | Fiche produit | À compléter | Produit réel |
| Déclaration | À propos (opt.) | À propos | About | Page à propos | Draft | Page existante |
| Éditorial | Suite (opt.) | Lire la suite / À propos | Read more / About | Contenu éditorial ou à propos | Conditionnel | Contenu réel |
| Catégories | Catégorie | `[Nom catégorie]` | `[Category name]` | Liste/filtre catégorie | À compléter | Catégorie réelle |
| Capsule | Capsule | `[CTA capsule]` | `[Capsule CTA]` | Capsule réelle | Conditionnel | Capsule réelle |
| Courriel | Inscription | S’inscrire | Subscribe | Soumission formulaire | Conditionnel | Formulaire fonctionnel |
| Courriel | Légal | Confidentialité | Privacy | Politique de confidentialité | Draft | Page légale |
| Footer | Liens service/légal | Livraison · Retours · Conditions | Shipping · Returns · Terms | Pages correspondantes | Draft | Pages publiées |

Aucune URL inventée.

---

## 7. Inventaire des contenus dynamiques

| Élément | Donnée requise | Si la donnée existe | Si la donnée manque | Repli permis | Repli interdit |
|---|---|---|---|---|---|
| Produits vedettes | SKU réels + photos cohérentes + prix | Afficher 2–4 cartes | Réduire le nombre ; ne pas inventer | Moins de cartes ; photos cohérentes seulement | Dump Printful · faux produits · faux prix |
| Prix | Prix réel confirmé | Afficher le prix | Masquer ou ne pas publier la carte | « — » uniquement en environnement interne | Prix inventé · « à partir de » trompeur |
| Catégories | Catégories / filtres réels | Afficher 2 (ou 3 validées) | Retirer ou limiter | Uniquement destinations réelles | Catégories fictives |
| Capsule | Collection limitée réelle + actif | Afficher section 7 | Retirer du flux | Aucun espace réservé | Fausse capsule · fausse rareté |
| Éditorial | Texte réel + image crédible (ou texte prêt) | Afficher ou réduire | Retirer ou titre+lien seulement | Titre + lien si texte prêt | Faux article · fabrication inventée |
| Image Hero | Photo campagne crédible | Afficher | Fallback Deep Forest / Charcoal | Fond couleur + texte lisible | Image générique stock non pertinente · texte dans l’image |
| Image catégorie | Visuel réel | Afficher | Tuile texte seule ou retrait | Texte seul si destination réelle | Badge inventé |
| Courriel | Backend inscription fonctionnel | Afficher formulaire | Retirer la section | Lien discret ailleurs **seulement** si prévu et fonctionnel | Formulaire factice · fausse promesse |
| Promo / rabais | Promotion réelle documentée | Hors scope homepage par défaut | Ne rien afficher | — | Urgence · compte à rebours · badge permanent |
| Livraison / retours | Politique confirmée | Lien footer vers page réelle | Lien absent ou page « à venir » hors pub | Libellé neutre vers page existante | « Livraison gratuite » / délais inventés |
| Réseaux sociaux | Comptes réels | Liens footer | Omettre | — | Fausse communauté · compte inventé |
| `NO FIXED LINE.` | Validation juridique | Usage public final possible | Rester en Draft / usage de travail documentaire | Titre de campagne réel en Hero | Traduction · usage comme CTA · répétition |

---

## 8. Champs à compléter

Avant textes finaux :

1. Validation juridique de `NO FIXED LINE.`
2. Décision finale : signature en H1 Hero **ou** titre de campagne réel
3. Textes définitifs Hero (appui) après validation
4. Titre et paragraphe définitifs de la déclaration
5. Noms définitifs de collections
6. Catégories réelles et destinations
7. Produits vedettes (noms, photos, prix, liens)
8. Contenu éditorial réel (ou confirmation de retrait)
9. Capsule réelle (ou confirmation d’absence)
10. Activation réelle du formulaire courriel
11. Pages service : Livraison, Retours, Contact, À propos
12. Politiques Confidentialité et Conditions
13. Preuves factuelles pour toute affirmation produit future
14. Destinations exactes des CTA encore descriptives
15. Comptes de réseaux sociaux réels
16. Choix orthographique final de l’anglais canadien
17. Libellés de navigation définitifs

---

## 9. Affirmations et preuves

| Affirmation | Langue | Type | Preuve nécessaire | Statut preuve | Action |
|---|---|---|---|---|---|
| Marque canadienne / Canadian brand | FR / EN | Identité de marque | Vision (marque canadienne indépendante) | Soutenue comme identité | **Identité / origine de la marque seulement** — ne constitue **pas** une affirmation de fabrication canadienne ; interdits sans preuve : « fabriqué au Canada », « fait au Canada », « conçu au Canada » |
| Indépendante / independent | FR / EN | Positionnement | Vision officielle | Soutenue | Conserver |
| Skate comme point de départ, pas comme limite | FR / EN | Origine culturelle | Vision (skate = origine, pas obligation) | Soutenue | Conserver sans promesse de performance sportive |
| Choisir sa direction / choose your own direction | FR / EN | Attitude | Alignement Vision + `NO FIXED LINE.` | Attitude (non factuelle) | OK comme ton ; pas comme fait mesurable |
| `NO FIXED LINE.` comme signature publique | FR / EN | Signature | Validation juridique | **Ouverte** | Usage Draft seulement jusqu’à validation |
| Nouveautés / collections par courriel | FR / EN | Promesse d’usage | Capacité réelle d’envoi | À confirmer | Ne pas promettre fréquence ni exclusivité |
| Catégories T-shirts / Cotons ouatés | FR | Navigation | Catalogue réel | À confirmer | Remplacer par catégories réelles |
| Tout claim fabrication CA/QC, premium, durable, éthique, limité, gratuit, délai | — | Factuel | Preuve documentée | Absente | **Évité / non utilisé** dans ce Draft |

---

## 10. Décisions rédactionnelles proposées

### Direction déjà validée

- français québécois source et principal ;
- tutoiement ;
- anglais canadien adapté ;
- une langue affichée à la fois ;
- ton direct, calme, mature ;
- `NO FIXED LINE.` en anglais dans les deux versions ;
- POD = moyen de production, pas identité.

### Propositions contenues dans ce document

- Hero A : `NO FIXED LINE.` + appui `Une marque canadienne indépendante…` / `An independent Canadian brand…` ;
- Hero B : titre de campagne réel + même appui ;
- CTA Hero : `Voir la boutique` / `Shop all` ;
- titre de déclaration : `Ta ligne. Ton rythme.` / `Your line. Your pace.` (ou `NO FIXED LINE.` si Hero = campagne) ;
- corps de déclaration FR/EN (propositions principales ci-dessus) ;
- titre produits : `Sélection` / `Selection` ;
- inscription : `Reste dans la boucle` / `Stay in the loop` ;
- microcopie d’erreur/succès courriel ;
- libellés de nav et footer de travail.

### Décisions encore ouvertes

- validation des textes finaux ;
- validation juridique de la signature ;
- placement final de `NO FIXED LINE.` (Hero vs déclaration) ;
- noms produits et collections ;
- preuves factuelles catalogue ;
- destinations exactes de certains CTA ;
- contenu dynamique réel ;
- maintien ou retrait des sections Conditionnelles ;
- ordre final des sections (encore Provisoire/Ouvert dans SPEC/WIREFRAME) ;
- orthographe canadienne anglaise exacte.

---

## 11. Checklist de validation

Pour chaque texte public envisagé :

- [ ] Immédiatement compréhensible
- [ ] Naturel au Québec (FR) / naturel en anglais canadien (EN)
- [ ] Tutoiement cohérent (FR)
- [ ] Mature — ni adolescent ni corporatif
- [ ] Ne ressemble pas à une publicité générique
- [ ] Ne ressemble pas à une marque de sport extrême caricaturale
- [ ] Ne ressemble pas à une marque rustique ou folklorique
- [ ] Aucun slang forcé
- [ ] Aucune affirmation non soutenue
- [ ] Fonction UX claire (surtout CTA)
- [ ] Adaptation EN possible sans perdre l’intention
- [ ] Longueur compatible Hero / déclaration / cartes
- [ ] Fonctionne sans logo final (wordmark typographique)
- [ ] `NO FIXED LINE.` non excessif (un usage dominant max)
- [ ] Signature non traduite
- [ ] Validation juridique de la signature toujours traitée comme Ouverte
- [ ] Aucun faux produit, prix, témoignage, communauté ou urgence

---

## 12. Notes d’autorité et tensions sources (pour le rapport)

Tensions détectées dans les documents sources (non « corrigées » ici) :

1. **Ordre final des sections** : le stack 1–9 est la direction de travail commune ; SPEC/WIREFRAME marquent encore l’ordre définitif comme Provisoire/Ouvert, tandis que VISUAL_DESIGN valide la « structure générale ».
2. **Nom de la section 6** : SPEC parle parfois d’« Essentiels ou catégories » ; WIREFRAME/VISUAL disent « Catégories ».
3. **Courriel conditionnel** : retrait si non fonctionnel explicite dans WIREFRAME/VISUAL ; moins explicite dans le tableau de fallback SPEC — ce Draft suit le retrait.
4. **`NO FIXED LINE.`** : règles d’usage largement Validées ; validation juridique Ouverte partout.

Ce document suit le **wireframe** pour l’ordre et `VOICE.md` pour le registre.

---

**Fin du Draft — Homepage Copy v1.**
