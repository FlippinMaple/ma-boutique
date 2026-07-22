# Flippin’ Maple — Wireframe de la page d’accueil

| Métadonnée | Valeur |
|---|---|
| **Chemin** | `docs/web/HOMEPAGE_WIREFRAME.md` |
| **Statut** | **Draft — Homepage Wireframe v1** |
| **Date** | 2026-07-21 |
| **Portée** | structure basse fidélité bureau et mobile de la page d’accueil |
| **Documents sources** | `docs/00_PROJECT_MASTER.md` · `docs/brand/VISION_AND_POSITIONING.md` · `docs/brand/VISUAL_IDENTITY.md` · `docs/web/HOMEPAGE_SPEC.md` |
| **Hors portée** | maquette haute fidélité · code React/CSS · actifs graphiques · checkout / Stripe / Printful / DB |

**Légende des actifs dans les schémas ASCII**

| Marque | Signification |
|---|---|
| `[PLACEHOLDER — …]` | Actif à produire |
| `(fallback)` | Fallback disponible |
| `·····` | Section conditionnelle (absente si contenu faible) |
| `[ACTIF OK]` | Réservé aux futurs actifs réellement disponibles |

Statuts : **Validé** · **Provisoire** · **Ouvert**.

---

## 1. Rôle du document

Ce fichier traduit `docs/web/HOMEPAGE_SPEC.md` en **structure de page basse fidélité** (wireframe textuel).

Il permet de comprendre l’ordre vertical, les proportions relatives, la relation image/texte, la ligne de flottaison, le responsive, les sections conditionnelles et les actifs manquants — **avant** toute maquette haute fidélité ou intégration.

Il ne remplace pas :

- `HOMEPAGE_SPEC.md` (spécification de contenu et de règles) ;
- `VISUAL_IDENTITY.md` (fondations de design) ;
- les futures maquettes visuelles ;
- les futures spécifications techniques.

En cas de conflit structurant : Constitution → Vision → Identité visuelle → Spec → Wireframe.

---

## 2. Statut des décisions

### Validé

- page courte et maîtrisée ;
- aucun carrousel automatique ;
- produit visible rapidement ;
- un seul grand usage de **`NO FIXED LINE.`** ;
- placeholders descriptifs obligatoires ;
- sections sans contenu fort supprimées ;
- priorité mobile ;
- checkout, Stripe, Printful, routes et DB hors portée ;
- **français québécois** = version source du wireframe textuel ;
- **tutoiement** dans la version française ;
- **anglais canadien** = adaptation complète future (jamais affichée simultanément dans les mêmes blocs) ;
- **une seule langue** par version de page wireframée.

### Provisoire

- hauteurs exactes ;
- dimensions exactes ;
- placement final du wordmark ;
- position finale de **`NO FIXED LINE.`** ;
- ordre final de certaines sections ;
- nombre exact de produits ;
- textes de travail ;
- catégories ;
- header sticky ou non ;
- répartition Hero ~40 % texte / ~60 % image.

### Ouvert

- actifs visuels finaux ;
- sélection des produits ;
- collection ou capsule ;
- textes approuvés ;
- mécanisme technique du sélecteur de langue et de la mémorisation de préférence ;
- logo ;
- mécanisme technique des produits vedettes.

---

## 3. Vue d’ensemble de la page

**Langue (Validé) :** le wireframe représente la structure pour **une langue à la fois**. Le français est la version source ; l’anglais sera une adaptation complète. Ne jamais prévoir deux langues simultanées dans les mêmes blocs. Le sélecteur de langue demeure une dépendance technique future (hors structure wireframe).

### Bureau — stack vertical

```
┌────────────────────────────────────────────────────────────┐
│ 1. HEADER                                                  │
│ [PLACEHOLDER — WORDMARK]  Nav   Compte   Panier            │
├────────────────────────────────────────────────────────────┤
│ 2. HERO (très grand)                                       │
│  TEXTE (~40%)          │  IMAGE (~60%)                     │
│  FLIPPIN’ MAPLE        │  [PLACEHOLDER — IMAGE HERO        │
│  NO FIXED LINE.        │   CAMPAGNE PRINCIPALE]            │
│  Texte court           │  (fallback: Deep Forest/Charcoal) │
│  [Voir la boutique]    │                                   │
├────────────────────────────────────────────────────────────┤
│ 3. PRODUITS (grand)                                        │
│  Titre + lien Boutique                                     │
│  [P1 4:5]  [P2 4:5]  [P3 4:5]  ([P4])                      │
│  [PLACEHOLDER — PHOTOGRAPHIES PRODUITS COHÉRENTES]         │
├────────────────────────────────────────────────────────────┤
│ 4. DÉCLARATION (moyen) — fond sombre                       │
│  Titre complémentaire  │  Paragraphe 40–80 mots            │
│  [PLACEHOLDER — MOTIF DE VEINAGE D’ÉRABLE SOMBRE]          │
├────────────────────────────────────────────────────────────┤
│ 5. ÉDITORIAL (grand)                                       │
│  [PLACEHOLDER — IMAGE ÉDITORIALE…]  │  Titre + texte       │
├────────────────────────────────────────────────────────────┤
│ 6. CATÉGORIES (grand) — 2 recommandées                     │
│  [PLACEHOLDER — IMAGE DE CATÉGORIE] × 2                    │
├ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·┤
│ 7. CAPSULE (moyen) ····· CONDITIONNELLE ·····              │
│  [PLACEHOLDER — BANNIÈRE CAPSULE]  2:1                     │
├────────────────────────────────────────────────────────────┤
│ 8. COURRIEL (compact à moyen)                              │
│  Titre à définir · champ · bouton · confidentialité        │
├────────────────────────────────────────────────────────────┤
│ 9. FOOTER (moyen)                                          │
│  [PLACEHOLDER — WORDMARK] · liens · légal · réseaux réels  │
└────────────────────────────────────────────────────────────┘
```

### Mobile — stack vertical

```
┌──────────────────────────┐
│ HEADER                   │
│ [≡] [WORDMARK] [Panier]  │
├──────────────────────────┤
│ HERO 4:5                 │
│ [PLACEHOLDER IMAGE HERO] │
│ FLIPPIN’ MAPLE           │
│ NO FIXED LINE.           │
│ Texte court              │
│ [Voir la boutique]       │
├──────────────────────────┤
│ PRODUITS                 │
│ Titre + Boutique         │
│ [P1] [P2]                │
│ [P3] ([P4])              │
├──────────────────────────┤
│ DÉCLARATION              │
│ Titre complémentaire     │
│ Paragraphe court         │
│ (motif discret ou aplat) │
├──────────────────────────┤
│ ÉDITORIAL                │
│ [IMAGE 4:5 / 3:4]        │
│ Titre + texte + lien     │
├──────────────────────────┤
│ CATÉGORIES               │
│ [Cat 1]                  │
│ [Cat 2]                  │
├ · · · CAPSULE · · · · · ·┤
│ [BANNIÈRE 4:5]           │
├──────────────────────────┤
│ COURRIEL (vertical)      │
├──────────────────────────┤
│ FOOTER empilé            │
└──────────────────────────┘
```

---

## 4. Ligne de flottaison

### Bureau (écran standard ~900–1080 px de hauteur utile)

Doit être visible ou clairement amorcé :

- header ;
- majorité du Hero (titre, texte court, CTA) ;
- CTA principal accessible sans défilement excessif ;
- début ou indication claire de la section produits (titre ou premier rang de cartes).

Le produit **ne doit pas** être repoussé trop loin sous un Hero trop haut.

### Mobile

Doit être visible :

- header ;
- visuel ou fond Hero ;
- titre ;
- CTA ;
- aucune surcharge (pas de multi-CTA, pas de badges, pas de nav complète ouverte).

---

## 5. Header

### Schéma bureau

```
┌────────────────────────────────────────────────────────────┐
│ [PLACEHOLDER — WORDMARK FLIPPIN’ MAPLE]                    │
│ Boutique  Nouveautés  Essentiels  À propos    Compte Panier│
└────────────────────────────────────────────────────────────┘
```

### Schéma mobile

```
┌──────────────────────────┐
│ [≡] [WORDMARK] [Panier]  │
└──────────────────────────┘

┌──────────────────────────┐
│ Menu ouvert (état)       │
│ · Boutique               │
│ · Nouveautés             │
│ · Essentiels             │
│ · À propos               │
│ · Compte                 │
└──────────────────────────┘
```

### Fiche

| Élément | Contenu |
|---|---|
| Objectif | Identifier la marque ; accès boutique, compte, panier ; rester discret face au Hero |
| Importance | Compact · espacement adjacent 32–48 |
| Contenu textuel provisoire | Nav : Boutique, Nouveautés, Essentiels, À propos (non définitifs) |
| CTA / destinations | Wordmark → accueil ; Boutique → boutique ; Compte → compte ; Panier → panier (destinations réelles uniquement) |
| Placeholder | `[PLACEHOLDER — WORDMARK FLIPPIN’ MAPLE]` — détail §16 |
| Responsive | Nav horizontale bureau ; menu compact mobile ; aucune barre promo permanente |
| Retrait / fallback | Section permanente ; logo absent → wordmark typographique neutre |
| Ouvert / Provisoire | Placement wordmark · sticky · libellés de nav |

### Accessibilité

| Critère | Règle |
|---|---|
| Ordre de lecture | Wordmark → navigation → compte → panier |
| Titre | Aucun H1 dans le header |
| Alt / décoratif | Wordmark = lien texte « Flippin’ Maple — Accueil » (pas une image sans texte) |
| CTA | Libellés explicites (Boutique, Compte, Panier) |
| Focus | Visible sur tous les liens et contrôles |
| Contraste | Encre sur Maple Bone selon palette provisoire |
| Texte dans l’image | Interdit |

---

## 6. Hero

### Schéma bureau (structure principale recommandée)

**Deux zones** ~40 % texte / ~60 % image (**Provisoire**) :

```
┌───────────────────────┬────────────────────────────────────┐
│ TEXTE                 │ IMAGE                              │
│ FLIPPIN’ MAPLE        │ [PLACEHOLDER — IMAGE HERO          │
│ NO FIXED LINE.        │  CAMPAGNE PRINCIPALE]              │
│ Texte court (1–2 ph.) │ (fallback Deep Forest / Charcoal)  │
│ [Voir la boutique]    │                                    │
└───────────────────────┴────────────────────────────────────┘
```

**Composition par défaut :** split / zones séparées.
**Pas d’overlay photographique par défaut.** Overlay = exception seulement si contraste, zone négative, lecture FR/EN séparée et mobile crédibles sont garantis et validés.

### Schéma mobile

```
┌──────────────────────────┐
│ [PLACEHOLDER — IMAGE     │
│  HERO CAMPAGNE           │
│  PRINCIPALE] 4:5         │
│ FLIPPIN’ MAPLE           │
│ NO FIXED LINE.           │
│ Texte court              │
│ [Voir la boutique]       │
└──────────────────────────┘
```

### Fiche

| Élément | Contenu |
|---|---|
| Objectif | Installer l’univers Flippin’ Maple et porter l’attitude de marque |
| Importance | Très grand · espacement sous Hero 64–96 ou 96–128 (**Provisoire**) |
| Contenu textuel provisoire | Sur-titre `FLIPPIN’ MAPLE` ; H1 `NO FIXED LINE.` (emplacement de travail) ; appui selon `HOMEPAGE_COPY.md` |
| CTA / destinations | `Voir la boutique` (FR) / `Shop all` (EN) → boutique réelle (route à confirmer à l’intégration) ; pas de CTA secondaire par défaut |
| Placeholder | `[PLACEHOLDER — IMAGE HERO CAMPAGNE PRINCIPALE]` — détail §16 |
| Responsive | Split bureau (**défaut**) ; stack / 4:5 mobile ; CTA tactile ; **pas d’overlay photographique par défaut** |
| Retrait / fallback | Section permanente ; sans photo → Deep Forest ou Charcoal + texte Maple Bone ; jamais image générique temporaire |
| Ouvert / Provisoire | Position finale de `NO FIXED LINE.` ; titre de campagne futur ; ratio exact 16:9 vs 3:2 |

**Ancienne formulation CTA Hero non retenue :** `Découvrir la collection` / `Shop the collection`.

### Règle signature

Si `NO FIXED LINE.` reste le titre du Hero, la déclaration **ne le répète pas**. Un futur titre de campagne peut le remplacer (**Provisoire**). Un seul grand usage sur la page (**Validé**).

### Accessibilité

| Critère | Règle |
|---|---|
| Ordre de lecture | Sur-titre → H1 → texte → CTA |
| Titre | **H1 unique** de la page |
| Alt / décoratif | Image : alt factuel ; fond CSS de fallback : décoratif |
| CTA | Libellé explicite `Voir la boutique` / `Shop all` |
| Focus | Visible sur le CTA |
| Contraste | Zone texte dédiée (split) ; overlay exceptionnel seulement |
| Texte dans l’image | Interdit (aucun texte incrusté indispensable) |

---

## 7. Sélection principale de produits

### Schéma bureau

```
┌────────────────────────────────────────────────────────────┐
│ Sélection  /  Voir la boutique →                           │
│ ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐             │
│ │[P 4:5] │  │[P 4:5] │  │[P 4:5] │  │([P4])  │             │
│ │ Nom    │  │ Nom    │  │ Nom    │  │        │             │
│ │ Prix   │  │ Prix   │  │ Prix   │  │        │             │
│ └────────┘  └────────┘  └────────┘  └────────┘             │
│ [PLACEHOLDER — PHOTOGRAPHIES PRODUITS COHÉRENTES]          │
└────────────────────────────────────────────────────────────┘
```

### Schéma mobile

```
┌──────────────────────────┐
│ Sélection                │
│ Voir la boutique →       │
│ ┌──────┐ ┌──────┐        │
│ │ P1   │ │ P2   │        │
│ │ Nom  │ │ Nom  │        │
│ │ Prix │ │ Prix │        │
│ └──────┘ └──────┘        │
│ ┌──────┐ ┌──────┐        │
│ │ P3   │ │(P4)  │        │
│ └──────┘ └──────┘        │
└──────────────────────────┘
```

### Fiche

| Élément | Contenu |
|---|---|
| Objectif | Curation courte ; prouver une marque de vêtements, pas un catalogue POD |
| Importance | Grand · espacement 64–96 |
| Contenu textuel provisoire | Titre de section (ex. « Sélection ») ; nom + prix par carte ; variante seulement si utile |
| CTA / destinations | Lien « Voir la boutique » → boutique ; chaque carte → fiche produit |
| Placeholder | `[PLACEHOLDER — PHOTOGRAPHIES PRODUITS COHÉRENTES]` — détail §16 |
| Responsive | 3 produits recommandés (4 si curation) bureau ; grille 2 colonnes mobile ; défilement horizontal = alternative provisoire seulement ; aucun carrousel auto |
| Retrait / fallback | Section permanente avec sélection intentionnelle ; 2 produits forts → afficher 2 ; photos incohérentes → sélection réduite validée |
| Ouvert / Provisoire | Nombre exact 3 vs 4 ; mécanisme technique des vedettes |

### Accessibilité

| Critère | Règle |
|---|---|
| Ordre de lecture | H2 → lien boutique → cartes (image, nom, prix) |
| Titre | H2 |
| Alt / décoratif | Alt factuel : nom, couleur, type |
| CTA | « Voir la boutique » ; nom du produit comme lien de carte |
| Focus | Visible sur liens cartes |
| Contraste | Prix et noms en texte réel |
| Texte dans l’image | Interdit |

---

## 8. Déclaration de marque

### Schéma bureau

```
┌────────────────────────────────────────────────────────────┐
│ FOND Charcoal / Deep Forest                                │
│ [PLACEHOLDER — MOTIF DE VEINAGE D’ÉRABLE SOMBRE] (discret) │
│  TITRE COMPLÉMENTAIRE      │  Paragraphe 40–80 mots        │
│  (à définir)               │  Lien optionnel À propos      │
└────────────────────────────────────────────────────────────┘
```

### Schéma mobile

```
┌──────────────────────────┐
│ Titre complémentaire     │
│ Paragraphe 40–80 mots    │
│ [À propos] (optionnel)   │
│ (motif réduit ou aplat)  │
└──────────────────────────┘
```

### Fiche

| Élément | Contenu |
|---|---|
| Objectif | Profondeur d’attitude sans long manifeste |
| Importance | Moyen · espacement 64–96 |
| Contenu textuel provisoire | Titre complémentaire à définir si `NO FIXED LINE.` est au Hero ; paragraphe 40–80 mots |
| CTA / destinations | Aucun CTA requis ; lien optionnel → À propos |
| Placeholder | `[PLACEHOLDER — MOTIF DE VEINAGE D’ÉRABLE SOMBRE]` — détail §16 |
| Responsive | Split asymétrique bureau ; stack mobile ; motif plus discret sur petit écran |
| Retrait / fallback | Section permanente (peut être raccourcie) ; motif absent → aplat ; pas de faux bois |
| Ouvert / Provisoire | Titre complémentaire ; texte définitif |

### Accessibilité

| Critère | Règle |
|---|---|
| Ordre de lecture | H2 → paragraphe → lien optionnel |
| Titre | H2 |
| Alt / décoratif | Motif CSS : aucune alternative ; image HTML décorative : `alt=""` |
| CTA | Aucun CTA requis |
| Focus | Visible sur lien optionnel |
| Contraste | Maple Bone sur fond sombre |
| Texte dans l’image | Interdit |

---

## 9. Bloc éditorial matière / territoire

### Schéma bureau

```
┌──────────────────────────┬─────────────────────────────────┐
│ [PLACEHOLDER — IMAGE     │ Titre court                     │
│  ÉDITORIALE MATIÈRE ET   │ Paragraphe bref                 │
│  TERRITOIRE]             │ [Lien optionnel]                │
│  3:4 ou 4:5              │                                 │
└──────────────────────────┴─────────────────────────────────┘
```

### Schéma mobile

```
┌──────────────────────────┐
│ [PLACEHOLDER — IMAGE     │
│  ÉDITORIALE…]            │
│ Titre court              │
│ Paragraphe bref          │
│ [Lien optionnel]         │
└──────────────────────────┘
```

### Fiche

| Élément | Contenu |
|---|---|
| Objectif | Contraste tactile ; relier matière, territoire, mouvement |
| Importance | Grand · espacement 64–96 ou 96–128 |
| Contenu textuel provisoire | Titre court ; paragraphe bref ; thèmes matière / territoire / mouvement / indépendance |
| CTA / destinations | Lien optionnel → histoire / À propos ; Aucun CTA requis si absent |
| Placeholder | `[PLACEHOLDER — IMAGE ÉDITORIALE MATIÈRE ET TERRITOIRE]` — détail §16 |
| Responsive | Image + texte asymétrique bureau ; image puis texte mobile ; inversion image/texte = Provisoire |
| Retrait / fallback | Sans image crédible → section supprimée ou réduite (titre + lien si texte prêt) |
| Ouvert / Provisoire | Maintien de la section ; texte ; ratio 3:4 vs 4:5 |

### Règle

Aucun discours de fabrication artisanale inventé.

### Accessibilité

| Critère | Règle |
|---|---|
| Ordre de lecture | Image → H2 → paragraphe → lien |
| Titre | H2 |
| Alt / décoratif | Alt factuel des matières et objets visibles |
| CTA | Libellé explicite si lien présent |
| Focus | Visible sur le lien |
| Contraste | Texte hors image |
| Texte dans l’image | Interdit |

---

## 10. Catégories principales

**Nom de section :** `Catégories` (EN : `Categories`).
`Essentiels` n’est **pas** le nom de cette section (nav provisoire ou collection réelle seulement si destination réelle).

### Schéma bureau — variante A (2 catégories, recommandée)

```
┌─────────────────────────────┬─────────────────────────────┐
│ [PLACEHOLDER — IMAGE DE     │ [PLACEHOLDER — IMAGE DE     │
│  CATÉGORIE]                 │  CATÉGORIE]                 │
│ Titre (ex. T-shirts)        │ Titre (ex. Cotons ouatés)   │
│ (carte entière cliquable)   │ (carte entière cliquable)   │
└─────────────────────────────┴─────────────────────────────┘
```

### Schéma bureau — variante B (3 catégories)

```
┌──────────────┬──────────────┬──────────────┐
│ [CAT 1]      │ [CAT 2]      │ [CAT 3]      │
│ Titre        │ Titre        │ Titre        │
└──────────────┴──────────────┴──────────────┘
```

### Schéma mobile

```
┌──────────────────────────┐
│ [PLACEHOLDER — IMAGE DE  │
│  CATÉGORIE]              │
│ Titre catégorie 1        │
├──────────────────────────┤
│ [PLACEHOLDER — IMAGE DE  │
│  CATÉGORIE]              │
│ Titre catégorie 2        │
└──────────────────────────┘
```

Sur mobile large / tablette, 2 colonnes possibles si lisibilité conservée.

### Fiche

| Élément | Contenu |
|---|---|
| Objectif | Entrée structurée dans le catalogue |
| Importance | Grand · espacement 64–96 |
| Contenu textuel provisoire | Ex. T-shirts, Cotons ouatés, Accessoires (non verrouillés) |
| CTA / destinations | Carte entière → liste / filtre catégorie réelle |
| Placeholder | `[PLACEHOLDER — IMAGE DE CATÉGORIE]` — détail §16 |
| Responsive | 2 col bureau (recommandé) ; empilement mobile ; pas de texte superposé illisible |
| Retrait / fallback | Catégories non validées / sans destination réelle → **réduire ou retirer** ; **aucune** fausse catégorie |
| Ouvert / Provisoire | Nombre 2 vs 3 ; libellés exacts |

### Accessibilité

| Critère | Règle |
|---|---|
| Ordre de lecture | H2 → cartes (image puis titre texte) |
| Titre | H2 section ; titres de catégorie en texte (H3 si sous-structure réelle) |
| Alt / décoratif | Alt : type de vêtement et contexte |
| CTA | Carte entière avec libellé accessible = titre catégorie |
| Focus | Visible sur chaque carte |
| Contraste | Titre hors image |
| Texte dans l’image | Interdit |

---

## 11. Capsule conditionnelle

Section **conditionnelle** : absente du flux si aucune capsule réelle.

### Schéma bureau

```
┌ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ┐
│ [PLACEHOLDER — BANNIÈRE CAPSULE]  2:1                     │
│ Titre · phrase · [CTA si destination réelle]              │
└ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ┘
```

### Schéma mobile

```
┌ · · · · · · · · · · · · · ┐
│ [PLACEHOLDER — BANNIÈRE   │
│  CAPSULE] 4:5 ou 3:4      │
│ Titre                     │
│ Phrase courte             │
│ [CTA]                     │
└ · · · · · · · · · · · · · ┘
```

### Fiche

| Élément | Contenu |
|---|---|
| Objectif | Second moment de campagne sans concurrencer le Hero |
| Importance | Moyen **ou absent** · espacement 64–96 si présente |
| Contenu textuel provisoire | Titre et phrase selon capsule réelle ; à définir |
| CTA / destinations | CTA seulement si destination réelle existe |
| Placeholder | `[PLACEHOLDER — BANNIÈRE CAPSULE]` — détail §16 |
| Responsive | 2:1 bureau ; 4:5 ou 3:4 mobile |
| Retrait / fallback | Absente = retrait total ; **aucun espace vide réservé** ; pas de fausse capsule |
| Ouvert | Existence réelle d’une capsule / collection limitée |

### Accessibilité

| Critère | Règle |
|---|---|
| Ordre de lecture | H2 → phrase → CTA |
| Titre | H2 (si section présente) |
| Alt / décoratif | Alt factuel |
| CTA | Libellé explicite lié à la destination |
| Focus | Visible sur CTA |
| Contraste | Texte hors image ou zone contrastée |
| Texte dans l’image | Interdit |

---

## 12. Inscription courriel

**Conditionnelle.** Si le formulaire n’est pas réellement fonctionnel → **retrait complet** de la page (repli normal). Mécanisme technique = hors portée.
**Interdit :** faux formulaire · bouton inerte · fausse confirmation · inscription simulée · rabais inventé · popup agressif · feuille d’érable visible.

### Schéma bureau

```
┌────────────────────────────────────────────────────────────┐
│ Titre : À définir                                          │
│ Phrase courte                                              │
│ [ courriel .................... ] [ S’inscrire ]           │
│ Politique de confidentialité                               │
└────────────────────────────────────────────────────────────┘
```

### Schéma mobile

```
┌──────────────────────────┐
│ Titre : À définir        │
│ Phrase courte            │
│ [ courriel ............ ]│
│ [ S’inscrire ]           │
│ Confidentialité          │
└──────────────────────────┘
```

### Fiche

| Élément | Contenu |
|---|---|
| Objectif | Relation directe sans popup agressif |
| Importance | Compact à moyen · espacement 32–48 ou 64–96 |
| Contenu textuel provisoire | Selon `HOMEPAGE_COPY.md` / `VOICE.md` (formulations de travail) |
| CTA / destinations | Bouton « S’inscrire » → soumission réelle ; lien Confidentialité réelle |
| Placeholder / actif | Aucun actif requis (motif abstrait optionnel très discret ; **aucune feuille figurative**) |
| Responsive | Formulaire horizontal possible bureau ; vertical pleine largeur mobile |
| Retrait / fallback | Non fonctionnelle → section **retirée** (pas de formulaire factice) |
| Ouvert | Textes finaux ; mécanisme d’inscription (hors portée wireframe) |

### Accessibilité

| Critère | Règle |
|---|---|
| Ordre de lecture | H2 → phrase → champ → bouton → confidentialité |
| Titre | H2 |
| Alt / décoratif | Aucun actif requis |
| CTA | « S’inscrire » explicite |
| Focus | Visible sur champ, bouton, lien |
| Contraste | Suffisant sur fond Maple Bone / Weathered Maple pâle |
| Texte dans l’image | Interdit |

---

## 13. Footer

### Schéma bureau

```
┌────────────────────────────────────────────────────────────┐
│ [PLACEHOLDER — WORDMARK FLIPPIN’ MAPLE]                    │
│ Boutique · À propos · Contact                              │
│ Livraison · Retours · Confidentialité · Conditions         │
│ Réseaux (réels uniquement)                                 │
└────────────────────────────────────────────────────────────┘
```

### Schéma mobile

```
┌──────────────────────────┐
│ [PLACEHOLDER — WORDMARK] │
│ Boutique                 │
│ À propos                 │
│ Contact                  │
│ Livraison                │
│ Retours                  │
│ Confidentialité          │
│ Conditions               │
│ Réseaux (réels)          │
└──────────────────────────┘
```

### Fiche

| Élément | Contenu |
|---|---|
| Objectif | Navigation secondaire, légal, service, signature |
| Importance | Moyen · fond sombre · espacement interne compact |
| Contenu textuel provisoire | Groupes boutique / service / légal ; réseaux réels uniquement |
| CTA / destinations | Liens réels seulement ; pas de CTA vague |
| Placeholder | `[PLACEHOLDER — WORDMARK FLIPPIN’ MAPLE]` — même spécification §16 que le header |
| Responsive | Colonnes regroupées bureau ; groupes empilés mobile ; aucune colonne vide |
| Retrait / fallback | Section permanente ; logo absent → wordmark typographique neutre |
| Ouvert / Provisoire | Structure exacte des groupes ; réseaux disponibles |

### Accessibilité

| Critère | Règle |
|---|---|
| Ordre de lecture | Wordmark → groupes de liens |
| Titre | Pas de H1 ; H3 seulement si sous-groupes réels justifiés |
| Alt / décoratif | Wordmark = lien texte accessible |
| CTA | Aucun CTA marketing vague |
| Focus | Visible sur chaque lien |
| Contraste | Maple Bone sur Ink Black / Charcoal |
| Texte dans l’image | Interdit |

---

## 14. Rythme vertical

| Section | Importance relative | Espacement associé (indicatif) |
|---|---|---|
| Header | Compact | 32–48 |
| Hero | Très grand | 64–96 / 96–128 |
| Produits | Grand | 64–96 |
| Déclaration | Moyen | 64–96 |
| Éditorial | Grand | 64–96 / 96–128 |
| Catégories | Grand | 64–96 |
| Capsule | Moyen ou absent | 64–96 si présente |
| Courriel | Compact à moyen | 32–48 / 64–96 |
| Footer | Moyen | 32–48 internes |

Valeurs finales à tester en maquette (**Provisoire**). Échelle issue de `VISUAL_IDENTITY.md` : 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128.

---

## 15. Hiérarchie des fonds

| Section | Fond proposé |
|---|---|
| Header | Maple Bone |
| Hero | image ou Deep Forest |
| Produits | Maple Bone |
| Déclaration | Charcoal ou Deep Forest |
| Éditorial | Maple Bone ou Weathered Maple pâle |
| Catégories | Maple Bone |
| Capsule | variable contrôlée |
| Courriel | Weathered Maple pâle |
| Footer | Ink Black ou Charcoal |

**Règle :** deux grandes sections sombres ne devraient pas se suivre sans justification.

---

## 16. Règles des placeholders

Spécifications reprises de `docs/web/HOMEPAGE_SPEC.md` sans réduction de précision.
Tous les actifs ci-dessous sont **à produire** ; aucun n’est présenté comme déjà disponible.

### Index

| Emplacement | Placeholder |
|---|---|
| Header / Footer | `[PLACEHOLDER — WORDMARK FLIPPIN’ MAPLE]` |
| Hero | `[PLACEHOLDER — IMAGE HERO CAMPAGNE PRINCIPALE]` |
| Produits | `[PLACEHOLDER — PHOTOGRAPHIES PRODUITS COHÉRENTES]` |
| Déclaration | `[PLACEHOLDER — MOTIF DE VEINAGE D’ÉRABLE SOMBRE]` |
| Éditorial | `[PLACEHOLDER — IMAGE ÉDITORIALE MATIÈRE ET TERRITOIRE]` |
| Catégories | `[PLACEHOLDER — IMAGE DE CATÉGORIE]` |
| Capsule | `[PLACEHOLDER — BANNIÈRE CAPSULE]` (section conditionnelle) |

---

### WORDMARK FLIPPIN’ MAPLE

```
[PLACEHOLDER — WORDMARK FLIPPIN’ MAPLE]

Rôle :
Identifier la marque dans le header (et le footer).

État :
Actif définitif non disponible.

Traitement temporaire :
Texte en capitales avec la typographie d’interface prévue.
Aucun symbole inventé.
Aucune feuille provisoire.
Aucun effet de flip temporaire.

Format final attendu :
SVG monochrome.

Contraintes :
Doit fonctionner sur Maple Bone, Ink Black et Deep Forest.
Doit pouvoir être remplacé sans modifier la structure du header.

Fallback :
Wordmark typographique neutre jusqu’au logo final.

Alt / accessibilité :
Lien texte accessible « Flippin’ Maple — Accueil » (ou équivalent footer).
```

---

### IMAGE HERO CAMPAGNE PRINCIPALE

```
[PLACEHOLDER — IMAGE HERO CAMPAGNE PRINCIPALE]

Rôle :
Installer immédiatement l’univers de Flippin’ Maple et soutenir NO FIXED LINE.

Sujet :
Une ou deux personnes adultes portant des vêtements sobres dans un environnement urbain canadien froid.
Mouvement naturel : marche, déplacement, préparation ou moment vécu.
La présence d’une planche est possible uniquement si elle paraît naturelle et non démonstrative.

Direction artistique :
Streetwear mature.
Culture skate comme origine principale ; influences complémentaires surf et snowboard ressenties dans l’attitude, pas comme publicité de sport extrême.
Lumière naturelle couverte.
Béton, asphalte, métal et bois clair.
Atmosphère calme, tactile et crédible.

Cadrage bureau :
Horizontal large.
Sujet principal dans le tiers droit.
Espace négatif dans le tiers gauche pour le texte.

Cadrage mobile :
Recadrage vertical 4:5 distinct ou zone centrale protégée.
Le visage, le vêtement et le mouvement principal doivent rester lisibles.

Palette :
Charbon, noir, blanc cassé, gris froid et vert profond discret.

Ratios :
Bureau : 16:9 ou 3:2.
Mobile : 4:5.

Dimensions minimales :
Bureau : 2400 × 1350 px.
Mobile : 1600 × 2000 px si une version séparée est produite.

Formats :
AVIF ou WebP.
JPEG de repli au besoin.

Interdits :
Logos de marques concurrentes.
Néons.
Pose adolescente forcée.
Trick spectaculaire servant de cliché.
Décor de chalet.
Feuille d’érable visible.
Couleurs excessivement saturées.
Texte incrusté dans l’image.

Alt attendu :
Description concise de la personne, du vêtement et du contexte réellement visibles.

Fallback :
Fond Deep Forest ou Charcoal avec texte Maple Bone si aucune image adéquate n’est disponible.

Conditions de retrait :
Le Hero ne se retire pas ; seule l’image est remplacée par le fallback couleur.
```

---

### PHOTOGRAPHIES PRODUITS COHÉRENTES

```
[PLACEHOLDER — PHOTOGRAPHIES PRODUITS COHÉRENTES]

Rôle :
Présenter une sélection de vêtements dans un langage visuel uniforme.

Sujet :
Chaque produit isolé ou porté, selon la stratégie photo retenue.

Direction :
Fond Maple Bone, gris très clair ou environnement sobre commun.
Éclairage cohérent entre tous les produits.
Aucune différence majeure de style de mockup.

Ratio :
4:5.

Dimensions minimales :
1600 × 2000 px.

Formats :
AVIF ou WebP.

Contraintes :
Même cadrage général.
Même échelle visuelle.
Aucun logo d’une autre marque.
Aucune image Printful brute mélangée à une photo éditoriale sans traitement cohérent.

Alt attendu :
Nom du produit, couleur et type de vêtement, sans texte promotionnel.

Fallback :
Sélection réduite validée si photos incohérentes ; 2 produits forts → afficher 2 ; ne pas remplir avec du catalogue non curaté.

Comportement responsive :
Ratio 4:5 conservé ; grille 2 colonnes mobile.
```

---

### MOTIF DE VEINAGE D’ÉRABLE SOMBRE

```
[PLACEHOLDER — MOTIF DE VEINAGE D’ÉRABLE SOMBRE]

Rôle :
Ajouter une matière secondaire au bloc de déclaration de marque.

Concept :
Motif abstrait seamless inspiré du fil du bois d’érable.
Lignes longues, organiques et irrégulières.
Aucune planche visible.
Aucun nœud rustique.
Aucune apparence de chalet.

Traitement :
Maple Bone à environ 5 à 8 % sur Charcoal ou Deep Forest.

Format :
SVG seamless prioritaire.
WebP ou PNG haute résolution comme repli.

Contraste :
Très faible.
Le texte doit rester immédiatement lisible.

Comportement responsive :
Recadrage ou répétition sans changement d’échelle brutal.
Aucun détail essentiel ne doit dépendre du motif.
Plus discret sur petit écran.

Accessibilité :
S’il est appliqué en CSS, aucune alternative textuelle.
S’il s’agit exceptionnellement d’une image HTML décorative, utiliser alt="".

Fallback :
Aplat de couleur ; aucun faux bois temporaire.

Conditions de retrait :
Motif retiré si actif absent ; la section déclaration peut rester avec aplat.
```

---

### IMAGE ÉDITORIALE MATIÈRE ET TERRITOIRE

```
[PLACEHOLDER — IMAGE ÉDITORIALE MATIÈRE ET TERRITOIRE]

Rôle :
Créer un contraste tactile avec la section produit.

Sujet :
Détail de textile, bois d’érable clair, béton ou surface urbaine.
Une main, une planche, une couture ou un vêtement peut apparaître.
L’image doit sembler vécue et non construite comme une banque d’images.

Direction :
Lumière naturelle.
Cadrage rapproché.
Textures visibles.
Couleurs désaturées.
Aucune ambiance de menuiserie rustique.

Ratio :
3:4 ou 4:5 selon la maquette.
Une version 3:2 peut être produite pour certaines largeurs.

Dimensions minimales :
1800 × 2400 px pour le format vertical.

Format :
AVIF ou WebP.

Interdits :
Cabane à sucre.
Bûcheron.
Plaid.
Tas de bois.
Feuille d’érable décorative.
Effet sepia.
Fabrication artisanale suggérée si elle n’est pas réelle.

Alt attendu :
Description factuelle des matières et objets visibles.

Fallback / retrait :
Sans image crédible → section supprimée ou réduite (titre + lien À propos si texte prêt).

Comportement responsive :
Image dominante puis texte sur mobile.
```

---

### IMAGE DE CATÉGORIE

```
[PLACEHOLDER — IMAGE DE CATÉGORIE]

Rôle :
Représenter visuellement une catégorie de produits.

Sujet :
Une pièce portée ou un détail clair du type de produit concerné.

Direction :
Même univers photographique que le Hero.
Composition différente pour éviter la répétition.

Ratio :
4:5 ou 3:4.

Contraintes :
Espace suffisant pour le titre.
Aucun texte intégré dans l’image.
Aucune autre marque visible.
Cadrage cohérent entre les catégories.

Alt attendu :
Type de vêtement et contexte visible.

Fallback :
Catégories non validées → retrait de la section ou limitation aux destinations réelles.

Comportement responsive :
Empilement mobile ; 2 colonnes sur largeurs suffisantes.
```

---

### BANNIÈRE CAPSULE

```
[PLACEHOLDER — BANNIÈRE CAPSULE]

Rôle :
Soutenir une capsule réelle ou une collection limitée lorsque celle-ci existe.

Sujet :
À définir selon la capsule.

Direction :
Doit rester compatible avec Northern Utility Editorial tout en permettant une variation saisonnière.

Ratio :
2:1 bureau.
4:5 ou 3:4 mobile.

Dimensions minimales :
2400 × 1200 px bureau.

Contrainte :
La section est supprimée si aucun actif ou concept de capsule suffisamment fort n’est disponible.
Aucun espace vide réservé dans la page si absente.

Fallback / retrait :
Section absente du flux ; pas de fausse capsule ; CTA seulement si destination réelle.
```

---

## 17. Responsive détaillé

Breakpoints conceptuels (**sans valeurs CSS définitives**) :

| Breakpoint | Colonnes | Ordre des contenus | Hero | Recadrage images | CTA | Tactile | Titres | Produits | Catégories | Sections conditionnelles |
|---|---|---|---|---|---|---|---|---|---|---|
| Petit mobile | 4 | Header → Hero → Produits → … Footer (ordre narratif conservé) | Stack ; ratio 4:5 ; texte sous ou sur zone contrastée | Zone centrale protégée ; visage/vêtement lisibles | Pleine largeur ; un CTA principal | Zones ≥ cible tactile confortable | Courtes ; pas de capitales longues | Grille 2 col ; 3–4 cartes max | Empilées | Absentes du flux si retirées |
| Mobile large | 4 | Identique | Identique ; éventuellement plus d’air | Idem | Pleine largeur ou quasi | Idem | Contrôle de longueur | 2 col | Empilées ou 2 col si lisible | Idem |
| Tablette | 6 | Identique | Split possible ou stack selon hauteur | Éditorial peut splitter | CTA accessibles sans zoom | Idem | Présence maintenue | 2–3 colonnes | 2 col possibles | Idem |
| Bureau | 12 | Identique | Split ~40/60 texte/image | Hero 16:9 ou 3:2 ; produits 4:5 | CTA dans zone texte | Souris + clavier | Présents mais sobres | 3 recommandés (4 si curation) | 2 recommandées | Capsule 2:1 si présente |
| Grand bureau | 12 dans max ~1440 | Contenu centré | Même split ; pas d’étirement excessif | Même ratios | Idem | Idem | Textes longs ≤ ~700–760 px | Idem | Idem | Idem |

Règles transverses :

- aucun scroll horizontal accidentel ;
- aucun texte indispensable uniquement dans une image ;
- `prefers-reduced-motion` respecté en maquette future ;
- aucune animation indispensable à la compréhension.

---

## 18. Accessibilité dans le wireframe

### Hiérarchie de titres (une seule H1)

| Niveau | Emplacement |
|---|---|
| **H1** | Titre du Hero (`NO FIXED LINE.` ou futur titre de campagne) |
| **H2** | Produits · Déclaration · Éditorial · Catégories · Capsule (si présente) · Courriel |
| **H3** | Titres de catégories ou sous-groupes footer **seulement** si sous-structure réelle |

Les tableaux d’accessibilité par section sont dans les §5 à §13.

Focus visible · contraste · aucun texte indispensable dans l’image · `prefers-reduced-motion`.

---

## 19. États sans contenu

| État | Fallback | Retrait possible | Contenu minimal acceptable | Ne jamais inventer |
|---|---|---|---|---|
| Logo absent | Wordmark typographique neutre (`PLACEHOLDER — WORDMARK`) | Non (header/footer restent) | Texte capitales neutre, monochrome | Symbole, feuille, effet flip, logo coloré provisoire |
| Hero sans photo | Fond Deep Forest ou Charcoal + texte Maple Bone | Non (Hero permanent) | Sur-titre, H1, appui court, CTA | Image générique temporaire, texte incrusté, clichés skate/chalet |
| Photos produits incohérentes | Sélection réduite validée | Non (section reste, grille réduite) | Produits curatés avec images cohérentes | Grille automatique Printful, mockups mélangés |
| Seulement deux produits forts | Afficher 2 | Non | Deux cartes 4:5 intentionnelles | Remplissage artificiel pour « faire le plein » |
| Motif absent | Aplat Charcoal / Deep Forest | Motif seulement | Déclaration avec titre + paragraphe | Faux bois temporaire, nœuds rustiques |
| Éditorial absent | — | Oui (suppression) ou réduction titre + lien | Titre + lien À propos **si** texte prêt ; sinon retrait | Fabrication artisanale, banque d’images touristique |
| Catégories non validées | Destinations réelles seulement | Oui | 0–2 catégories réelles | Catégories fictives, badges |
| Capsule absente | — | Oui (retrait total) | Aucun (section absente) | Fausse capsule, espace vide réservé |
| Inscription courriel non fonctionnelle | — | Oui | Aucun (section absente) | Formulaire factice, fausse urgence, réduction obligatoire |

---

## 20. Critères de validation

### Rejeter si

- trop de contenu avant les produits ;
- répétition de `NO FIXED LINE.` comme grand titre ;
- plus de sections que le contenu réel ne peut soutenir ;
- ressemble à un template e-commerce ;
- dépend d’un logo final inexistant ;
- réserve un espace vide pour une capsule inexistante ;
- surcharge le mobile ;
- utilise des images comme texte ;
- crée des CTA sans destination réelle.

### Valider si

- l’ordre narratif est évident ;
- le Hero installe la marque rapidement ;
- les produits apparaissent tôt ;
- la page reste cohérente sans capsule ;
- tous les actifs manquants ont un fallback ;
- la version mobile est conçue, pas compressée ;
- l’intégration future peut être découpée par sections indépendantes.

---

## 21. Décisions à prendre après le wireframe

1. placement du wordmark ;
2. structure exacte du Hero ;
3. position finale de `NO FIXED LINE.` ;
4. grille produits bureau et mobile ;
5. nombre de catégories ;
6. maintien ou retrait du bloc éditorial ;
7. présence réelle d’une capsule ;
8. activation de l’inscription courriel ;
9. structure du footer ;
10. ordre définitif des sections.

---

## 22. Prochaine étape

1. validation du wireframe ;
2. création de la maquette visuelle bureau ;
3. création de la maquette mobile ;
4. production des actifs manquants ;
5. ajustement de `VISUAL_IDENTITY.md` et `HOMEPAGE_SPEC.md` si nécessaire ;
6. inventaire des composants React existants ;
7. plan d’intégration technique à faible risque.

---

**Fin du Draft — Homepage Wireframe v1.**
