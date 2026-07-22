# Flippin’ Maple — Direction visuelle de la page d’accueil

| Métadonnée | Valeur |
|---|---|
| **Chemin** | `docs/web/HOMEPAGE_VISUAL_DESIGN.md` |
| **Statut** | **Draft — Homepage Visual Design v1** |
| **Date** | 2026-07-21 |
| **Portée** | apparence haute fidélité prévue de la page d’accueil avant maquette finale et intégration |
| **Documents sources** | `docs/00_PROJECT_MASTER.md` · `docs/brand/VISION_AND_POSITIONING.md` · `docs/brand/VISUAL_IDENTITY.md` · `docs/web/HOMEPAGE_SPEC.md` · `docs/web/HOMEPAGE_WIREFRAME.md` |
| **Hors portée** | code React/CSS · images produites · logo final · prototype fonctionnel · modification du site |

Statuts : **Validé** · **Provisoire** · **Ouvert**.

Ce document ne prétend pas qu’une maquette graphique finale existe déjà.

---

## 1. Rôle du document

Ce fichier traduit la fondation de marque, la spécification fonctionnelle et le wireframe en **direction visuelle haute fidélité** pour la page d’accueil.

| Document | Lien |
|---|---|
| `VISUAL_IDENTITY.md` | Palette, typo, formes, motif, photographie, fondations |
| `HOMEPAGE_SPEC.md` | Contenu, objectifs, placeholders, règles de page |
| `HOMEPAGE_WIREFRAME.md` | Structure, proportions, responsive, fallbacks |
| Futures maquettes | Application visuelle de cette direction |
| Future intégration React | Exécution section par section, sans inventer une nouvelle esthétique |

**Ordre de priorité en cas de conflit :**

1. `docs/00_PROJECT_MASTER.md`
2. `docs/brand/VISION_AND_POSITIONING.md`
3. `docs/brand/VISUAL_IDENTITY.md`
4. `docs/web/HOMEPAGE_SPEC.md`
5. `docs/web/HOMEPAGE_WIREFRAME.md`
6. ce document (direction visuelle de page, jamais prioritaire sur la Constitution)

---

## 2. Statut des décisions

### Validé

- palette principale documentée comme **système de rôles et d’usage relatif** (structure clair / sombre) ;
- Maple Bone dominant ; Ink Black et Charcoal structurants ; Deep Forest comme grand fond de marque ; Weathered Maple comme transition tactile ; Cold Concrete comme information secondaire ; Oxide Red comme accent rare ;
- structure générale de la page ;
- grille éditoriale ;
- coins peu arrondis (2–4 px, max ~8 px) ;
- presque aucune ombre ;
- contraste élevé ;
- un seul grand usage de **`NO FIXED LINE.`** ;
- produit visible tôt ;
- capsule conditionnelle ;
- placeholders descriptifs obligatoires ;
- aucun actif fictif présenté comme réel ;
- priorité mobile ;
- logo final encore absent ;
- **une seule langue affichée à la fois** ;
- longueurs de texte adaptées **séparément** en français et en anglais ;
- aucun empilement français / anglais dans les mêmes composants ;
- **tutoiement** comme registre français ;
- **`NO FIXED LINE.`** identique (anglais) dans les deux langues ;
- sélecteur de langue futur : discret et fonctionnel (conception détaillée hors portée ici) ;
- CTA Hero : `Voir la boutique` / `Shop all` ;
- section homepage nommée **Catégories** ;
- composition Hero **split / séparée** par défaut ; **pas d’overlay photographique par défaut** ;
- feuille d’érable **visible** interdite dans les actifs homepage ;
- veinage abstrait non figuratif permis avec retenue ;
- Courriel **retiré** si formulaire non fonctionnel ;
- aucun faux logo / symbole provisoire.

### Provisoire

- nom de la direction **Northern Utility Editorial** ;
- codes hex exacts (à confirmer en maquette) ;
- Archivo SemiCondensed / Source Sans 3 ;
- placement de **`NO FIXED LINE.`** dans le Hero ;
- split Hero autour de 40/60 ;
- Header sticky ;
- nombre exact de produits ;
- nombre exact de catégories (2 recommandées) ;
- dimensions finales ;
- intensité du motif ;
- titres provisoires ;
- maintien de la section éditoriale ;
- présence de la section Courriel (si et seulement si formulaire fonctionnel).

### Ouvert

- logo final ;
- wordmark final ;
- photographies ;
- motifs finaux ;
- textes approuvés (FR et EN) ;
- produits réels ;
- capsule réelle ;
- conception détaillée du sélecteur de langue ;
- mécanisme technique bilingue (mémorisation, routes, SEO) ;
- mécanisme technique des produits vedettes ;
- validation juridique de **`NO FIXED LINE.`** ;
- mécanisme technique d’inscription courriel ;
- future exploration propriétaire d’un symbole inspiré de l’érable (distincte de la page d’accueil actuelle).

---

## 3. Concept visuel central

Direction de travail (**Provisoire** comme nom) : **NORTHERN UTILITY EDITORIAL**.

Combinaison à rendre visible :

- structure utilitaire (grille claire, boutons francs, navigation lisible) ;
- composition éditoriale (espace négatif, asymétrie contrôlée, photographie dominante) ;
- chaleur limitée des matières (Maple Bone, Weathered Maple) ;
- froideur urbaine canadienne (béton, asphalte, ciel couvert, Charcoal / Deep Forest) ;
- contrastes francs (clair/sombre, texte dense/espace) ;
- photographie naturelle ;
- détails de surface (textile, métal, bois abstrait) ;
- mouvement sans esthétique sportive littérale.

### Comment « Maple » se ressent sans feuille omniprésente

Par la chaleur contenue des fonds (Maple Bone), les matières (textile, bois abstrait), la retenue canadienne, et un vert profond discret (Deep Forest) — jamais par folklore souvenir.

**Page d’accueil :** toute **feuille d’érable visible** (générique, rouge, motif répété, pictogramme, faux logo) est **interdite** dans les actifs visibles. Un veinage / fibre **abstrait, non figuratif et subtil** reste permis avec retenue. Une future exploration propriétaire de symbole reste **ouverte** et **distincte** — elle n’autorise pas une feuille visible ici.

### Veinage d’érable

Actif **secondaire** : lignes abstraites, monochromes, peu contrastées, seamless. Matière, pas illustration. Jamais chalet, jamais logo, **jamais feuille figurative**.

La page doit paraître indépendante, urbaine, froide mais humaine, robuste, éditoriale, tactile, sobre, mature — crédible comme marque de vêtements, distincte d’un template e-commerce.

Elle ne doit pas paraître rustique, chalet, folklorique, patriotique, touristique, faux luxe, technologique, esport, varsity, racing, excessivement sportive, anonyme par minimalisme, ni surchargée d’ombres et cartes flottantes.

---

## 4. Palette appliquée à la page

Couleurs documentées dans `VISUAL_IDENTITY.md` (**codes hex provisoires** jusqu’à validation maquette) :

| Couleur | Hex | Rôle principal | Rôles secondaires | Sections possibles | Texte associé | Niveau d’usage | Interdictions |
|---|---|---|---|---|---|---|---|
| Ink Black | `#11110F` | Texte, structure, CTA principal | Séparateurs, wordmark mono | Header, Produits, Catégories, Footer (texte) | Maple Bone sur fond sombre | Structurant ~25 % | Grandes surfaces monotones ; remplacer Deep Forest comme accent |
| Maple Bone | `#F1ECE2` | Fond clair dominant | Texte sur fonds sombres | Header, Produits, Éditorial, Catégories, Courriel | Ink Black | Dominant ~60 % | Blanc pur par défaut ; crème souvenir saturée |
| Charcoal | `#292A27` | Surfaces sombres secondaires | Footer, déclaration alternative | Déclaration, Footer, Hero fallback | Maple Bone | Structurant | Texte long sur fond clair |
| Deep Forest | `#304238` | Grand fond de marque | Hover CTA, Hero fallback | Hero, Déclaration | Maple Bone | ~10 % grands moments | Vert outdoor générique dominant |
| Weathered Maple | `#B6A184` | Transition tactile | Fonds ponctuels, motif | Éditorial, Courriel | Ink Black (contraste vérifié) | ~5 % | Chalet, fond global saturé |
| Cold Concrete | `#737772` | Info secondaire | Métadonnées, labels | Microtexte, aides contextuelles | — | Faible | Texte principal |
| Oxide Red | `#893B32` | Accent exceptionnel | Capsules / campagnes ponctuelles | Rare | Maple Bone si fond rouge | Exceptionnel | CTA systématiques, couleur dominante |

**Répartition indicative de page :** Maple Bone dominant ; Ink Black / Charcoal structurants ; Deep Forest pour grands fonds de marque ; Weathered Maple en transition ; Cold Concrete pour secondaire ; Oxide Red jamais dominant ni sur chaque CTA.

---

## 5. Typographie appliquée

**Provisoire** (familles) :

- **Archivo SemiCondensed** — titres, navigation, éléments structurants (600 / 700 / 800 avec retenue) ;
- **Source Sans 3** — corps et informations fonctionnelles (400 / 500 / 600).

| Niveau | Famille | Graisse | Casse | Approche | Interligne | Longueur max | Mobile | Rôle |
|---|---|---|---|---|---|---|---|---|
| H1 | Archivo SC | 700–800 | Capitales ou casse titre | Serrée, compacte | ~0,95–1,05 | Très courte (ex. signature) | Présent, réduit sans perdre la force | Moment de marque |
| H2 | Archivo SC | 600–700 | Casse titre | Normale | ~1,0–1,1 | Courte | Clair, non compressé | Sections |
| H3 | Archivo SC | 600 | Casse titre | Normale | ~1,1 | Courte | Si sous-structure réelle | Catégories / groupes |
| Introduction / texte d’appui | Source Sans 3 | 400–500 | Phrase | Ouverte | ~1,5–1,6 | 1–2 phrases | Lisibilité prioritaire | Appui Hero / éditorial |
| Corps | Source Sans 3 | 400 | Phrase | Normale | ~1,5–1,65 | 40–80 mots max déclaration | Idem | Paragraphes |
| Navigation | Archivo SC | 600 | Casse titre, libellés courts | Serrée | ~1,1–1,2 | Mots courts | Menu empilé | Header |
| Prix | Source Sans 3 ou Archivo SC | 600 | — | Claire | ~1,2 | Court | Lisible en grille 2 col | Cartes produit |
| Microtexte | Source Sans 3 | 400–500 | — | Ouverte | ~1,4 | Non critique | Cold Concrete possible | Aides contextuelles, légal |
| Boutons | Source Sans 3 | 500–600 | Casse titre, libellé court | Normale | ~1,1–1,2 | Court | Pleine largeur mobile | CTA |
| Labels / champs | Source Sans 3 | 400–500 | — | Normale | ~1,3 | Court | Tactile | Formulaires |

Capitales : réservées aux textes courts. Pas de capitales intégrales dans les longs paragraphes.

**Langue et composition (Validé) :** une seule langue visible à la fois ; prévoir des longueurs FR et EN adaptées séparément ; aucun empilement bilingue dans un même composant ; tutoiement en français ; `NO FIXED LINE.` identique dans les deux langues.

### Traitement de `NO FIXED LINE.`

- grand, franc, compact, lisible ;
- **une seule occurrence dominante** ;
- aucun effet décoratif complexe, aucune déformation, aucune texture qui compromet la lecture ;
- distinct du logo ;
- forme anglaise inchangée en FR et EN (**Validé**) ;
- placement Hero = **Provisoire** (si au Hero, déclaration = titre complémentaire).

---

## 6. Grille et cadre de contenu

Issu de `VISUAL_IDENTITY.md` (**Provisoire** pour mesures exactes) :

| Contexte | Cadre |
|---|---|
| Bureau | Max ~1440 ; principal ~1280 ; 12 colonnes ; marges 32–48 ; gouttières 24 |
| Tablette | 6 colonnes ; marges 24–32 ; gouttières 20 |
| Mobile | 4 colonnes ; marges 16–20 ; gouttières 12–16 |
| Textes longs | Largeur utile ~700–760 px |

### Distinctions compositionnelles

| Type | Usage |
|---|---|
| Grand fond pleine largeur | Hero fallback, Déclaration, Footer |
| Contenu central | Textes, formulaires, grilles |
| Image débordante | Hero image, bannière capsule |
| Grille produits | 3 (recommandé) / 4 conditionnel · 2 col mobile |
| Grille catégories | 2 recommandées · empilement mobile |
| Bloc éditorial asymétrique | Image verticale + texte adjacent |

Alignements volontaires ; ruptures contrôlées (asymétrie éditoriale, pas chaos).

---

## 7. Rythme vertical

Plages (`VISUAL_IDENTITY.md`) :

- **32–48** — groupes / transitions compactes ;
- **64–96** — sections standard ;
- **96–128** — grands moments éditoriaux.

| Section | Espace avant | Espace après | Densité interne | Mobile | Risque à éviter |
|---|---|---|---|---|---|
| Header | 0 | Faible | Compacte | Compact | Hauteur qui vole le Hero |
| Hero | 0 | 64–96 / 96–128 | Aérée | Stack aéré | Hero trop haut qui repousse les produits |
| Produits | 64–96 | 64–96 | Moyenne | 2 col | Grille catalogue dense |
| Déclaration | 64–96 | 64–96 | Moyenne-basse | Stack | Manifeste trop long |
| Éditorial | 64–96 / 96–128 | 64–96 | Aérée | Image puis texte | Banque d’images touristique |
| Catégories | 64–96 | 64–96 | Moyenne | Empilé | Trop de tuiles |
| Capsule | 64–96 si présente | 64–96 | Moyenne | 4:5 | Espace réservé si absente |
| Courriel | 32–48 / 64–96 | 32–48 | Compacte | Vertical | Popup / urgence |
| Footer | 32–48 | 0 | Compacte | Empilé | Colonnes vides |

Pas de conversion CSS définitive ici.

---

## 8. Header — direction visuelle

### Bureau

```
┌────────────────────────────────────────────────────────────┐
│ Maple Bone                                                 │
│ [WORDMARK placeholder]   Nav    Compte   Panier            │
└────────────────────────────────────────────────────────────┘
```

| Élément | Direction |
|---|---|
| Fond | Maple Bone |
| Hauteur | Compacte |
| Wordmark | Gauche (recommandation de travail) ou centré (**Provisoire**) ; monochrome |
| Navigation | Archivo SC, libellés courts, hover = Deep Forest ou soulignement discret |
| Compte / panier | Icônes ou texte sobres ; pas de badges promo |
| Séparation | Ligne 1 px Cold Concrete / Ink Black faible, ou aucune |
| Sur Hero clair/sombre | Header reste Maple Bone par défaut ; variante sticky sur sombre = **Provisoire** |
| Sticky | **Provisoire** |
| Hover / focus | Contraste clair ; focus visible |
| Fallback wordmark | Capitales neutres, typo d’interface ; aucun symbole inventé |

### Mobile

```
┌──────────────────────────┐
│ [≡] [WORDMARK] [Panier]  │
└──────────────────────────┘
┌──────────────────────────┐
│ Menu ouvert Maple Bone   │
│ Boutique                 │
│ Nouveautés               │
│ Essentiels               │
│ À propos                 │
│ Compte                   │
│ [Fermer]                 │
└──────────────────────────┘
```

| Élément mobile | Direction |
|---|---|
| Fond | Maple Bone |
| Séparation | Ligne basse 1 px facultative (Cold Concrete / Ink Black faible) |
| Hiérarchie | Menu (≡) · wordmark · panier |
| Zones tactiles | Suffisantes pour ≡, wordmark, panier et chaque lien du menu |
| Menu ouvert | Fond Maple Bone ; liens empilés ; ordre de lecture clair |
| Fermeture | Contrôle explicite « Fermer » ou ≡ basculable ; focus visible |
| Focus | Visible sur ≡, liens, panier, fermeture |
| Barre promo | Absente |
| Fallback wordmark | Capitales neutres, typo d’interface ; aucun symbole inventé |

---

## 9. Hero — direction visuelle

### Recommandation principale (**Validé** comme défaut de composition · **Provisoire** pour le ratio exact)

- split ~**40 % texte / 60 % image** (ratio exact Provisoire) ;
- texte à gauche, image à droite (bureau) ;
- empilé sur mobile (image puis texte, ou image 4:5 avec texte dans zone dédiée) ;
- **aucun overlay photographique par défaut** ;
- zone de lecture suffisante pour textes FR et EN **séparément** ;
- alignement volontaire ;
- fallback Deep Forest ou Charcoal si aucune photo crédible ;
- aucune feuille d’érable visible.

```
┌──────────────────┬─────────────────────────────┐
│ Maple Bone /     │ [PLACEHOLDER — IMAGE HERO   │
│ texte            │  CAMPAGNE PRINCIPALE]       │
│ FLIPPIN’ MAPLE   │                             │
│ NO FIXED LINE.   │                             │
│ Appui            │                             │
│ [CTA selon langue]│                             │
│                  │                             │
└──────────────────┴─────────────────────────────┘
```

| Élément | Direction |
|---|---|
| Fond | Maple Bone côté texte ; image ou Deep Forest / Charcoal |
| Sur-titre | `FLIPPIN’ MAPLE` — discret |
| Titre | `NO FIXED LINE.` — H1, emplacement de travail |
| Paragraphe | 1–2 phrases max (selon `HOMEPAGE_COPY.md`) |
| CTA | `Voir la boutique` (FR) / `Shop all` (EN) — Ink Black / texte Maple Bone → boutique réelle |
| Image | Voir §19 ; espace négatif pour zone texte dédiée (split) |
| Recadrage | 16:9 ou 3:2 bureau ; 4:5 mobile |
| Contraste | Texte jamais sur zone illisible ; split par défaut |
| Hauteur / flottaison | Immersif mais produit amorcé rapidement |
| Fallback | Deep Forest ou Charcoal + Maple Bone |

**Premier regard :** marque indépendante, direction, mouvement, confiance — pas de survente.

**Ancienne formulation CTA non retenue :** `Découvrir la collection` / `Shop the collection`.

**Variante overlay :** exception seulement — contraste mesurable, zone négative réelle, lecture FR/EN séparée, mobile crédible, sans voile excessif, validation maquette / intégration. **Jamais le comportement par défaut.**

---

## 10. Produits — direction visuelle

Fond Maple Bone. Titre H2 + lien « Voir la boutique ».

- grille **3 produits recommandée** ; 4e conditionnel à la curation ;
- mobile **2 colonnes** ;
- cartes sans encadrement lourd, sans fond blanc flottant, sans rayon excessif, sans ombre décorative ;
- images **4:5**, cadrages cohérents ;
- nom + prix en texte ; variante seulement si utile ;
- hover : léger changement de contraste ou soulignement, pas de lift 3D ;
- focus visible ;
- rupture de stock : état clair, non trompeur ;
- image absente : ne pas inventer un mockup Printful brut dans un set éditorial ;
- seulement 2 produits forts : afficher 2.

Présence éditoriale = rythme, cohérence photo, titres sobres — sans nuire à l’achat.

---

## 11. Déclaration de marque — direction visuelle

Fond **Charcoal** ou **Deep Forest** ; texte Maple Bone.

```
┌──────────────────────────────────────────────┐
│ Motif veinage discret (ou aplat)             │
│ TITRE COMPLÉMENTAIRE │ Paragraphe 40–80 mots │
└──────────────────────────────────────────────┘
```

- titre large (complémentaire si `NO FIXED LINE.` est au Hero) ;
- motif abstrait secondaire ;
- contraste élevé ;
- composition asymétrique bureau ; stack mobile ;
- **aucun CTA obligatoire** ; lien À propos optionnel ;
- fallback sans motif = aplat.

Ne jamais répéter la signature comme décoration.

---

## 12. Bloc éditorial matière / territoire

Composition asymétrique : image verticale (3:4 ou 4:5) + texte adjacent sur Maple Bone ou Weathered Maple pâle.

- texture, mouvement, froideur naturelle ;
- présence humaine éventuelle, non posée ;
- titre court + paragraphe + lien optionnel ;
- mobile : image puis texte ;
- fallback : section retirée ou réduite.

**Interdit :** forêt carte postale, cabane, plaid central, feuille touristique, faux artisanal, fausse origine, texte illisible sur l’image.

---

## 13. Catégories — direction visuelle

**Nom de section :** `Catégories` / `Categories`.
`Essentiels` n’est **pas** le nom de cette section (nav provisoire ou collection réelle seulement si destination réelle).

**Recommandation lancement : 2 grandes catégories** réelles.

Deux blocs égaux, images 4:5 ou 3:4, titre hors image, carte entière cliquable, fond Maple Bone.

Variante **3 catégories** seulement si trois destinations réelles existent.

Mobile : empilement (ou 2 col si lisible). Pas de catégories vides. Non validées / sans destination → **retrait ou réduction**. Aucune fausse catégorie. Aucune feuille d’érable figurative sur les tuiles.

---

## 14. Capsule conditionnelle

Seulement si capsule **réelle**.

- bureau bannière **2:1** ; mobile **4:5** (ou 3:4) ;
- titre, texte court, CTA si destination réelle ;
- traitement campagne distinct du Hero (pas un second Hero) ;
- **retrait complet** si absente — aucun espace réservé.

---

## 15. Inscription courriel

**Conditionnelle.** Formulaire non fonctionnel → **retrait complet** (repli normal). Mécanisme technique hors portée. Aucun faux formulaire.

Fond Weathered Maple pâle ou Maple Bone contrasté.

- bureau : champ + bouton horizontaux possibles ;
- mobile : stack pleine largeur ;
- label, champ, bouton « S’inscrire », lien confidentialité **réelle** ;
- états : normal, focus, erreur, succès, désactivé — **seulement si branchement réel** ;
- aucun popup auto, aucune réduction artificielle, aucune fausse urgence ;
- motif abstrait optionnel seulement ; **aucune feuille d’érable visible** ;
- texte final (**Ouvert**) ; formulations selon `HOMEPAGE_COPY.md` / `VOICE.md`.

---

## 16. Footer

Fond Ink Black ou Charcoal ; texte Maple Bone ; wordmark placeholder.

- groupes : boutique, service, légal, réseaux **réels uniquement** ;
- densités compactes ; séparations fines ;
- bureau : groupes en colonnes ; mobile : empilé ;
- fallback typographique wordmark ;
- contraste et focus élevés ;
- aucune colonne vide ni lien factice.

---

## 17. Boutons et liens

### Règles communes

| Règle | Valeur |
|---|---|
| Rayon commun | Faible, 2–4 px |
| Densité | Compacte pour navigation et liens ; confortable pour boutons et contrôles tactiles |
| Hauteur tactile mobile | Suffisante pour doigt |
| Forme | Aucune pilule excessive |
| Ombre | Aucune |
| Dégradé | Aucun |
| Oxide Red | Jamais systématique sur les CTA |

| Type | Fond | Texte | Bordure | Densité | Hauteur | Normal | Hover | Focus | Actif | Désactivé | Mobile |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Bouton principal | Ink Black | Maple Bone | Aucune | Confortable | Confortable | Franc | Deep Forest ou inversion contrôlée | Anneau visible | Légèrement plus sombre | Opacité réduite | Pleine largeur si seul CTA |
| Bouton secondaire | Transparent | Ink Black | 1 px Ink Black | Confortable | Idem | Outline | Rempli Ink Black / Maple Bone | Visible | Léger inset | Opacité réduite | Idem |
| Lien éditorial | — | Ink Black / Maple Bone | — | Compacte | — | Souligné discret ou non | Souligné / Deep Forest | Visible | — | — | Zone tactile |
| Lien navigation | — | Ink Black | — | Compacte | — | Clair | Contraste ↑ | Visible | — | — | Empilé |
| Lien carte produit | — | Ink Black | — | Compacte | — | Carte entière | Contraste image/texte | Visible | — | — | 2 colonnes |
| Lien catégorie | — | Ink Black | — | Compacte | — | Carte entière | Idem | Visible | — | — | Empilé |
| Icône compte / panier | — | Ink Black | — | Compacte | Tactile | Sobre | Contraste | Visible | — | — | Zones séparées |
| Menu | — | Ink Black | — | Compacte | Tactile | ≡ | — | Visible | Ouvert | — | Prioritaire |

Sur fond sombre : bouton principal = Maple Bone / texte Ink Black. Rayon = règles communes (2–4 px) pour tous les boutons.

---

## 18. Formulaires

Cohérent avec le futur bloc courriel (sans examiner le code à cette étape).

| Élément / état | Traitement |
|---|---|
| Champ normal | Fond Maple Bone ou légèrement contrasté ; bordure 1 px Cold Concrete / Ink Black |
| Label | Source Sans 3, toujours visible ; le placeholder ne remplace jamais le label |
| Placeholder | Cold Concrete ; indication d’exemple uniquement |
| Texte descriptif | Court, sous le label ou le champ, si une précision est utile |
| Message d’aide | Texte secondaire (Cold Concrete) ; jamais seul porteur d’une règle critique |
| Focus | Bordure Ink Black / Deep Forest ; anneau focus visible |
| Erreur | Message texte explicite + bordure ; pas seulement la couleur |
| Succès | Message clair et sobre près du champ ou du formulaire |
| Désactivé | Opacité réduite ; non focusable de façon trompeuse |
| Rayon | Faible (2–4 px) |
| Espacement | 8–16 internes ; 16–24 entre groupes |
| Tactile | Hauteur confortable mobile ; cible suffisante |
| Couleur seule | Interdite comme unique signal d’erreur ou de succès |

---

## 19. Images et photographie

Direction commune : lumière naturelle, tons froids, matières visibles, cadrages honnêtes, mouvement réel, contexte urbain canadien, détail vêtement, texture, présence humaine non artificielle, cohérence colorimétrique.

### Placeholders (précision conservée depuis SPEC / WIREFRAME)

Aucun de ces actifs n’est présenté comme déjà produit.

#### WORDMARK FLIPPIN’ MAPLE

| Champ | Spécification |
|---|---|
| Statut | Actif définitif **non disponible** |
| Rôle | Identifier la marque (header et footer) |
| Traitement temporaire | Capitales, typographie d’interface prévue |
| Format final | SVG monochrome |
| Contraste | Fonctionne sur Maple Bone, Ink Black, Deep Forest |
| Alt / accessibilité | Lien texte accessible (ex. « Flippin’ Maple — Accueil ») |
| Fallback | Wordmark typographique monochrome en capitales |
| Interdictions | Aucun symbole inventé ; aucune feuille ; aucun effet flip |
| Remplacement | Sans modifier la structure du header / footer |

#### IMAGE HERO CAMPAGNE PRINCIPALE

| Champ | Spécification |
|---|---|
| Statut | À produire |
| Rôle | Installer l’univers et soutenir `NO FIXED LINE.` |
| Sujet | 1–2 adultes, vêtements sobres, urbain canadien froid, mouvement naturel ; planche seulement si non démonstrative |
| Direction | Streetwear mature ; skate origine ; surf/snowboard en attitude ; lumière couverte ; béton, asphalte, métal, bois clair |
| Cadrage bureau | Horizontal ; sujet tiers droit ; espace négatif gauche |
| Cadrage / ratio mobile | 4:5 ou zone centrale protégée |
| Ratio bureau | 16:9 ou 3:2 |
| Résolution min. | 2400×1350 bureau ; 1600×2000 mobile si version séparée |
| Format | AVIF / WebP (+ JPEG de repli) |
| Contraste | Texte jamais sur zone illisible ; fallback sombre lisible |
| Alt | Factuel : personne, vêtement, contexte visibles |
| Fallback | Deep Forest ou Charcoal + texte Maple Bone |
| Interdictions | Logos tiers, néons, pose adolescente, trick cliché, chalet, feuille d’érable, saturation, texte incrusté |
| Retrait | Le Hero reste ; seule l’image passe en fallback couleur |

#### PHOTOGRAPHIES PRODUITS COHÉRENTES

| Champ | Spécification |
|---|---|
| Statut | À produire |
| Rôle | Commercial (achat) et éditorial (cohérence de marque) |
| Sujet | Produit isolé ou porté, selon stratégie photo |
| Direction | Fond Maple Bone / gris clair / environnement sobre ; éclairage cohérent |
| Ratio bureau / mobile | 4:5 constant |
| Résolution min. | 1600×2000 |
| Format | AVIF / WebP |
| Contraste | Nom et prix hors image, lisibles sur Maple Bone |
| Recadrage mobile | Ratio 4:5 conservé en grille 2 colonnes |
| Alt | Nom, couleur, type de vêtement (sans promo) |
| Fallback image manquante | Ne pas inventer un mockup Printful brut dans un set éditorial |
| Réduction de grille | Photos incohérentes → sélection réduite validée ; 2 produits forts → afficher 2 |
| Interdictions | Logos tiers ; mélange de mockups Printful bruts avec une série éditoriale sans traitement cohérent |

#### MOTIF DE VEINAGE D’ÉRABLE SOMBRE

| Champ | Spécification |
|---|---|
| Statut | À produire |
| Rôle | Matière secondaire sur la déclaration |
| Sujet / direction | Seamless abstrait ; lignes longues irrégulières ; pas de planche ni nœud |
| Traitement | Maple Bone ~5–8 % sur Charcoal / Deep Forest |
| Format | SVG seamless prioritaire ; WebP/PNG en repli |
| Contraste | Très faible ; texte immédiatement lisible |
| Mobile | Plus discret ; pas de détail essentiel dépendant du motif |
| A11y | CSS = décoratif ; HTML décoratif = `alt=""` |
| Fallback | Aplat de couleur |
| Interdictions / retrait | Pas de faux bois ; motif retiré si absent ; section déclaration peut rester |

#### IMAGE ÉDITORIALE MATIÈRE ET TERRITOIRE

| Champ | Spécification |
|---|---|
| Statut | À produire |
| Rôle | Contraste tactile avec les cartes produits |
| Sujet | Textile, bois clair, béton, main / planche / couture possibles |
| Direction | Lumière naturelle ; cadrage rapproché ; désaturé ; vécu, non banque d’images |
| Ratio bureau | 3:4 ou 4:5 (3:2 optionnel) |
| Ratio / recadrage mobile | Vertical prioritaire ; image puis texte |
| Résolution min. | 1800×2400 (vertical) |
| Format | AVIF / WebP |
| Contraste | Texte adjacent hors image ; image ne porte pas le message seul |
| Alt | Factuel : matières et objets visibles |
| Fallback | Section retirée ou réduite (titre + lien si texte prêt) |
| Interdictions | Cabane, bûcheron, plaid, tas de bois, feuille déco, sepia, faux artisanal |
| Retrait | Ne pas conserver une image faible uniquement pour remplir la section |

#### IMAGE DE CATÉGORIE

| Champ | Spécification |
|---|---|
| Statut | À produire |
| Rôle | Représenter une catégorie réelle et cliquable |
| Sujet | Pièce portée ou détail clair du type de produit |
| Direction | Même univers que le Hero ; composition distincte entre catégories |
| Cadrage | Espace pour titre hors image ; cohérence entre tuiles |
| Ratio bureau | 4:5 ou 3:4 |
| Ratio / recadrage mobile | Empilement ou 2 colonnes ; sujet lisible |
| Résolution min. | Aligner sur produits (~1600×2000 si 4:5) |
| Format | AVIF / WebP |
| Contraste | Titre en texte réel sur Maple Bone |
| Alt | Type de vêtement et contexte visible |
| Fallback / retrait | Catégorie ou destination non réelle → retrait |
| Interdictions | Texte intégré dans l’image ; autre marque visible ; catégories fictives |

#### BANNIÈRE CAPSULE

| Champ | Spécification |
|---|---|
| Statut | Conditionnel — à produire seulement si capsule réelle |
| Rôle | Second moment de campagne, distinct du Hero |
| Sujet | À définir selon la capsule |
| Direction de campagne | Compatible Northern Utility Editorial ; variation saisonnière possible |
| Cadrage | Bannière large bureau ; composition verticale mobile |
| Ratio bureau | 2:1 |
| Ratio / recadrage mobile | 4:5 ou 3:4 |
| Résolution min. | 2400×1200 bureau |
| Format | AVIF / WebP |
| Contraste | Titre / CTA lisibles hors zone faible |
| Alt | Factuel selon sujet réel |
| Fallback / retrait | Absente → **retrait complet** ; aucun espace réservé |
| Interdictions | Fausse capsule ; CTA sans destination ; concurrence visuelle avec le Hero |

---

## 20. Motif de veinage d’érable

| Aspect | Règle |
|---|---|
| Rôle | Secondaire, matière |
| Abstraction | Fil / fibre abstrait — **pas** planche, **pas** feuille figurative |
| Fréquence / densité | Faible ; une section max typiquement |
| Contraste / échelle | Très bas ; échelle large seamless |
| Placement autorisé | Déclaration ; ponctuellement courriel / manifeste |
| Homepage | Feuille visible **interdite** ; veinage abstrait seulement avec retenue |
| Futur symbole propriétaire | Décision **ouverte et distincte** — n’autorise pas une feuille sur la page actuelle |
| Interdit | Produits toutes cartes, fond global permanent, derrière logo, derrière petit texte, chalet, feuille générique / rouge / répétée, faux logo |
| Mobile | Plus discret |
| Fallback | Aplat |
| A11y | Décoratif |

Ne jamais : illustration rustique, couverture totale, compromission de lecture, remplacement photo, devenir logo, décor chalet, feuille figurative.

---

## 21. Mouvement et interactions

Principes (pas de code) :

- transitions rapides (~150–250 ms conceptuel) ;
- déplacements courts ;
- apparition sobre ;
- aucune animation obligatoire à la compréhension ;
- `prefers-reduced-motion` ;
- aucun carrousel auto, parallax lourd, zoom agressif, effet futuriste.

| Zone | Interaction |
|---|---|
| Navigation | Hover contraste / soulignement discret |
| Boutons | Hover Deep Forest ou fill ; focus visible |
| Produits | Léger contraste ; pas de lift ombre |
| Catégories | Idem carte |
| Images éditoriales | Zoom très faible optionnel |
| Formulaire | Focus bordure ; messages texte |

---

## 22. Responsive haute fidélité

| | Petit mobile | Mobile large | Tablette | Bureau | Grand bureau |
|---|---|---|---|---|---|
| Cadre | 4 col | 4 col | 6 col | 12 / ~1280 | 12 / max ~1440 |
| Typo | H1 réduit mais fort | Idem | Transition | Pleine hiérarchie | Textes ≤ ~700–760 |
| Header | ≡ wordmark panier | Idem | Nav partielle possible | Nav complète | Idem |
| Hero | 4:5 stack | Idem | Split ou stack | 40/60 | Idem centré |
| Produits | 2 col | 2 col | 2–3 | 3 (4 si curation) | Idem |
| Déclaration | Stack | Stack | Split possible | Asymétrique | Idem |
| Éditorial | Image→texte | Idem | Split | Asymétrique | Idem |
| Catégories | Empilé | 1–2 col | 2 | 2 | 2 |
| Capsule | Absente ou 4:5 | Idem | Transition | 2:1 | Idem |
| Courriel | Vertical | Vertical | Horizontal possible | Horizontal possible | Idem |
| Footer | Empilé | Empilé | Groupes | Colonnes | Idem |
| Images | Recadrage intentionnel | Idem | Idem | Ratios spec | Idem |
| CTA | Pleine largeur | Idem | Accessibles | Dans flux | Idem |
| Espacement | 32–64 | 32–64 | 48–96 | 64–128 | Idem |
| Éléments simplifiés ou retirés | Motif réduit ; nav en menu ; capsule absente si inexistante ; aucun contenu essentiel retiré ; pas de bureau compressé | Idem + catégories éventuellement 2 col | Capsule en transition ou absente ; nav partielle possible | Motif limité ; capsule 2:1 seulement si réelle | Idem ; textes longs bornés |

Mobile = composition complète, pas bureau compressé.

---

## 23. Accessibilité visuelle

- contrastes élevés (Maple Bone / Ink Black / Deep Forest) ;
- focus visible partout ;
- cibles tactiles suffisantes ;
- lignes ~700–760 px max pour longs textes ;
- ordre visuel = ordre de lecture ;
- **H1 unique** (Hero) ; H2 sections ; H3 seulement si sous-structure réelle ;
- alt factuels ; décoratifs `alt=""` ou CSS ;
- aucune info seulement par la couleur ;
- aucune info indispensable seulement dans une image ;
- réduction des mouvements ;
- erreurs formulaires en texte + indicateur.

---

## 24. États et fallbacks visuels

| État | Traitement visuel | Conservée / retirée | Minimum acceptable | Interdit |
|---|---|---|---|---|
| Logo absent | Wordmark typographique monochrome en capitales | Conservée | Wordmark typographique monochrome en capitales | Symbole inventé |
| Hero sans image | Deep Forest / Charcoal + Maple Bone | Conservée | Sur-titre, H1, appui, CTA | Image générique |
| Produits incohérents | Grille réduite cohérente | Conservée réduite | Sélection curatée | Ajout automatique de mockups Printful bruts |
| Seulement deux produits | Deux cartes 4:5 | Conservée | Deux pièces fortes | Remplissage artificiel |
| Motif absent | Aplat | Déclaration conservée | Titre + texte | Faux bois |
| Éditorial absent | — | Retrait ou réduction | Titre + lien si texte prêt | Faux artisanal |
| Catégories non validées | — | Retrait | Destinations réelles | Catégories fictives |
| Capsule absente | — | Retrait total | Rien | Espace réservé |
| Courriel non fonctionnel | — | Retrait | Rien | Formulaire factice |
| Texte non approuvé | Placeholders textuels sobres | Structure conservée | Formulations de travail marquées | Texte marketing inventé présenté comme final |
| Photo trop faible | Fallback couleur / retrait section | Selon section | Présentation visuelle crédible | Garder une mauvaise image |
| Contraste insuffisant | Ajuster fond/texte | Conservée après correction | Lisibilité immédiate | Overlay forcé |

---

## 25. Vue visuelle séquentielle de la page

1. Header — Maple Bone
2. Hero — image ou Deep Forest
3. Produits — Maple Bone
4. Déclaration — Charcoal ou Deep Forest
5. Éditorial — Maple Bone ou Weathered Maple
6. Catégories — Maple Bone
7. Capsule — conditionnelle
8. Courriel — Weathered Maple pâle
9. Footer — Ink Black ou Charcoal

**Éviter la monotonie et la concurrence :**

- ne pas alterner clair / sombre à chaque section de façon mécanique ; laisser Maple Bone porter plusieurs sections commerciales d’affilée (produits, catégories) ;
- utiliser Weathered Maple comme **transition tactile** (éditorial, courriel), pas comme fond dominant ;
- ne pas enchaîner deux grands fonds sombres (ex. déclaration puis footer) sans section claire entre eux — le Hero sombre et la déclaration sombre doivent être séparés par les produits Maple Bone ;
- limiter le motif à un usage secondaire (déclaration) pour qu’il ne rivalise pas avec la photographie ;
- empêcher Hero, déclaration et capsule de se concurrencer : un seul grand moment de signature, déclaration en profondeur courte, capsule seulement si réelle et distincte.

---

## 26. Scénario visuel recommandé

### Bureau

Entrer sur Maple Bone : header compact, wordmark placeholder gauche, nav sobre. Hero split 40/60 : à gauche `FLIPPIN’ MAPLE` + `NO FIXED LINE.` + appui court + CTA Ink Black ; à droite photographie urbaine froide (placeholder) ou Deep Forest. Descendre vers trois produits 4:5 cohérents, lien boutique. Moment sombre : déclaration avec titre complémentaire et motif discret ou aplat. Bloc éditorial asymétrique matière/territoire. Deux grandes catégories. Pas de capsule si absente. Courriel sobre sur Weathered Maple pâle si activé. Footer sombre, liens réels, wordmark placeholder.

### Mobile

Même récit empilé : header ≡ / wordmark / panier ; Hero 4:5 + texte + CTA ; produits en **2 colonnes** ; déclaration stack ; éditorial image puis texte ; catégories empilées ; capsule **absente** lorsqu’elle n’existe pas (sinon 4:5) ; courriel vertical ; footer empilé.

Composition pensée pour le pouce, pas compressée depuis le bureau. Aucune compression directe du mise en page bureau.

Images, textes et logo restent **à produire / à approuver** — la structure ne dépend pas de leur existence finale grâce aux fallbacks.

---

## 27. Variantes à tester en maquette

| Variante | Bénéfice | Risque | Condition de validation |
|---|---|---|---|
| Hero split vs overlay | Split = lisibilité ; overlay = immersion | Overlay illisible | Contraste mesuré |
| Hero Deep Forest vs Charcoal | Identité vs neutralité | Sombre agressif | Lisibilité et cohérence de la palette |
| Header sticky vs statique | Accès panier | Concurrence Hero | Ne vole pas le premier regard |
| 3 vs 4 produits | Densité commerciale | Dilution curation | 4 seulement si 4 images fortes |
| 2 vs 3 catégories | Clarté vs couverture | Tuiles faibles | 2 pour petit catalogue |
| Éditorial on/off | Profondeur marque | Page trop longue / image faible | Retrait si actif faible |
| Courriel on/off | Relation | Bruit | Fonctionnel + texte prêt |
| Intensité motif | Matière | Illisibilité / rustique | Contraste très bas |
| Capsule on/off | Campagne | Fausse capsule | Uniquement si réelle |

---

## 28. Critères de rejet

Rejeter si :

- template Shopify générique ;
- rustique ou touristique ;
- feuille d’érable en gimmick ;
- trop d’Oxide Red ;
- ombres et cartes flottantes inutiles ;
- rayons excessifs ;
- répétition de `NO FIXED LINE.` ;
- produits cachés ;
- dépendance à actifs inexistants présentés comme réels ;
- mobile surchargé ;
- histoire de fabrication inventée ;
- look esport, varsity ou outdoor technique ;
- esthétique au détriment de la fonction commerciale.

---

## 29. Critères de validation

Valider si :

- marque reconnaissable avant logo final ;
- Hero fort sans pub générique ;
- produits tôt ;
- palette maîtrisée ;
- motif secondaire ;
- mobile pleinement conçu ;
- fallbacks crédibles ;
- page pleinement fonctionnelle sans capsule ;
- photos/textes remplaçables sans casser la structure ;
- intégration possible section par section ;
- aucun changement technique risqué requis pour la direction.

---

## 30. Décisions nécessaires avant la maquette finale

1. wordmark ou fallback typographique ;
2. position finale de `NO FIXED LINE.` ;
3. Hero split ou overlay ;
4. image Hero réelle ou fallback ;
5. sélection produits ;
6. trois ou quatre produits ;
7. deux ou trois catégories ;
8. maintien du bloc éditorial ;
9. maintien du formulaire courriel ;
10. capsule réelle ou absente ;
11. textes approuvés ;
12. conception détaillée du sélecteur de langue (hors portée actuelle) ;
13. intensité du motif ;
14. Header sticky ou statique.

---

## 31. Prochaine étape

1. validation de la direction visuelle ;
2. création d’une maquette bureau haute fidélité ;
3. création de la maquette mobile correspondante ;
4. validation des textes ;
5. production ou sélection des actifs ;
6. ajustement des documents de marque et Web ;
7. inventaire des composants React existants ;
8. plan d’intégration technique ;
9. intégration progressive ;
10. tests ;
11. commit séparé ;
12. aucun déploiement sans autorisation.

---

**Fin du Draft — Homepage Visual Design v1.**
