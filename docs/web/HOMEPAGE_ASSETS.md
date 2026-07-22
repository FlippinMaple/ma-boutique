# Flippin’ Maple — Homepage Assets

## 1. Métadonnées

| Champ | Valeur |
|---|---|
| **Titre** | Homepage Assets |
| **Chemin** | `docs/web/HOMEPAGE_ASSETS.md` |
| **Statut** | **Draft — Homepage Assets v1** |
| **Nature** | Plan d’actifs visuels soumis à validation — **aucun actif n’est approuvé définitivement** |
| **Date** | 2026-07-22 |
| **Portée** | Page d’accueil uniquement |
| **Langue du document** | Français |
| **Documents sources** | `docs/00_PROJECT_MASTER.md` · `docs/brand/VISION_AND_POSITIONING.md` · `docs/brand/VISUAL_IDENTITY.md` · `docs/brand/VOICE.md` · `docs/web/HOMEPAGE_SPEC.md` · `docs/web/HOMEPAGE_WIREFRAME.md` · `docs/web/HOMEPAGE_VISUAL_DESIGN.md` · `docs/web/HOMEPAGE_COPY.md` |
| **État du logo** | Final **absent** |
| **État de la photographie** | Aucune photographie de marque locale dans le dépôt |
| **État de l’inventaire existant** | Quasi vide localement ; produits = URL distantes Printful (hors page d’accueil actuelle) |
| **Exclusions** | Intégration React · création/téléchargement d’images · i18n · routes · backend · validation juridique de `NO FIXED LINE.` |
| **Principe de validation** | Aucune autorisation d’intégration implicite ; aucun actif présenté comme final |

Les identifiants `HOME-*` sont **documentaires**, pas des noms de fichiers définitifs.

---

## 2. Résumé exécutif

Les actifs servent la hiérarchie éditoriale de la page d’accueil : installer la marque, montrer des produits crédibles, respirer, orienter — sans transformer chaque section en bloc photographique.

**Familles d’actifs :** marque (wordmark) · Hero · produits · motif déclaration · éditorial · catégories · capsule · courriel (optionnel) · footer · textures · icônes.

| Classe | Exemples | Rôle |
|---|---|---|
| Actif de marque | Wordmark, futur logo, motif érable abstrait | Identité |
| Actif produit | Cartes sélection, tuiles catégorie | Commerce crédible |
| Actif éditorial / campagne | Hero, éditorial, capsule | Attitude et territoire |
| Actif décoratif | Grain, texture, séparateurs | Atmosphère secondaire |
| Actif utilitaire | Icônes nav, compte, panier, sociaux | Fonction |

**Absolument requis (MVP crédible) :** wordmark typographique ou SVG mono provisoire · stratégie Hero (photo **ou** fallback couleur) · 2–3 images produit cohérentes · tuiles catégorie seulement si destinations réelles.

**Conditionnels :** éditorial · capsule · motif déclaration · texture courriel · icônes sociales · vidéo Hero.

**Peuvent attendre :** shooting idéal · portraits secondaires · détails matière · campagnes futures · logo final · favicon marque.

**Risques principaux :** Hero générique · folklore canadien · mockups POD comme seule identité · confusion « marque canadienne » = fabrication · recadrage mobile impossible · provenance inconnue · faux contenu.

---

## 3. Audit des actifs existants

Audit en lecture seule (2026-07-22). Aucun fichier déplacé, renommé ou téléchargé.

### 3.1 Emplacements observés

| Chemin | Existe | Observation |
|---|---|---|
| `public/` | Oui | Contient `vite.svg` (favicon scaffold) |
| `src/assets/` | Oui | Contient `react.svg` (scaffold Vite, non utilisé) |
| `src/images/` | **Non** | — |
| `src/components/` | Oui | Pas d’imports d’images locales |
| `src/pages/` | Oui | `Home.jsx` = stub texte ; Shop/ProductDetail = `<img>` distantes |

### 3.2 Inventaire local

| Chemin | Format | Taille approx. | Usage actuel | Type | Qualité / cohérence | Statut recommandé |
|---|---|---|---|---|---|---|
| `public/vite.svg` | SVG | ~1,5 Ko | Favicon `index.html` | Scaffold Vite | Non marque | **À remplacer** (favicon marque futur) |
| `src/assets/react.svg` | SVG | ~4 Ko | Aucun import | Scaffold Vite | Non marque | **Obsolète** / **Non pertinent** |

Aucune image `png` / `jpg` / `jpeg` / `webp` / `avif` / `gif` / `ico` de marque dans l’arbre de travail (hors `node_modules` / builds).

**Provenance ou droits à confirmer** pour tout actif futur avant publication.

### 3.3 Actifs distants (hors dépôt)

| Source | Nature | Usage actuel | Pertinence homepage | Statut recommandé |
|---|---|---|---|---|
| URL Printful (`thumbnail_url` / `preview_url`) en base MySQL | Mockups / previews produit | `Shop.jsx`, `ProductDetail.jsx`, `Checkout.jsx` | Possibles **provisoires** pour cartes produit si traitement cohérent | **Provisoire** · **À remplacer** progressivement par photos éditoriales |
| CDN Printful (hôtes des URL) | Distant | Via API produits | Ne doit pas porter seul l’identité Hero | **Non utilisé** comme Hero / déclaration / éditorial |

### 3.4 Code / composants liés (lecture seule)

| Élément | Observation |
|---|---|
| `src/pages/Home.jsx` | Stub ; pas de Hero ni d’images |
| Carrousel / bannière homepage | **Absent** |
| `ProductCard.jsx` | Orphelin (non importé) ; Shop utilise ses propres cartes |
| `aspect-ratio` CSS | Non utilisé actuellement |
| `vite.config.js` | Pas de pipeline image dédié (AVIF/WebP) |
| Imports d’images locales dans `src/` | **Aucun** |

### 3.5 Synthèse audit

Le dépôt est **piloté par URL Printful**, pas par une bibliothèque d’actifs de marque. Les actifs homepage décrits dans les specs **n’existent pas encore** comme fichiers ni composants.

---

## 4. Inventaire global des besoins

Ratios et pixels = **Provisoires** · `Cible de production — à confirmer à l’intégration`.

| ID | Section | Nom fonctionnel | Rôle | Priorité | Statut | Format principal | Ratio principal | Variantes | Contenu attendu | Dépendance | Repli | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HOME-BRAND-01 | Header / Footer | Wordmark Flippin’ Maple | Identification | P1 | À produire (typo OK) | SVG | Adaptatif | Clair / sombre éventuel | Wordmark mono | Logo final absent | Texte typographique | Contraste + accessibilité |
| HOME-ICON-01 | Header | Icônes compte / panier / menu | Navigation | P1 | À produire ou système | SVG | — | États hover/focus | Symboles sobres | UI | Texte + aria | Accessibilité |
| HOME-ICON-02 | Header | Sélecteur de langue | Futur | P3 | Conditionnel / Ouvert | SVG ou texte | — | FR / EN | Discret | i18n technique | Texte `FR`/`EN` | Hors portée actuelle |
| HOME-HERO-01 | Hero | Photo campagne principale | Moment de marque | P1 | À produire / sélectionner | AVIF/WebP | 16:9 ou 3:2 | Desktop / tablette / mobile | Urbain nordique, mature | Texte COPY · zone lecture | Deep Forest / Charcoal | DA + droits + juridique signature |
| HOME-HERO-02 | Hero | Recadrage mobile | Lisibilité mobile | P1 | À produire | AVIF/WebP | 4:5 | Mobile | Point focal protégé | HOME-HERO-01 | Même fallback couleur | Cadrage mobile |
| HOME-PRODUCT-01…03 | Produits | Cartes sélection | Preuve vêtement | P1 | À sélectionner | AVIF/WebP | 4:5 | 2–4 cartes | Produits réels cohérents | Catalogue réel | Réduire le nombre | Cohérence set |
| HOME-DECL-01 | Déclaration | Motif veinage érable sombre | Atmosphère secondaire | P2 | Conditionnel | SVG/WebP | Tuile seamless | Opacité basse | Grain abstrait | Texte déclaration | Aplat couleur | Ne pas concurrencer le texte |
| HOME-EDIT-01 | Éditorial | Matière / territoire | Contraste tactile | P2 | Conditionnel | AVIF/WebP | 3:4 ou 4:5 | Bureau / mobile | Matière réelle | Texte réel | Retirer section | Pas de fausse fabrication |
| HOME-CAT-01…02 | Catégories | Tuiles catégorie | Entrée catalogue | P1 | À produire si catégories réelles | AVIF/WebP | 4:5 ou 3:4 | 2 (3 si réel) | Univers proche Hero | Destinations réelles | Retirer / limiter | Pas de fausse catégorie |
| HOME-CAP-01 | Capsule | Bannière capsule | Campagne 2 | P3 | Conditionnel | AVIF/WebP | 2:1 bureau | Mobile 4:5/3:4 | Capsule réelle | Titre + destination | **Retrait complet** | Pas de faux lancement |
| HOME-MAIL-01 | Courriel | Texture optionnelle | Atmosphère légère | P3 | Optionnel | SVG/WebP | — | Très bas contraste | Motif discret | Formulaire fonctionnel | Aucune image | Lisibilité formulaire |
| HOME-FOOT-01 | Footer | Wordmark + sociaux | Navigation secondaire | P1 / P3 | Wordmark P1 ; sociaux si réels | SVG | — | — | Comptes réels seulement | Réseaux existants | Omettre icônes | Pas de faux réseaux |
| HOME-TEX-01 | Global | Textures / grain | Décoratif | P3 | Provisoire | SVG/CSS | — | Mobile plus discret | Northern Utility | Performance | Sans texture | Une section max typique |
| HOME-FAV-01 | Site | Favicon / symbole | Navigateur | P2 | À produire | SVG/ICO | 1:1 | Multi-tailles | Futur symbole | Logo | Garder scaffold temporairement | Ne pas simuler logo final |

---

## 5. Header

| Besoin | Direction |
|---|---|
| Wordmark temporaire | Typographique **ou** SVG monochrome provisoire `[PLACEHOLDER — WORDMARK FLIPPIN’ MAPLE]` |
| Logo final | **Absent** — ne pas inventer de symbole, feuille, flip, miroir |
| Icônes compte / panier / menu | SVG sobres, traits fins, contraste Ink Black sur Maple Bone |
| Sélecteur de langue | Futur, discret, fonctionnel — **conception détaillée hors portée** |
| Favicon | Remplacer `vite.svg` plus tard ; pas de faux logo |
| Clair / foncé | Header clair par défaut (Maple Bone) ; variante sticky sombre = **Provisoire** |
| Accessibilité | Lien accessible `Flippin’ Maple — Accueil` / `Home` ; focus visible ; pas d’info uniquement dans l’icône |

**Peut rester typographique :** nom de marque entier.
**Ne pas recréer :** faux logo, effet flip, feuille d’érable décorative collée au wordmark.

Formats vectoriels futurs recommandés : **SVG** (wordmark, icônes).

---

## 6. Hero

### 6.1 Rôle et priorité

| Champ | Contenu |
|---|---|
| **Rôle** | Installer Flippin’ Maple ; soutenir l’attitude ; laisser lire le texte COPY |
| **Priorité** | Critique (P1) |
| **Statut** | Draft — actif **à produire / sélectionner** |
| **Placeholder** | `[PLACEHOLDER — IMAGE HERO CAMPAGNE PRINCIPALE]` |

### 6.2 Texte à protéger (COPY — Draft)

**FR (une langue à la fois) :**

- Sur-titre : `FLIPPIN’ MAPLE`
- H1 : `NO FIXED LINE.` *(usage public final soumis à validation juridique — Ouvert)*
- Appui : `Une marque canadienne indépendante. Le skate comme point de départ, pas comme limite.`
- CTA : `Voir la boutique`

**EN :**

- Eyebrow : `FLIPPIN’ MAPLE`
- H1 : `NO FIXED LINE.`
- Support : `An independent Canadian brand. Skate is the starting point, not the limit.`
- CTA : `Shop all`

Prévoir une **zone de lecture crédible** pour les longueurs FR et EN séparément — jamais deux langues simultanées.

### 6.3 Direction photographique

| Aspect | Direction de travail |
|---|---|
| Sujet | 1–2 adultes ; vêtements sobres ; environnement urbain canadien froid |
| Attitude | Mature, calme, vivante ; streetwear / workwear crédible |
| Mouvement | Marche, attente, préparation, transition, interaction avec l’espace — **pas** figure spectaculaire obligatoire |
| Lumière | Naturelle, couverte ; peu de saturation |
| Palette photo | Charbon, noir, blanc cassé, gris froid, vert profond discret |
| Contexte | Béton, asphalte, métal, bois clair — nordique urbain |
| Planche | Possible seulement si naturelle et non démonstrative |
| Expression | Humaine, non forcée |

### 6.4 Cadrage et ratios (**Provisoires**)

| Contexte | Ratio | Cible production | Point focal | Zone texte |
|---|---|---|---|---|
| Bureau | 16:9 ou 3:2 | ≥ 2400 × 1350 px | Sujet tiers droit | Tiers gauche / négatif |
| Tablette | Recadrage contrôlé | À confirmer | Conserver visage + vêtement | Marges sûres |
| Mobile | 4:5 | ≥ 1600 × 2000 px si prise distincte | Centre protégé | Texte sous ou sur zone claire |

**Ne pas présumer** qu’une seule image se recadre correctement partout. Une **prise mobile distincte** peut être préférable.

Split de travail ~40 % texte / 60 % image (**Provisoire**). Overlay texte sur photo = **non défaut** (seulement si contraste garanti).

### 6.5 Replis

| Situation | Repli |
|---|---|
| Pas de photo adéquate | Fond **Deep Forest** ou **Charcoal** + texte Maple Bone — **jamais** image générique temporaire |
| Logo absent | Wordmark typographique ; signature **distincte** du logo |
| Signature non validée juridiquement | Rester Draft / prévoir titre de campagne réel alternatif (COPY prop. B) |

### 6.6 Risque « marque canadienne »

L’appui évoque une **marque canadienne**. L’image **ne doit pas** suggérer un atelier, une usine ou une fabrication canadienne. Territoire / climat / urbain = OK. Scène de production = **interdit** sans preuve.

### 6.7 Interdits Hero

Drapeau · feuille d’érable visible · chalet · bûcheron · sirop · castor/orignal · trick cliché · pose adolescente · néons · logos concurrents · texte dans l’image · filtres orange/teal · studio trop propre comme seule identité · imitation Nike/Vans/Supreme/Patagonia.

### 6.8 Vidéo

**Non prérequis.** Possibilité future seulement : image fixe de repli · version mobile · `prefers-reduced-motion` · poids maîtrisé · sans dépendance au son · décision technique ouverte.

### 6.9 Alt text

Structure à compléter après image réelle :
`[Personne(s) / vêtement(s) / action / lieu réellement visibles — sans slogan]`
Pas de faux alt précis tant que l’image n’existe pas.

---

## 7. Produits

| Champ | Direction |
|---|---|
| **Placeholder** | `[PLACEHOLDER — PHOTOGRAPHIES PRODUITS COHÉRENTES]` |
| **Ratio** | **4:5** (Validé dans les specs homepage) |
| **Cible** | ≥ 1600 × 2000 px — `Cible de production — à confirmer à l’intégration` |
| **Nombre visible** | 3 recommandés · 4 si curation forte · **2** si seulement 2 pièces fortes |
| **Cohérence** | Même fond, échelle, lumière, cadrage |
| **Fond** | Maple Bone, gris très clair, ou environnement sobre partagé |
| **Porté vs à plat** | Choisir **une** stratégie par set |
| **Mockups Printful** | Utilisables **provisoirement** si cohérents ; ne portent pas l’identité de la page ; à remplacer progressivement |
| **Hover** | Dépendance future éventuelle — non obligatoire |
| **Image manquante** | Ne pas inventer ; retirer la carte ou réduire la grille |
| **Alt** | Nom + couleur + type de vêtement — pas de promo |
| **Interdit** | Dump Printful · faux produits · faux prix · logos autres marques · styles incompatibles mélangés |

### Distinctions

| Type | Usage |
|---|---|
| Image catalogue / mockup | Fiche et panier ; provisoire homepage |
| Image carte produit homepage | Set cohérent 4:5, curation courte |
| Image éditoriale | Hero / éditorial — pas pour remplir la grille |
| Image fiche produit | Hors scope homepage (peut différer) |

**Règle :** ne jamais remplir la section avec des produits faibles pour atteindre un nombre.

---

## 8. Déclaration de marque

**Photographie : non requise.**

Le texte, la composition sombre, la couleur et l’espace suffisent (titre `Ta ligne. Ton rythme.` / `Your line. Your pace.` + paragraphe COPY).

| Actif optionnel | HOME-DECL-01 |
|---|---|
| Placeholder | `[PLACEHOLDER — MOTIF DE VEINAGE D’ÉRABLE SOMBRE]` |
| Rôle | Secondaire ; ne pas concurrencer le texte |
| Traitement | Maple Bone ~5–8 % sur Charcoal / Deep Forest |
| Nature | Veinage abstrait, seamless, contemporain — **pas** bois rustique / chalet |
| Repli | Aplat couleur uniquement |
| Interdit | Deuxième Hero photographique · motif dominant · motif derrière petits textes |

Si Hero = `NO FIXED LINE.`, la déclaration **ne répète pas** la signature en grand titre.

---

## 9. Éditorial — matière et territoire

**Statut : Conditionnel.**

| Champ | Direction |
|---|---|
| Placeholder | `[PLACEHOLDER — IMAGE ÉDITORIALE MATIÈRE ET TERRITOIRE]` |
| Sujets possibles | Textile, coupe, béton, asphalte, bois clair abstrait, détail de vêtement, main, moment de préparation |
| Présence humaine | Optionnelle ; partielle OK |
| Ratios | 3:4 ou 4:5 (**Provisoire**) |
| Cible | ≥ 1800 × 2400 px si vertical |
| Lumière | Naturelle, désaturée, tactile |
| Cohérence Hero | Même univers, cadrage plus rapproché / matière |
| Texte | Requis avant publication (structure COPY) |
| Si pas d’image crédible | Retirer **ou** titre + lien si texte prêt |
| Si texte non prêt | Retirer |
| Interdit | Atelier inventé · fabrication locale inventée · cabane à sucre · chemise bûcheron · feuille d’érable déco · sepia folklorique |

---

## 10. Catégories

| Champ | Direction |
|---|---|
| Placeholder | `[PLACEHOLDER — IMAGE DE CATÉGORIE]` × N |
| Nombre | **2** recommandées · 3 seulement si catégorie réelle |
| Ratio | 4:5 ou 3:4 (**Provisoire**) |
| Titre | Texte réel **hors** image |
| Contenu | Produit ou personne — cohérent avec Hero, compositions distinctes |
| Destination | Liste / filtre **réel** uniquement |
| Différenciation | Éviter de cloner les cartes produit |
| Repli | Retirer la section ou limiter aux destinations existantes |
| Interdit | Fausse catégorie · image « pour remplir » |

Libellés COPY de travail (non verrouillés) : `T-shirts` / `Cotons ouatés` · EN `Tees` / `Hoodies`.

---

## 11. Capsule ou campagne secondaire

**Conditionnel.** Absent = **retrait complet**, aucun espace réservé.

| Champ | Direction |
|---|---|
| Placeholder | `[PLACEHOLDER — BANNIÈRE CAPSULE]` |
| Ratio bureau | 2:1 (cible ≥ 2400 × 1200) |
| Mobile | 4:5 ou 3:4 |
| Relation Hero | Distincte ; ne pas concurrencer |
| Requis | Titre réel · concept réel · destination réelle |
| Interdit | Fausse capsule · date inventée · urgence · compte à rebours |

---

## 12. Courriel

**Image non nécessaire.** Privilégier simplicité, contraste, lisibilité, fonctionnalité.

| Élément | Direction |
|---|---|
| Actif | Aucun requis |
| Texture | Optionnelle, très bas contraste (HOME-MAIL-01) |
| Fond UI | Weathered Maple pâle ou Maple Bone |
| Repli | Formulaire seul |
| Formulaire non fonctionnel | **Retirer la section** — pas de faux formulaire |
| Popup agressif | Interdit |

---

## 13. Footer

| Élément | Direction |
|---|---|
| Wordmark | Même stratégie que Header (typo ou SVG provisoire) |
| Logo final | Futur remplacement sans casser la structure |
| Sociaux | Icônes **uniquement** pour comptes réels |
| Contraste | Fond Ink Black / Charcoal · texte Maple Bone |
| Signature `NO FIXED LINE.` | **Ne pas** répéter |
| Repli réseaux | Omettre le groupe |

---

## 14. Textures et éléments décoratifs

Direction : **Northern Utility Editorial**.

| Élément | Rôle | Fréquence max | Opacité travail | Mobile | Repli |
|---|---|---|---|---|---|
| Veinage érable abstrait | Matière secondaire | ~1 section homepage | Clair ~4–6 % · sombre ~5–8 % | Plus discret | Sans texture |
| Grain léger | Présence tactile | Rare | Très bas | Réduire | Sans grain |
| Béton / papier / textile (abstrait) | Exploration | Rare | Bas | — | Aplat |
| Lignes / séparateurs | Structure | Sobres | — | OK | Sans |
| Aplats palette | Fond de section | Selon rythme clair/sombre | — | OK | — |

**Érable abstrait :** contemporain, fibreux/topographique, **pas** chalet, **pas** substitut logo, **pas** partout, distinct du bois rustique.

Performance : préférer SVG/CSS légers ; éviter grosses textures bitmap répétées.

---

## 15. Palette appliquée aux actifs

Hex = direction de travail (**Provisoire** dans VISUAL_IDENTITY — ne pas modifier ici).

| Nom | Hex | Usage actifs / fonds |
|---|---|---|
| Ink Black | `#11110F` | Texte, structure, CTA, footer |
| Maple Bone | `#F1ECE2` | Fond dominant, cartes, header |
| Charcoal | `#292A27` | Surfaces sombres, déclaration |
| Deep Forest | `#304238` | Fallback Hero, déclaration |
| Weathered Maple | `#B6A184` | Transition, courriel pâle |
| Cold Concrete | `#737772` | Info secondaire seulement |
| Oxide Red | `#893B32` | Accent **rare** — jamais CTA par défaut |

**Photo :** saturation basse · température froide-neutre · contraste suffisant pour typo Maple Bone ou Ink Black selon fond.
**Interdit :** traitements flashy, teal/orange, HDR excessif, mélange de looks incompatibles dans un même set.

---

## 16. Ratios et variantes responsives

Tout ratio/pixel non figé = **Provisoire** · `Cible de production — à confirmer à l’intégration`.

| Usage | Bureau | Tablette | Mobile | Recadrage | Point focal | Zone sûre | Variante séparée | Format | Repli |
|---|---|---|---|---|---|---|---|---|---|
| Hero | 16:9 / 3:2 | Contrôlé | 4:5 | Limité | Droit (bureau) / centre (mobile) | Texte FR/EN | Souvent oui (mobile) | AVIF/WebP | Couleur |
| Produit | 4:5 | 4:5 | 4:5 | Minimal | Produit centré | Hors texte | Non | AVIF/WebP | Retirer carte |
| Éditorial | 3:4 / 4:5 | Idem | Idem | Modéré | Matière | — | Selon besoin | AVIF/WebP | Retirer section |
| Catégorie | 4:5 / 3:4 | Idem | Idem | Modéré | Sujet distinct | Titre hors image | Non | AVIF/WebP | Retirer tuile |
| Capsule | 2:1 | Recadrage | 4:5 / 3:4 | Fort | Concept | Titre/CTA | Souvent oui | AVIF/WebP | Retrait section |
| Motif | Seamless | — | — | Tuile | — | Loin du texte | — | SVG | Aplat |
| Wordmark | Adaptatif | — | — | — | — | Contraste | Clair/sombre | SVG | Typo |

**Interdit :** agrandir une petite image pour « faire le poids ».

---

## 17. Formats et performance

### Recommandations générales (futures)

- AVIF si pipeline futur compatible ;
- WebP comme moderne principal ;
- JPEG si nécessaire ;
- PNG pour transparence spécifique ;
- SVG pour wordmark, icônes, motifs ;
- pas de texte essentiel dans l’image ;
- sources suffisamment grandes puis compression ;
- lazy-load hors Hero ;
- Hero prioritaire (`fetchpriority` / équivalent futur) ;
- `srcset` / densités — décision technique **Ouverte** ;
- largeur/hauteur connues pour éviter CLS ;
- solution sans JS lorsque pertinente.

### Compatibilité observée dans le dépôt

| Observation | Statut |
|---|---|
| Vite standard, pas de plugin image dédié | Constat |
| Produits = `<img src={url distante}>` | Constat |
| Pas d’AVIF/WebP locaux de marque | Constat |
| `aspect-ratio` CSS absent aujourd’hui | Constat |

### Décisions techniques encore ouvertes

Pipeline d’optimisation · CDN · génération `srcset` · politique de cache · remplacement progressif des URL Printful.

---

## 18. Accessibilité

| Famille | Informative / décorative | Alt | Notes |
|---|---|---|---|
| Hero | Informative | Structure à compléter | Texte UI hors image |
| Produits | Informative | Nom / couleur / type | Prix en texte |
| Catégories | Informative | Description courte du sujet | Titre en texte |
| Éditorial | Informative | Matière / contexte réel | — |
| Capsule | Informative | Selon contenu réel | — |
| Motif / grain | Décorative | `alt=""` ou CSS | Jamais seule source d’info |
| Wordmark | Informative (lien) | Nom de la marque | — |
| Icônes UI | Selon cas | Texte accessible voisin | — |

Contraste du texte superposé : viser lisibilité immédiate ; préférer split au overlay.
Mouvement futur : respecter `prefers-reduced-motion` ; aucune animation indispensable à la compréhension.

---

## 19. Droits, provenance et consentement

Checklist avant tout usage public :

- [ ] Licence / propriété
- [ ] Usage commercial
- [ ] Territoire
- [ ] Durée
- [ ] Modification / recadrage autorisés
- [ ] Réseaux sociaux / publicité
- [ ] Droit à l’image des personnes
- [ ] Consentement écrit
- [ ] Lieux privés autorisés
- [ ] Marques tierces non visibles (ou autorisées)
- [ ] Planches / vêtements concurrents non mis en avant
- [ ] Vidéo / audio : droits séparés si applicable

**Aucun actif n’est publiable sans provenance confirmée.**
Si inconnue : `Provenance ou droits à confirmer`.

---

## 20. Plan de production photographique

### Priorité 1 — nécessaire avant intégration visuelle crédible

| Famille | Objectif | Sujet / plan | Orientation | Vêtements | Lieu | Lumière | Ratio | Mobile | Qté min | Dépendance |
|---|---|---|---|---|---|---|---|---|---|---|
| Hero | Attitude + zone texte | 1–2 personnes, marche/attente | H + V | Pièces sobres marque ou neutres | Urbain froid | Couverte | 16:9/3:2 + 4:5 | Variante | 1 set utilisable | COPY Hero |
| Produits | Curation | Produits réels | V 4:5 | Sélection validée | Fond cohérent | Soft uniforme | 4:5 | Même | 2–3 | Catalogue |
| Catégories | Entrée shop | 2 sujets distincts | V | Liés catégories réelles | Même univers | Cohérente | 4:5/3:4 | Même | 2 | Destinations |

### Priorité 2 — enrichissement

Éditorial matière · détails textile · environnement · portraits secondaires · motif SVG.

### Priorité 3 — campagnes futures

Capsule réelle · collections · collaborations **réelles** · saisonnier.

**MVP shooting :** Hero (ou fallback couleur) + set produit cohérent + 2 catégories si réelles.
**Idéal :** + éditorial + motif + recadrages dédiés + éventuelle campagne.

Budget pro **non présumé**. Licence / sélection existante / shooting léger = options **Ouvertes**.

---

## 21. Plan minimal viable

| Requis | Peut utiliser un repli | Retirer si absent | Plus tard | Ne jamais simuler |
|---|---|---|---|---|
| Wordmark typo | SVG provisoire | — | Logo final | Faux logo |
| Hero lisible | Fond Deep Forest / Charcoal | — | Photo idéale | Image générique stock non pertinente |
| 2–3 produits cohérents | Mockups Printful **traités** de façon uniforme | Cartes individuelles | Photos éditoriales | Faux SKU / faux prix |
| Catégories | — | Section entière | 3e catégorie | Fausse catégorie |
| Déclaration | Aplat sans motif | — | Motif SVG | 2e Hero photo |
| Éditorial / Capsule / Courriel | — | Section | Production | Faux contenu |

Le MVP reste cohérent **sans** grand shooting complet.

---

## 22. Plan idéal (moyen terme)

- Hero photo + variante mobile dédiée ;
- set produit photographié (porté ou studio cohérent) ;
- 2–3 catégories distinctes ;
- éditorial matière/territoire ;
- motif veinage SVG soigné ;
- wordmark / logo final ;
- favicon marque ;
- capsule réelle le cas échéant ;
- optimisation AVIF/WebP + `srcset` ;
- éventuelle vidéo courte **non obligatoire**.

Le plan idéal **n’est pas** un prérequis de lancement.

---

## 23. Nomenclature future

Convention proposée (**ne pas renommer les fichiers actuels**) :

```
{page}-{section}-{sujet}-{orientation}-{variante}-v{nn}.{ext}
```

Exemple : `home-hero-urban-walk-desktop-v01.webp`

Règles : minuscules · tirets · sans accents · sans espaces · pas de `final2` · pas de données personnelles · stable.
Langue dans le nom **seulement** si l’image contient exceptionnellement du texte (à éviter).

---

## 24. Arborescence future proposée

Proposition documentaire — **ne créer aucun dossier maintenant** :

```
src/assets/
  brand/          # wordmark, futur logo, favicon source
  home/
    hero/
    products/
    categories/
    editorial/
    capsule/
  textures/       # motifs, grain
  icons/          # nav, compte, panier, sociaux
public/
  # favicon / fichiers réellement publics si requis par Vite
```

Respecte React/Vite (`src/assets` importés et hashés ; `public/` tel quel).
Alternative acceptable : miroir sous `public/images/…` si décision technique future — **Ouvert**.

---

## 25. Matrice de décision

| Décision | Quand |
|---|---|
| Conserver | Cohérent, droits OK, résolution OK |
| Recadrer | Bon sujet, mauvais ratio |
| Retoucher | Léger (exposition, balance) sans changer le look |
| Remplacer | Incohérent, folklore, trop POD brut, mauvaise qualité |
| Produire | Besoin P1 non couvert |
| Licencier / acheter | Si shooting impossible et licence claire |
| Retirer | Section conditionnelle sans contenu |
| Reporter | P2/P3 non bloquant |

Critères : cohérence marque · crédibilité · utilité · qualité · résolution · droits · performance · accessibilité · responsive · effort · dépendance logo · dépendance catalogue.

---

## 26. Risques

| Risque | Prob. | Impact | Prévention | Repli | Décision |
|---|---|---|---|---|---|
| Mockups POD vs éditorial incohérents | Haute | Fort | Une stratégie visuelle par set | Set mockup seul provisoire | Direction photo |
| Hero générique | Haute | Fort | Brief Northern Utility + zone texte | Fallback couleur | Validation DA |
| Skate caricatural | Moyenne | Fort | Interdits shot list | Autre prise | Validation DA |
| Folklore canadien | Moyenne | Fort | Checklist interdits | Retravailler | Validation marque |
| Texte illisible | Haute | Fort | Split 40/60 · pas d’overlay défaut | Fond uni | Intégration |
| Recadrage mobile impossible | Haute | Fort | Variante 4:5 dédiée | Fallback couleur | Production |
| Poids trop lourd | Moyenne | Fort | Compression · formats modernes | JPEG optimisé | Technique |
| Provenance inconnue | Haute | Critique | Checklist §19 | Ne pas publier | Légal / marque |
| Sur-texture | Moyenne | Moyen | Max ~1 section | Sans texture | DA |
| Logo absent | Haute | Moyen | Wordmark typo | — | Marque |
| Fausse capsule | Faible | Fort | Conditionnel strict | Retrait | Contenu |
| Confusion fabrication CA | Moyenne | Critique | Pas d’atelier dans l’image ; nuance COPY | Reformuler / autre image | Marque + juridique |
| Mauvaise représentation produit | Moyenne | Fort | Sélection curation | Moins de cartes | Catalogue |
| Image générée trompeuse | Moyenne | Critique | Interdit comme preuve produit / fausse campagne | Photo réelle ou repli | Éthique / juridique |
| Actifs tiers non autorisés | Moyenne | Critique | Licences | Retirer | Légal |
| Trop d’actifs inutiles | Moyenne | Moyen | Inventaire ID | Reporter P3 | Production |

Responsable nommé : **non défini** — décisions à assigner.

---

## 27. Décisions validées, provisoires et ouvertes

### Validé

- direction **Northern Utility Editorial** ;
- palette de **rôles** (hex encore provisoires) ;
- tactile, urbain nordique ;
- skate = origine, pas limite ;
- absence de folklore canadien ;
- priorité à la crédibilité ;
- POD non identitaire ;
- une langue affichée à la fois ;
- aucune info essentielle uniquement dans l’image ;
- retrait des sections conditionnelles sans contenu réel ;
- un seul grand usage dominant de `NO FIXED LINE.` ;
- Hero COPY de travail (FR/EN) comme direction rédactionnelle.

### Provisoire

- ratios exacts et pixels cibles ;
- quantité exacte de photos ;
- présence humaine par section ;
- texture / grain exacts ;
- formats de production finaux ;
- nomenclature et arborescence ;
- plans de cadrage finaux ;
- réutilisation éventuelle de mockups Printful ;
- image Hero finale ;
- split Hero 40/60 ;
- hex exacts en maquette.

### Ouvert

- logo final ;
- actifs photographiques définitifs ;
- modèles / lieux / droits / budget / calendrier ;
- produits et catégories réels mis de l’avant ;
- capsule réelle ;
- contenu éditorial réel ;
- shooting vs licence vs autre source ;
- pipeline technique d’optimisation ;
- validation juridique de `NO FIXED LINE.` ;
- sélecteur de langue (UI) ;
- vidéo Hero.

---

## 28. Checklist avant intégration

- [ ] Actif réel disponible
- [ ] Provenance confirmée
- [ ] Droits confirmés
- [ ] Sujet crédible
- [ ] Cohérence de marque
- [ ] Bon ratio
- [ ] Recadrage bureau validé
- [ ] Recadrage mobile validé
- [ ] Zone de texte sécurisée (FR et EN séparément)
- [ ] Résolution suffisante
- [ ] Poids optimisé
- [ ] Format approprié
- [ ] Alt text prévu
- [ ] Dimensions connues (anti-CLS)
- [ ] Repli prévu
- [ ] Aucun texte essentiel dans l’image
- [ ] Aucun faux produit / prix
- [ ] Aucune fausse campagne
- [ ] Aucune affirmation non prouvée
- [ ] Aucune confusion fabrication canadienne
- [ ] Aucun logo final simulé
- [ ] Aucun actif obsolète conservé par facilité
- [ ] Sections conditionnelles retirées si vides
- [ ] `NO FIXED LINE.` : statut juridique vérifié avant usage public final

---

## 29. Ordre recommandé des prochaines étapes

1. Validation du plan d’actifs
2. Décision sur le Hero (photo vs fallback)
3. Sélection des produits réels
4. Décision sur les catégories
5. Audit des droits des actifs existants / futurs
6. Production ou sélection des actifs prioritaires
7. Validation des cadrages responsive
8. Optimisation
9. Validation accessibilité
10. Plan d’intégration technique
11. Intégration progressive
12. Tests
13. Commit séparé
14. Aucun déploiement sans autorisation

**Ce document n’autorise aucune de ces étapes.**

---

## 30. Contradictions et ambiguïtés des sources

| Sujet | Tension | Traitement dans ce plan |
|---|---|---|
| CTA Hero | SPEC/WIREFRAME : `Découvrir la collection` · COPY : `Voir la boutique` / `Shop all` | Suivre le COPY actuel : `Voir la boutique` / `Shop all` ; harmoniser les anciens documents lors d’une mise à jour documentaire distincte |
| Feuille d’érable | Vision : possible si originale · Homepage : interdite en Hero/éditorial visible | **Interdite** sur actifs homepage |
| Nom section 6 | SPEC « Essentiels ou catégories » · ailleurs « Catégories » | Suivre wireframe : **Catégories** |
| Ordre final | Provisoire SPEC/WIREFRAME · structure Validée VISUAL | Ordre wireframe 1–9 |
| Overlay Hero | Identity évoque zone overlay · VISUAL : pas d’overlay par défaut | **Pas d’overlay par défaut** |
| Courriel conditionnel | Plus explicite WIREFRAME/VISUAL/COPY que SPEC | Retrait si non fonctionnel |
| Placeholders courts vs longs | IDENTITY vs homepage | Formes longues homepage |

---

## 31. Images générées (rappel)

Exploration conceptuelle éventuelle seulement.
**Jamais** : preuve produit · fausse photo de campagne présentée comme réelle · vêtement trompeur.
Validation juridique et éthique obligatoire avant tout usage commercial.
**Aucune image générée dans cette étape.**

---

**Fin du Draft — Homepage Assets v1.**
