# Flippin’ Maple — Spécification de la page d’accueil

| Métadonnée | Valeur |
|---|---|
| **Chemin** | `docs/web/HOMEPAGE_SPEC.md` |
| **Statut** | **Draft — Homepage Specification v1** |
| **Date** | 2026-07-21 |
| **Portée** | structure, contenu, règles visuelles, responsive, accessibilité, performance et actifs nécessaires pour la future page d’accueil |
| **Documents supérieurs** | `docs/00_PROJECT_MASTER.md` · `docs/brand/VISION_AND_POSITIONING.md` · `docs/brand/VISUAL_IDENTITY.md` |
| **Hors portée** | implémentation React/CSS · logo final · photographies finales · catalogue de lancement · architecture technique détaillée |

**Ordre d’autorité en cas de conflit :**

1. `docs/00_PROJECT_MASTER.md` (décisions structurantes) ;
2. `docs/brand/VISION_AND_POSITIONING.md` (stratégie de marque) ;
3. `docs/brand/VISUAL_IDENTITY.md` (direction visuelle de travail).

Statuts utilisés : **Validé** · **Provisoire** · **Ouvert**.

---

## 1. Rôle du document

Ce fichier définit, pour la future page d’accueil de Flippin’ Maple :

- la structure de la page ;
- la hiérarchie des sections ;
- les objectifs de chaque section ;
- les contenus attendus ;
- les actifs visuels nécessaires ;
- les règles responsive ;
- les contraintes d’accessibilité ;
- les éléments à valider avant toute intégration React.

Ce n’est **pas** une implémentation technique. Aucun composant, aucune feuille de style et aucun actif graphique ne sont fournis ici.

La page d’accueil doit être une **application de la marque**, pas la marque elle-même. Elle suit la direction de travail **Northern Utility Editorial** (`VISUAL_IDENTITY.md`) et le positionnement de `VISION_AND_POSITIONING.md`.

### Principe narratif

> Découvrir la marque, comprendre son attitude, voir une sélection maîtrisée et accéder rapidement aux produits.

La page ne doit pas tenter de présenter tout le catalogue.

---

## 2. Statut des décisions

### Validé

- le site est une application de la marque, pas la marque elle-même ;
- la page d’accueil doit rester courte et maîtrisée ;
- aucun carrousel Hero ;
- aucune fausse rareté ;
- aucun compte à rebours ;
- aucune communauté fictive ;
- aucune dépendance à une version colorée du logo ;
- **`NO FIXED LINE.`** est la signature verbale principale de travail ;
- le motif inspiré du bois d’érable est un actif secondaire ;
- tout actif visuel manquant doit être représenté par un placeholder descriptif précis ;
- les fonctions e-commerce stables devront être protégées lors de l’intégration future.

### Provisoire

- le nom **Northern Utility Editorial** ;
- la palette exacte (hex encore provisoires dans `VISUAL_IDENTITY.md`) ;
- les typographies d’interface ;
- l’ordre final de certaines sections ;
- les textes de travail ;
- le nombre exact de produits mis en avant ;
- les ratios d’image précis lorsque plusieurs options restent possibles.

### Ouvert

- logo et wordmark définitifs ;
- collection de lancement ;
- produits permanents ;
- photos finales ;
- direction précise de la première campagne ;
- textes définitifs ;
- stratégie bilingue ou langue finale du site ;
- système final de collections ;
- contenus éditoriaux réels ;
- mécanisme technique permettant de sélectionner les produits vedettes ;
- validation juridique de **`NO FIXED LINE.`**.

---

## 3. Objectifs de la page d’accueil

### Objectifs prioritaires (ordre)

1. installer immédiatement l’univers de Flippin’ Maple ;
2. montrer qu’il s’agit d’une marque de vêtements, pas d’un catalogue POD ;
3. faire comprendre l’attitude **`NO FIXED LINE.`** ;
4. présenter une sélection courte de produits crédibles ;
5. permettre l’accès rapide à la boutique ;
6. augmenter la qualité perçue ;
7. créer un premier attachement à la marque ;
8. soutenir la conversion sans pression artificielle.

### Objectifs secondaires

- introduire le langage visuel ;
- préparer la transition vers de vraies photographies ;
- soutenir de futures capsules ;
- permettre une évolution sans refaire entièrement la page.

---

## 4. Principes de contenu

- peu de texte ;
- textes directs ;
- aucune promesse de qualité non vérifiée ;
- aucun héritage inventé ;
- aucune fabrication locale affirmée sans preuve ;
- aucune fausse exclusivité ;
- aucun langage de startup ;
- aucune phrase générique servant seulement à remplir ;
- aucun bloc de manifeste excessivement long ;
- priorité aux produits, à l’image et à l’atmosphère ;
- **`NO FIXED LINE.`** ne doit apparaître comme grand titre principal qu’une seule fois sur la page d’accueil ;
- son emplacement exact entre le Hero et la déclaration de marque reste **Provisoire** ;
- si la signature est utilisée dans le Hero, la déclaration utilise un titre complémentaire sans la répéter ;
- si le Hero reçoit plus tard un titre propre à une campagne ou une collection, la déclaration peut alors utiliser **`NO FIXED LINE.`**.

**Tous les textes proposés dans ce document sont des formulations de travail.** Ils ne sont pas définitifs.

---

## 5. Architecture générale de la page

Ordre proposé :

1. Header global
2. Hero de campagne
3. Sélection principale de produits
4. Déclaration de marque
5. Bloc éditorial matière / territoire
6. Essentiels ou catégories principales
7. Capsule ou mise en avant secondaire
8. Inscription courriel
9. Footer global

### Règles d’architecture

- certaines sections pourront être retirées si le contenu réel n’est pas assez fort ;
- aucune section ne doit être conservée uniquement pour remplir la page ;
- la page doit rester cohérente même si seulement six ou sept sections sont utilisées au lancement.

### Ce que la page ne doit pas être

- une page Shopify générique ;
- un catalogue Printful brut ;
- une boutique souvenir canadienne ;
- une marque de technologie ;
- une marque esport ;
- une marque de faux luxe ;
- une page remplie de promotions ;
- une accumulation de sections sans hiérarchie.

---

## 6. Header global

### Objectifs

- identifier la marque ;
- donner accès à la boutique ;
- préserver les accès fonctionnels au compte et au panier ;
- rester discret face au contenu éditorial.

### Structure proposée

- wordmark à gauche ou centré selon les futures maquettes ;
- navigation principale ;
- compte ;
- panier ;
- menu mobile ;
- aucune barre promotionnelle permanente par défaut.

### Navigation provisoire possible

- Boutique
- Nouveautés
- Essentiels
- À propos

Ces libellés ne sont **pas** définitifs.

### Placeholder wordmark

```
[PLACEHOLDER — WORDMARK FLIPPIN’ MAPLE]

Rôle :
Identifier la marque dans le header.

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
```

---

## 7. Hero de campagne

Le Hero est le **principal moment de marque**.

### Règles

- aucune rotation de diapositives ;
- une seule image ou vidéo courte ;
- un seul message ;
- un seul appel à l’action principal ;
- peu de texte ;
- aucun badge promotionnel ;
- aucune réduction permanente ;
- hauteur immersive mais sans repousser complètement le produit sous la ligne de flottaison ;
- contenu lisible sur mobile ;
- la signature **`NO FIXED LINE.`** ne doit pas être soudée graphiquement au logo.

### Contenu de travail

| Élément | Formulation provisoire |
|---|---|
| Sur-titre possible | `FLIPPIN’ MAPLE` |
| Titre principal | `NO FIXED LINE.` (emplacement de travail) |
| Texte d’appui | à définir ; maximum une ou deux courtes phrases |
| CTA principal | `Découvrir la collection` |
| CTA secondaire | optionnel ; uniquement s’il sert une action distincte |

**Emplacement de travail (Provisoire) :**

- si `NO FIXED LINE.` est conservé comme titre du Hero, la section de déclaration ne doit pas le répéter ;
- un futur titre de campagne peut le remplacer dans le Hero ;
- la décision finale reste **Provisoire**.

### Placeholder Hero

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
```

---

## 8. Sélection principale de produits

### Rôle

- présenter rapidement les pièces les plus fortes ;
- montrer une curation ;
- éviter l’impression de catalogue automatique.

### Nombre provisoire

- 3 à 4 produits sur bureau ;
- défilement contrôlé ou grille de 2 colonnes sur mobile ;
- aucun carrousel automatique.

### Contenu attendu par carte

- image produit ;
- nom ;
- prix ;
- information de couleur ou variante seulement si utile ;
- badge uniquement lorsqu’il transmet une information réelle.

### Règles

- aucune ombre ;
- aucune carte flottante ;
- aucun encadrement lourd ;
- ratio d’image constant ;
- aucun produit visible uniquement parce qu’il existe dans Printful ;
- les produits doivent être sélectionnés intentionnellement.

### Note technique importante

Le mécanisme technique de sélection des produits vedettes reste **Ouvert**.
La future implémentation **ne doit pas** modifier les payloads du checkout ni les invariants Stripe uniquement pour cette section.

### Placeholder photographies produits

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
```

---

## 9. Déclaration de marque

### Rôle

- expliquer brièvement l’attitude ;
- donner une profondeur à la signature ;
- créer un moment typographique fort.

### Structure proposée

- grand titre court ;
- utiliser `NO FIXED LINE.` seulement si la signature n’est pas déjà le titre du Hero ;
- sinon employer un titre complémentaire à définir, sans inventer une nouvelle signature ;
- court paragraphe ;
- aucun long manifeste ;
- aucun CTA obligatoire.

### Longueur maximale recommandée

- titre ;
- 40 à 80 mots ;
- éventuellement un lien vers `À propos`.

### Direction visuelle

- fond Ink Black, Charcoal ou Deep Forest ;
- texte Maple Bone ;
- usage très discret du motif de veinage d’érable ;
- composition asymétrique ;
- aucune animation gratuite.

### Placeholder motif sombre

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

Accessibilité :
S’il est appliqué en CSS, aucune alternative textuelle.
S’il s’agit exceptionnellement d’une image HTML décorative, utiliser alt="".
```

---

## 10. Bloc éditorial matière / territoire

### Rôle

- montrer ce qui nourrit la marque ;
- relier environnement urbain, matière et culture board sports ;
- éviter une page composée uniquement de cartes produits.

### Structure recommandée

- une grande image ;
- un titre court ;
- un paragraphe bref ;
- éventuellement un lien vers l’histoire de la marque ou une future section éditoriale.

Le contenu **ne doit pas** inventer une fabrication artisanale.

### Thèmes possibles

- mouvement ;
- territoire ;
- matière ;
- indépendance ;
- environnement urbain ;
- rapport entre bois, béton et textile.

### Placeholder éditorial

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
```

---

## 11. Essentiels ou catégories principales

### Rôle

- faciliter l’entrée dans le catalogue ;
- structurer la sélection ;
- éviter une longue grille de produits.

### Nombre recommandé

- 2 ou 3 catégories maximum.

### Exemples provisoires

- T-shirts
- Cotons ouatés
- Accessoires

Ne pas verrouiller ces catégories sans validation du catalogue.

### Présentation

- grandes vignettes ;
- titre court ;
- image dominante ;
- aucun texte superflu ;
- aucun badge.

### Placeholder catégorie

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
```

---

## 12. Capsule ou mise en avant secondaire

### Rôle

- mettre en avant une capsule, un lancement ou une histoire précise ;
- créer un second moment de campagne sans concurrencer le Hero.

### Condition

Cette section est **conditionnelle**.

Si aucune capsule crédible n’existe, elle doit être **retirée**.
Ne jamais créer une fausse capsule uniquement pour remplir la page.

### Structure possible

- bannière 2:1 ;
- titre ;
- phrase courte ;
- CTA ;
- fond ou image forte.

### Placeholder bannière

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
```

---

## 13. Inscription courriel

### Rôle

- permettre une relation directe ;
- annoncer les collections et contenus ;
- éviter les popups agressifs.

### Structure

- titre court ;
- une phrase ;
- champ courriel ;
- bouton ;
- lien vers la politique de confidentialité si requis.

### Ton

- direct ;
- honnête ;
- aucune promesse de privilèges fictifs ;
- aucune fausse urgence ;
- aucune réduction obligatoire.

### Exemples de texte provisoire

Titre :
À définir lors de la validation de la voix de marque.

Prévoir aussi une version française selon la stratégie linguistique future (**Ouvert**).

### Direction visuelle

- fond Maple Bone ou Weathered Maple très pâle ;
- bordure supérieure ;
- motif de bois optionnel à très faible contraste ;
- aucun popup automatique dans cette spécification.

---

## 14. Footer global

### Rôle

- navigation secondaire ;
- informations légales ;
- service client ;
- réseaux sociaux ;
- signature de marque.

### Direction visuelle

- fond Charcoal ou Ink Black ;
- texte Maple Bone.

### Contenu potentiel

- Boutique
- À propos
- Contact
- Livraison
- Retours
- Confidentialité
- Conditions
- réseaux sociaux **réels uniquement**
- inscription courriel si elle n’est pas utilisée plus haut

Ne pas ajouter de liens fictifs.

Le wordmark utilise le même placeholder que le header jusqu’à la disponibilité du logo final.

---

## 15. Hiérarchie des couleurs par section

**Statut : Provisoire** — à tester en maquette complète avant validation.

| Section | Proposition de travail |
|---|---|
| Header | Maple Bone / Ink Black |
| Hero | image ou Deep Forest / Maple Bone |
| Produits | Maple Bone / Ink Black |
| Déclaration | Charcoal ou Deep Forest / Maple Bone |
| Éditorial | Maple Bone ou Weathered Maple pâle |
| Catégories | Maple Bone / Ink Black |
| Capsule | variable, contrôlée |
| Courriel | Weathered Maple pâle ou Maple Bone |
| Footer | Ink Black ou Charcoal / Maple Bone |

Les noms de couleurs renvoient à la palette de travail de `VISUAL_IDENTITY.md` (hex encore provisoires).

---

## 16. Responsive

### Règles générales

- mobile-first ;
- aucun texte essentiel dans les images ;
- ordre narratif conservé ;
- Hero recadré intentionnellement ;
- CTA facilement atteignables ;
- grilles transformées sans écraser les cartes ;
- titres réduits sans perdre leur présence ;
- aucun défilement horizontal accidentel ;
- sections conditionnelles retirées proprement ;
- motif de bois plus discret sur petit écran ;
- aucune animation indispensable à la compréhension.

### Comportement mobile par section

| Section | Comportement mobile |
|---|---|
| Header | Menu compact ; wordmark et panier toujours accessibles ; navigation secondaire dans le menu |
| Hero | Recadrage 4:5 ou zone protégée ; texte et CTA lisibles sans zoom ; image non écrasée |
| Produits | Grille 2 colonnes ou défilement contrôlé ; cartes non compressées ; prix lisibles |
| Déclaration | Typographie réduite mais présente ; motif plus discret ; paragraphe court non tronqué artificiellement |
| Éditorial | Image dominante puis texte ; ratio vertical privilégié ; lien accessible |
| Catégories | Empilement ou 2 colonnes selon largeur ; titres courts ; images proportionnées |
| Capsule | Bannière recadrée 4:5 ou 3:4 ; section absente si pas de contenu |
| Courriel | Formulaire pleine largeur ; bouton tactile ; pas de popup |
| Footer | Colonnes empilées ; liens espacés ; contraste maintenu |

---

## 17. Accessibilité

- contraste suffisant ;
- navigation au clavier ;
- focus visible ;
- textes alternatifs factuels ;
- `alt=""` pour les images purement décoratives ;
- aucun texte indispensable dans une image ;
- boutons avec libellés explicites ;
- tailles tactiles suffisantes ;
- respect de `prefers-reduced-motion` ;
- champs de formulaire correctement étiquetés ;
- aucune information transmise uniquement par la couleur.

---

## 18. Performance

- images responsives ;
- AVIF ou WebP ;
- chargement différé hors Hero ;
- dimensions explicites pour limiter les décalages ;
- Hero optimisé ;
- aucune vidéo lourde par défaut ;
- aucune dépendance visuelle inutile ;
- motif SVG léger ;
- animations limitées ;
- priorité au temps de chargement et à la stabilité visuelle.

---

## 19. Contenu conditionnel et fallbacks

| Situation | Fallback crédible |
|---|---|
| Hero sans photo | Fond Deep Forest ou Charcoal, texte Maple Bone ; aucune image générique temporaire |
| Produits sans photos cohérentes | Ne pas afficher une grande sélection automatique ; utiliser une sélection réduite validée |
| Capsule inexistante | Section **supprimée** |
| Motif non produit | Aplat de couleur ; aucun faux bois temporaire |
| Logo non finalisé | Placeholder typographique neutre (mêmes règles que le header) |
| Contenu éditorial non disponible | Section retirée ou réduite à un titre + lien `À propos` si le texte est prêt |

---

## 20. Critères de validation de la future maquette

### La maquette devra être rejetée si

- elle ressemble à un template Shopify ;
- elle utilise trop de sections ;
- elle dépend de mockups incohérents ;
- elle semble touristique ;
- elle semble rustique ;
- elle semble esport ou technologique ;
- le produit n’apparaît pas assez tôt ;
- le Hero contient trop de texte ;
- `NO FIXED LINE.` est utilisé comme décoration répétitive ;
- la signature apparaît comme grand titre dans plusieurs sections de la même page ;
- le motif de bois domine ;
- le rouge Oxide est utilisé comme couleur promotionnelle permanente ;
- le site paraît sombre et agressif ;
- la page invente une communauté ;
- la page invente une qualité ou une provenance ;
- les CTA sont vagues ;
- la version mobile semble être une version bureau compressée.

### La maquette devrait être validée si

- la marque est identifiable avant même de lire tous les textes ;
- le produit est visible rapidement ;
- la page semble calme mais possède du caractère ;
- les matériaux et couleurs forment un univers cohérent ;
- la hiérarchie est évidente ;
- les sections semblent intentionnelles ;
- le site peut évoluer sans être entièrement reconstruit.

---

## 21. Dépendances avant intégration

Avant le code final de la page d’accueil, disposer ou décider de :

- maquette bureau ;
- maquette mobile ;
- logo ou placeholder final confirmé ;
- polices et licences vérifiées ;
- produits à mettre en avant ;
- images ou fallbacks ;
- textes approuvés ;
- catégories ;
- palette ajustée après test ;
- règles de sélection produit ;
- inventaire des composants existants ;
- vérification des impacts sur Header, Home et cartes produits.

### Zones hors portée de cette spécification

Les éléments suivants **ne doivent pas** être modifiés simplement pour appliquer le design de la page d’accueil :

- checkout ;
- Stripe ;
- Printful ;
- payloads ;
- routes ;
- cookies ;
- base de données.

---

## 22. Prochaines étapes

1. valider le document ;
2. créer une wireframe basse fidélité ;
3. valider l’ordre des sections ;
4. créer une maquette visuelle bureau ;
5. créer une maquette mobile ;
6. produire les actifs manquants ;
7. ajuster le Design Foundation v1 ;
8. inventorier les composants React concernés ;
9. préparer un plan d’intégration à faible risque ;
10. intégrer une zone à la fois.

---

**Fin du Draft — Homepage Specification v1.**
