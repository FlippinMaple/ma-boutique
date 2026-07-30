# Recherche et tri du catalogue public

## 1. Objectif

Construire une recherche de catalogue :

- intentionnelle;
- pertinente;
- prévisible;
- accessible;
- compatible avec les données réellement disponibles;
- cohérente avec l’interface calme et premium de Flippin’ Maple.

La recherche ne doit pas envoyer une requête à chaque frappe.

Elle doit être exécutée uniquement :

- lors de la soumission du formulaire;
- avec la touche Entrée;
- avec le bouton de recherche représenté par une loupe.

Le tri peut déclencher immédiatement une nouvelle requête lorsqu’une option est sélectionnée.

## 2. Route API

Conserver la route existante :

GET /api/products

Paramètres facultatifs :

- q : texte recherché;
- sort : ordre demandé.

Exemple :

GET /api/products?q=youth&sort=relevance

Aucune nouvelle route ne doit être créée.

Les routes suivantes ne doivent pas être modifiées :

- GET /api/products/featured;
- GET /api/products/details/:id;
- GET /api/products/:id.

## 3. Paramètre q

Règles :

- convertir en chaîne;
- appliquer trim();
- conserver la limite serveur actuelle de 100 caractères;
- une valeur vide signifie qu’aucun filtre de recherche n’est appliqué;
- ne jamais construire directement du SQL avec le contenu utilisateur;
- utiliser uniquement des paramètres SQL préparés.

## 4. Champs consultés

La première version officielle doit rechercher dans les champs réellement confirmés par le code :

Produits :

- products.name;
- products.description;
- products.brand;
- products.category.

Variantes actives :

- product_variants.color;
- product_variants.size.

Ne pas utiliser products.tags dans cette première version, puisque son existence et son alimentation dans la base de production ne sont pas confirmées par le code actuel.

Les correspondances provenant des variantes doivent uniquement considérer :

product_variants.is_active = 1

## 5. Recherche par expression et par mots

La recherche doit combiner deux approches :

1. correspondance avec l’expression complète;
2. correspondance avec chacun des mots significatifs.

Exemple :

youth gold shirt

Le moteur doit pouvoir retrouver un produit lorsque :

- l’expression complète apparaît dans son nom;
- plusieurs mots apparaissent séparément dans son nom;
- certains mots apparaissent dans sa catégorie, sa marque ou sa description;
- une couleur ou une taille correspond dans une variante active.

Une correspondance sur un seul mot peut rendre le produit admissible, mais les produits correspondant à davantage de mots doivent recevoir un score supérieur.

Limiter le nombre de mots traités afin d’éviter une croissance non contrôlée du SQL et du nombre de paramètres.

La limite exacte devra être choisie et documentée lors de l’implémentation.

## 6. Pertinence

Le classement par pertinence doit suivre cet ordre général de poids :

1. nom exactement égal à la recherche;
2. nom commençant par l’expression complète;
3. expression complète contenue dans le nom;
4. correspondances multiples dans le nom;
5. catégorie;
6. marque;
7. couleur d’une variante active;
8. taille d’une variante active;
9. description.

Principes :

- le nom du produit doit avoir le poids dominant;
- une correspondance complète doit valoir plus qu’une correspondance partielle;
- plusieurs mots correspondants doivent augmenter le score;
- une correspondance dans la description ne doit pas dépasser une correspondance dans le nom;
- les variantes ne doivent pas créer de produits dupliqués;
- un produit doit être retourné une seule fois;
- les égalités de pertinence doivent être départagées par updated_at DESC, puis id DESC.

Les poids numériques exacts devront être regroupés clairement dans le contrôleur ou dans une fonction dédiée afin qu’ils soient compréhensibles et modifiables.

## 7. Limite de la première version

La première version sera une recherche lexicale pondérée.

Elle couvrira :

- expressions complètes;
- mots séparés;
- correspondances partielles avec LIKE;
- nom;
- description;
- marque;
- catégorie;
- couleur;
- taille.

Elle ne prétendra pas encore gérer automatiquement :

- les fautes d’orthographe;
- les synonymes;
- les traductions;
- les concepts sémantiquement proches;
- les pluriels complexes;
- les équivalences comme hoodie, coton ouaté et chandail à capuchon.

Ces capacités devront faire l’objet d’une couche ultérieure explicite, par exemple :

- dictionnaire de synonymes contrôlé;
- champ de termes de recherche administrables;
- index FULLTEXT;
- moteur de recherche spécialisé.

## 8. Options de tri

Valeurs API autorisées :

- relevance;
- price_asc;
- price_desc;
- newest;
- name_asc.

Toute valeur inconnue doit retourner HTTP 400 avec une erreur générique et stable.

Définition :

relevance :

- score de pertinence décroissant;
- disponible lorsqu’une recherche q non vide est appliquée;
- égalités départagées par updated_at DESC, puis id DESC.

price_asc :

- prix minimal actif croissant;
- produits sans prix valide placés à la fin;
- égalités départagées par name ASC, puis id DESC.

price_desc :

- prix minimal actif décroissant;
- produits sans prix valide placés à la fin;
- égalités départagées par name ASC, puis id DESC.

newest :

- updated_at DESC;
- puis id DESC.

name_asc :

- name ASC;
- puis id DESC.

## 9. Tri par défaut

Lorsqu’une recherche q non vide est soumise :

- le tri par défaut est relevance.

Lorsqu’aucune recherche n’est appliquée :

- le tri par défaut est newest;
- une demande sort=relevance doit se comporter comme newest, puisque la pertinence n’a pas de sens sans recherche.

## 10. Prix de référence

Le prix de classement et le prix principal du catalogue doivent être :

MIN(product_variants.price)

parmi les variantes satisfaisant :

- product_variants.product_id = products.id;
- product_variants.is_active = 1;
- price non nul;
- prix convertible en valeur numérique valide.

Le champ retourné par l’API doit être nommé :

min_price

État actuel confirmé :

- price est alimenté avec variant.retail_price par l’import Printful;
- custom_price et discount_price sont remis à null par cet import;
- aucune autre utilisation de custom_price ou discount_price n’a été trouvée dans le code applicatif;
- la première version utilise donc uniquement price.

## 11. Variantes publiques

Les listes et détails publics ne devraient retourner que les variantes actives :

product_variants.is_active = 1

Ce changement devra être effectué séparément et validé afin d’éviter de mélanger cette correction avec la première implémentation du score de recherche.

## 12. Réponse API

Chaque produit retourné doit conserver les données actuellement nécessaires au frontend et ajouter :

- min_price;
- éventuellement relevance_score uniquement si cette donnée est réellement utile au diagnostic.

Le score ne doit pas nécessairement être exposé publiquement dans la réponse finale.

La réponse doit rester un tableau de produits sans doublons, chacun contenant son tableau de variantes actives.

## 13. Interface frontend

La boutique doit utiliser deux états distincts :

- searchInput : contenu actuellement saisi;
- submittedSearch : recherche réellement exécutée.

Le formulaire doit contenir :

- un label accessible;
- le champ type="search";
- maxLength={100};
- un bouton type="submit";
- une icône de loupe;
- un aria-label explicite pour le bouton.

La saisie seule ne doit pas déclencher l’API.

La recherche doit partir uniquement avec :

- Entrée;
- clic sur la loupe.

Le debounce temporaire de 300 ms actuellement présent devra être retiré lors de cette modification.

## 14. Contrôle de tri frontend

Ajouter un select accessible associé à un label.

Options visibles en français :

- Pertinence;
- Prix : du plus bas au plus élevé;
- Prix : du plus élevé au plus bas;
- Plus récents;
- Nom : A à Z.

Comportement :

- lorsqu’une nouvelle recherche non vide est soumise, sélectionner relevance;
- lorsqu’une recherche vide est soumise, sélectionner newest;
- un changement de tri relance immédiatement la requête;
- le paramètre sort est toujours envoyé explicitement;
- le paramètre q est envoyé uniquement lorsque submittedSearch n’est pas vide.

## 15. États de l’interface

Prévoir distinctement :

- chargement initial;
- chargement après recherche ou tri;
- résultats;
- aucun résultat;
- erreur réseau ou serveur.

Le message Aucun produit ne correspond à ta recherche ne doit pas apparaître pendant que la requête est encore en cours.

## 16. Accessibilité

Exigences :

- formulaire sémantique;
- labels visibles ou accessibles;
- bouton utilisable au clavier;
- touche Entrée prise en charge nativement;
- focus visible;
- select accessible;
- état de chargement annoncé de manière raisonnable;
- aucune dépendance exclusive à une icône sans texte accessible;
- respecter prefers-reduced-motion.

## 17. Séquence d’implémentation

Implémenter et valider une étape à la fois :

1. filtrer les variantes publiques inactives;
2. retourner min_price;
3. ajouter et valider le paramètre sort;
4. ajouter les tris simples;
5. construire le score de pertinence;
6. remplacer le debounce par le formulaire explicite;
7. ajouter la loupe;
8. ajouter le select de tri;
9. ajouter les états chargement, aucun résultat et erreur;
10. valider les limites et classements en production;
11. documenter chaque correction ou fonctionnalité validée.

## 18. Invariants

- aucun prix fourni par le client ne sert à calculer un prix officiel;
- aucune valeur sort non autorisée n’est injectée dans ORDER BY;
- aucune donnée utilisateur n’est concaténée directement dans le SQL;
- aucun produit masqué n’est retourné;
- aucune variante inactive n’est retournée publiquement;
- aucun produit n’est dupliqué par les jointures de variantes;
- la route featured conserve son comportement;
- les routes de détail conservent leur compatibilité;
- le checkout, Stripe, Printful, l’authentification et l’administration ne sont pas modifiés dans ce chantier.
