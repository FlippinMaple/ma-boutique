# Confidentialité, témoins et chatbot — plan directeur

- Projet : Flippin’ Maple
- Statut : document interne de travail
- Portée : conformité, architecture, inventaire et implantation
- Validation juridique : requise avant mise en production
- Dernière mise à jour : 2026-07-23

> **Avertissement.** Ce document est un plan de travail interne. Il ne constitue pas un avis juridique et ne prétend pas que Flippin’ Maple est déjà conforme. Toute affirmation publique de conformité exige une validation juridique québécoise préalable.

---

## 1. Rôle du document

Ce document devient la **source de vérité interne** pour les travaux liés à la confidentialité chez Flippin’ Maple.

Il encadre :

- les renseignements personnels;
- les témoins et autres stockages technologiques;
- les consentements;
- l’infolettre et les communications commerciales;
- le futur chatbot de soutien et d’aide à l’achat.

Il distingue clairement :

- les **obligations juridiques** à vérifier et à valider;
- les **décisions techniques** déjà prises ou envisagées;
- les **décisions encore ouvertes** qui ne doivent pas être improvisées dans le code.

Il vise à éviter :

- l’ajout de cases de consentement trompeuses ou mal nommées;
- l’injection de scripts non essentiels sans cadre;
- la publication de pages juridiques improvisées ou incomplètes.

Ce document doit être mis à jour dès qu’un nouveau fournisseur, outil, script, finalité ou parcours de collecte est ajouté.

Les politiques publiques finales (politique de confidentialité, politique de témoins, conditions d’utilisation, avis de collecte) **ne doivent pas être rédigées définitivement** avant :

1. l’inventaire complet des données;
2. l’inventaire des témoins et stockages;
3. l’identification des fournisseurs;
4. la définition des durées de conservation;
5. l’identification du responsable de la protection des renseignements personnels;
6. la réalisation des évaluations requises;
7. une validation juridique québécoise.

---

## 2. Principes non négociables

1. **Confidentialité dès la conception.** Les choix d’architecture, de fournisseurs et d’interfaces tiennent compte de la protection des renseignements dès le départ.
2. **Collecte minimale.** On ne collecte que ce qui est nécessaire à une finalité déterminée.
3. **Finalité déterminée et expliquée.** Chaque collecte doit pouvoir être expliquée clairement à la personne concernée.
4. **Aucun consentement trompeur ou regroupé artificiellement.** Un abonnement marketing n’est pas une acceptation générale de la Loi 25.
5. **Aucun abonnement marketing obligatoire** pour créer un compte ou acheter.
6. **Aucun script non essentiel chargé avant la décision applicable.**
7. Les fonctionnalités **nécessaires** au panier, à l’authentification, à la sécurité et au paiement doivent continuer de fonctionner.
8. **Possibilité de retirer ou de modifier** un consentement.
9. **Conservation limitée** et destruction documentée.
10. **Accès aux renseignements limité** aux personnes et fournisseurs nécessaires.
11. **Aucun renseignement sensible demandé dans le chatbot.**
12. **Aucune affirmation publique de conformité complète** sans validation.

---

## 3. Cadre réglementaire à considérer

Cette section dresse les principales références à vérifier durant la conception et la validation. Elle sert de point de départ; le texte législatif officiel prévaut, et une ressource juridique qualifiée doit valider l’interprétation applicable.

### Québec — secteur privé

Mentions à examiner notamment au regard de la *Loi sur la protection des renseignements personnels dans le secteur privé*, chapitre **P-39.1** :

- **article 3.1** : responsabilité et responsable de la protection des renseignements personnels;
- **article 3.2** : politiques et pratiques de gouvernance;
- **article 3.3** : évaluation des facteurs relatifs à la vie privée pour les projets technologiques;
- **articles 3.5 à 3.8** : incidents de confidentialité et registre;
- **article 8** : information à fournir au moment de la collecte;
- **article 8.1** : technologies d’identification, de localisation ou de profilage;
- **article 8.2** : politique de confidentialité publiée;
- **article 8.3** : utilisation pour les fins annoncées lors de la collecte;
- **article 9** : collecte nécessaire;
- **article 10** : mesures de sécurité;
- **articles 12 à 14** : utilisation, communication et qualité du consentement;
- **article 17** : communication ou traitement de renseignements à l’extérieur du Québec.

La Commission d’accès à l’information vulgarise les obligations, mais **le texte législatif officiel prévaut**.

### Canada — communications commerciales

Mentions à examiner au regard de la *Loi canadienne anti-pourriel*, notamment :

- consentement applicable avant les messages électroniques commerciaux;
- identification de l’expéditeur;
- mécanisme de désabonnement fonctionnel;
- conservation de preuves de consentement;
- traitement des demandes de désabonnement dans les délais applicables.

### Validation

Cette liste n’est pas exhaustive. Elle doit être revue et confirmée par une ressource juridique québécoise avant toute mise en production des politiques publiques, du gestionnaire de consentement ou du chatbot.

---

## 4. État actuel connu du projet

Liste factuelle préliminaire, basée sur l’état connu du projet :

- frontend React/Vite;
- backend Express/Node;
- base de données MySQL;
- hébergement Hostinger;
- paiement Stripe;
- production et livraison Printful;
- comptes clients;
- panier;
- authentification par cookies d’accès et de rafraîchissement;
- stockage local utilisé par certaines fonctions du panier et du checkout;
- indicateur local `inCheckout`;
- suivi de panier abandonné;
- collecte possible du courriel et du contenu du panier par `sendBeacon` ou `fetch`;
- calcul de tarifs de livraison transmis au backend;
- données de commande envoyées à Stripe et Printful selon le parcours;
- champ `customers.is_subscribed`;
- futur chatbot de soutien et d’aide à l’achat.

> Cet inventaire est préliminaire. Chaque élément doit être confirmé directement dans le code, la base de données, les tableaux de bord des fournisseurs et la configuration de production.

---

## 5. Incohérence actuelle de l’inscription

> **Note technique (16 août 2026).** Le chantier d’audit **P8** a corrigé, côté technique, le mélange `consentLoi25` / abonnement marketing, persisté une preuve d’opt-in marketing lorsque vrai, retiré l’acceptation CGU fantôme (`/cgu`) et durci le flux register. Détail : `docs/compliance/TECHNICAL_SECURITY_REMEDIATION_LOG.md`. Ce plan n’est pas réécrit. Les pages légales publiques, leur validation, les témoins et le chatbot restent des chantiers distincts. P8 n’est pas une certification de conformité.

### Problème (constat historique du plan)

- le frontend utilisait le nom `consentLoi25`;
- le backend transformait cette valeur en `is_subscribed`;
- `is_subscribed` représente un **abonnement aux communications**;
- ce champ ne constitue **pas**, à lui seul, une preuve générale de conformité à la Loi 25;
- un abonnement marketing **ne doit pas** être présenté comme une acceptation obligatoire de la Loi 25;
- les routes `/cgu` et `/politique-confidentialite` **n’existent pas** actuellement;
- aucun lien public ne doit pointer vers une page juridique inexistante.

### Décision temporaire

Historiquement : `Register.jsx` ne devait pas recevoir de nouvelle modification fonctionnelle avant définition du modèle de consentement. Le modèle marketing d’inscription a depuis été tranché et implanté sous P8 (case facultative, non précochée, preuve serveur si opt-in). Les conditions d’utilisation et la politique de confidentialité publiques **n’existent toujours pas** ; aucun lien vers une page juridique vide ne doit être réintroduit. La future inscription devra encore, lorsque des textes validés existeront, séparer :
  1. l’information nécessaire à la création du compte;
  2. les conditions d’utilisation réelles, si elles sont requises;
  3. la politique de confidentialité réelle;
  4. l’abonnement promotionnel facultatif;
  5. les preuves techniques associées aux consentements lorsque nécessaires.

---

## 6. Inventaire des renseignements personnels

| Parcours | Renseignements | Finalité | Nécessaire ou facultatif | Système ou fournisseur | Lieu de conservation | Accès | Communication hors Québec | Durée | Destruction | Statut d’audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Création de compte | Nom, courriel, mot de passe haché, `is_subscribed` | Créer et gérer le compte client | À confirmer | Backend, MySQL | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Connexion | Courriel, mot de passe, cookies de session | Authentifier l’utilisateur | À confirmer | Backend, cookies `access` / `refresh` | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Panier | Identifiants de variantes, quantités, prix, images | Maintenir le panier | À confirmer | localStorage, évent. DB | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Checkout | Courriel, adresse, mode de livraison, contenu du panier | Préparer la commande et la livraison | À confirmer | Frontend, backend | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Paiement Stripe | Données de paiement / session Stripe | Traiter le paiement | À confirmer | Stripe | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Livraison Printful | Adresse, articles, variantes | Produire et expédier | À confirmer | Printful | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Panier abandonné | Courriel, contenu du panier, motif | Relancer ou analyser l’abandon | À confirmer | Backend, `sendBeacon` / `fetch` | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Infolettre | Courriel, statut d’abonnement | Communications commerciales | Facultatif (visé) | `customers.is_subscribed`, évent. fournisseur | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Demandes de soutien | Coordonnées, contenu du message | Assister le client | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Futur chatbot | Messages, contexte de session, évent. identifiants | Soutien et aide à l’achat | À confirmer | Fournisseur à choisir | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Journaux serveur | IP, horodatage, erreurs, chemins | Exploitation, diagnostic, sécurité | À confirmer | Serveur / hébergeur | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Mesures de sécurité | Jetons, indicateurs anti-fraude, journaux | Protéger le service et les comptes | À confirmer | Backend, fournisseurs | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Analytique éventuelle | Identifiants techniques, parcours, mesures | Mesurer l’audience / performance | Facultatif (visé) | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Marketing éventuel | Identifiants publicitaires, audiences | Publicité / reciblage | Facultatif (visé) | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |

Aucune durée de conservation n’est inventée ici. Chaque ligne doit être confirmée avant d’alimenter les politiques publiques.

---

## 7. Inventaire des témoins et stockages technologiques

| Nom ou clé | Type | Propriétaire | Finalité | Données contenues | Durée | Nécessaire | Catégorie de consentement | Chargement conditionnel | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cookie `access` | Cookie | Flippin’ Maple | Authentification | À confirmer | À confirmer | À confirmer | Nécessaires (hypothèse à valider) | Non (si nécessaire) | À confirmer |
| Cookie `refresh` | Cookie | Flippin’ Maple | Rafraîchir la session | À confirmer | À confirmer | À confirmer | Nécessaires (hypothèse à valider) | Non (si nécessaire) | À confirmer |
| Panier local | localStorage | Flippin’ Maple | Persistance du panier | Articles, quantités, métadonnées | À confirmer | À confirmer | Nécessaires (hypothèse à valider) | Non (si nécessaire) | À confirmer |
| `inCheckout` | localStorage | Flippin’ Maple | Indicateur de redirection Stripe / abandon | Drapeau booléen | À confirmer | À confirmer | Nécessaires (hypothèse à valider) | Non (si nécessaire) | À confirmer |
| Préférences linguistiques éventuelles | À confirmer | Flippin’ Maple | Langue d’affichage | À confirmer | À confirmer | À confirmer | Préférences | À confirmer | À confirmer |
| Préférences de confidentialité futures | Cookie / localStorage / DB | Flippin’ Maple | Mémoriser les choix de consentement | Version, catégories, horodatage | À confirmer | Oui (pour appliquer les choix) | Nécessaires (pour le mécanisme) | Non | À planifier |
| Cookies Stripe | Cookie / SDK | Stripe | Paiement et sécurité | À confirmer | À confirmer | À confirmer | Nécessaires / à confirmer | Selon parcours | À confirmer |
| Cookies Hostinger | Cookie | Hostinger | Hébergement / infra | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer | À confirmer |
| Outils analytiques éventuels | Cookie / pixel / SDK | À confirmer | Mesure d’audience | À confirmer | À confirmer | Non | Analytique | Oui | Non déployé / à confirmer |
| Outils marketing éventuels | Cookie / pixel / SDK | À confirmer | Publicité / reciblage | À confirmer | À confirmer | Non | Marketing | Oui | Non déployé / à confirmer |
| Futur fournisseur de chatbot | Cookie / SDK / API | À confirmer | Soutien conversationnel | À confirmer | À confirmer | À confirmer | Soutien et chatbot | À confirmer | Non déployé |
| Stockage de session du chatbot | sessionStorage / serveur | À confirmer | Continuité de conversation | À confirmer | À confirmer | À confirmer | Soutien et chatbot | À confirmer | À planifier |
| Outils de sécurité ou anti-fraude | Cookie / SDK / serveur | À confirmer | Prévention de fraude | À confirmer | À confirmer | À confirmer | Nécessaires / à confirmer | À confirmer | À confirmer |

### Règles d’inventaire

- ne pas classer automatiquement un témoin comme nécessaire sans justification écrite;
- distinguer cookie, localStorage, sessionStorage, pixel, SDK et requête serveur;
- documenter aussi les technologies **sans cookie** pouvant identifier ou profiler.

---

## 8. Catégories de consentement prévues

### Nécessaires

Exemples :

- sécurité;
- maintien de session;
- authentification;
- panier;
- checkout;
- prévention de fraude;
- fonctions indispensables demandées par l’utilisateur.

Toujours actives, mais documentées clairement.

### Préférences

Exemples éventuels :

- langue;
- choix d’interface;
- préférences non indispensables.

Activation selon la décision juridique et fonctionnelle.

### Analytique

Exemples éventuels :

- mesure d’audience;
- comportement de navigation;
- performance marketing;
- statistiques de parcours.

Désactivée par défaut jusqu’à décision applicable.

### Marketing

Exemples éventuels :

- pixels publicitaires;
- reciblage;
- audiences;
- suivi publicitaire;
- personnalisation promotionnelle.

Désactivée par défaut sans consentement valide.

### Soutien et chatbot

Catégorie à évaluer selon le fournisseur et les données utilisées.

Un chatbot **strictement interne** et sans suivi non essentiel pourrait avoir un traitement différent d’un widget tiers qui :

- dépose des témoins;
- stocke les conversations;
- réalise de l’analytique;
- entraîne un modèle;
- transmet des données hors Québec;
- crée un profil utilisateur.

La classification finale dépendra du fournisseur et de l’architecture choisis.

---

## 9. Gestionnaire de préférences de confidentialité

### Premier affichage

La bannière doit proposer clairement :

- **Tout accepter**;
- **Refuser les non essentiels**;
- **Personnaliser**.

### Personnalisation

Le panneau doit permettre de comprendre et d’activer séparément les catégories applicables.

### Règles techniques

- nécessaires actives;
- non essentielles inactives avant décision;
- aucune case facultative précochée;
- consentement enregistré avec une version;
- date et heure de la décision;
- catégories choisies;
- possibilité de rouvrir les préférences;
- retrait aussi simple que l’acceptation;
- nouvelle demande si la finalité ou la version change de manière importante;
- prise en charge du français et de l’anglais;
- aucune interface trompeuse;
- aucune perte du panier lors d’un refus des témoins non essentiels.

### Emplacement permanent

Prévoir un lien public :

`Préférences de confidentialité`

Ce lien devra être disponible dans le futur pied de page réel.

---

## 10. Architecture technique envisagée

Architecture cible **documentée, non encore implantée**.

Éléments possibles :

- `ConsentProvider` ou `PrivacyProvider`;
- registre central des catégories;
- schéma de consentement versionné;
- stockage minimal de la décision;
- API interne pour lire et modifier les préférences;
- registre des scripts conditionnels;
- chargement dynamique des services tiers;
- fonction unique pour vérifier une permission;
- composant de bannière;
- panneau de préférences;
- lien permanent;
- événements de mise à jour;
- mécanisme de retrait;
- tests automatisés;
- journalisation proportionnée si une preuve de consentement doit être conservée.

Exemple conceptuel de structure :

```json
{
  "version": 1,
  "decidedAt": "ISO-8601",
  "necessary": true,
  "preferences": false,
  "analytics": false,
  "marketing": false,
  "support": false
}
```

Aucune implantation de cette architecture n’est autorisée tant que :

- les inventaires des sections 6 et 7 n’ont pas été confirmés;
- le modèle de consentement de l’inscription n’a pas été tranché;
- la validation juridique minimale n’a pas été obtenue pour les catégories et les textes publics.

---

## 11. Pages publiques à créer

Les destinations publiques suivantes devront être créées à partir de renseignements réels et vérifiés :

1. Politique de confidentialité.
2. Politique relative aux témoins et technologies similaires.
3. Conditions d’utilisation.
4. Interface ou panneau de préférences de confidentialité.
5. Coordonnées du responsable de la protection des renseignements personnels.
6. Procédure de demande d’accès, de rectification ou de retrait.
7. Information sur la conservation, la destruction et, lorsqu’elle est applicable, l’anonymisation.
8. Information sur les fournisseurs et les communications hors Québec lorsque nécessaire.
9. Procédure de plainte en matière de confidentialité.

### Règles de publication

- aucune page ne doit être publiée vide ou avec du faux contenu;
- aucun lien ne doit être ajouté à la navigation ou au pied de page avant que sa destination fonctionne;
- aucune durée de conservation ne doit être inventée;
- aucune coordonnée ne doit être inventée;
- aucun fournisseur ne doit être déclaré conforme sans vérification;
- les textes publics doivent être fondés sur l’inventaire réel des données, des traitements et des fournisseurs;
- les textes doivent être disponibles dans les langues réellement prises en charge par le site;
- les versions française et anglaise devront exprimer les mêmes obligations et les mêmes droits;
- les textes définitifs doivent être validés par une ressource juridique qualifiée au Québec avant leur mise en production.

### Pied de page futur

Le futur pied de page pourra comprendre uniquement des destinations réelles telles que :

- Confidentialité;
- Témoins;
- Conditions d’utilisation;
- Préférences de confidentialité;
- Nous joindre;
- Demande relative aux renseignements personnels.

Aucune colonne vide, aucun faux lien et aucune destination temporaire ne doivent être publiés.

---

## 12. Collecte au moment des formulaires

Chaque formulaire ou interface de collecte devra fournir une information contextuelle adaptée à la finalité réelle.

L’existence d’une politique de confidentialité générale ne remplace pas nécessairement l’information requise au moment précis de la collecte.

### Création de compte

L’inscription devra notamment expliquer, selon les résultats de l’audit et de la validation juridique :

- que les renseignements servent à créer et à gérer le compte;
- quels renseignements sont obligatoires;
- quels renseignements sont facultatifs;
- les conséquences de ne pas fournir un renseignement requis;
- les moyens permettant l’accès et la rectification;
- où consulter la politique de confidentialité;
- quels fournisseurs sont nécessaires au fonctionnement du compte;
- si des renseignements peuvent être traités ou communiqués hors Québec;
- comment fermer un compte ou présenter une demande;
- que l’abonnement aux communications promotionnelles est distinct et facultatif.

L’inscription ne doit pas présenter un abonnement marketing comme une condition de conformité à la Loi 25.

### Checkout

Le checkout devra notamment expliquer, lorsque requis :

- que les renseignements servent au traitement de la commande;
- que certaines données sont nécessaires au paiement;
- que certaines données sont nécessaires à la production et à la livraison;
- que Stripe intervient dans le paiement;
- que Printful peut intervenir dans la production et la livraison;
- que les renseignements peuvent être utilisés pour la prévention de fraude et la sécurité;
- les règles applicables au soutien après-vente;
- les informations pertinentes sur la conservation;
- les communications hors Québec, si elles s’appliquent;
- où consulter la politique de confidentialité.

L’information doit demeurer lisible sans rendre le checkout inutilement lourd.

### Panier abandonné

Le suivi actuel des paniers abandonnés constitue un point critique à auditer.

Les éléments suivants doivent être établis avant toute utilisation commerciale :

- finalité exacte;
- moment du déclenchement;
- renseignements transmis;
- courriel utilisé;
- contenu du panier transmis;
- présence d’identifiants;
- méthode `sendBeacon` ou `fetch`;
- destinataire;
- base juridique applicable;
- durée de conservation;
- accès interne;
- possibilité de relance;
- distinction entre journal technique et communication commerciale;
- retrait ou opposition applicable;
- traitement lorsque l’utilisateur ferme simplement la page;
- comportement lorsque le paiement Stripe est en cours;
- gestion des doublons.

Aucune relance commerciale de panier abandonné ne doit être activée avant que ces éléments soient clarifiés et validés.

### Infolettre et communications promotionnelles

Prévoir :

- une case distincte;
- une case facultative;
- aucune case précochée;
- un texte autonome et compréhensible;
- aucun couplage obligatoire avec la création du compte ou l’achat;
- une identification claire de Flippin’ Maple;
- la finalité des messages;
- une preuve appropriée du consentement;
- la date, la source et la version du texte applicable;
- un mécanisme de désabonnement fonctionnel;
- une synchronisation fiable avec `customers.is_subscribed`;
- le traitement des désabonnements chez tout fournisseur de courriel utilisé.

### Formulaires de soutien

Prévoir :

- la finalité de la demande;
- les champs nécessaires;
- une indication de ne pas transmettre de données sensibles;
- les personnes pouvant accéder à la demande;
- la durée de conservation;
- la possibilité de transférer la demande à un fournisseur ou partenaire lorsque nécessaire;
- un moyen de communiquer avec une personne.

---

## 13. Chatbot Flippin’ Maple

Le futur chatbot constitue un projet fonctionnel, technique et de confidentialité distinct.

Il ne doit pas être ajouté comme un simple widget visuel sans audit préalable.

### Référence d’expérience

Le chatbot observé ou évoqué sur Bold & Easy Club sert uniquement de référence d’expérience utilisateur.

Il ne doit pas être considéré comme :

- une référence juridique;
- une preuve de conformité;
- un modèle technique à copier;
- une autorisation de reproduire ses textes;
- une autorisation de reprendre son apparence;
- une confirmation du fournisseur utilisé;
- une confirmation de ses pratiques de conservation ou de traitement.

Le fournisseur et le fonctionnement de cette référence devront être vérifiés séparément si cette analyse devient nécessaire.

### Fonctions envisagées

Le chatbot Flippin’ Maple pourrait offrir :

- réponses aux questions fréquentes;
- aide à la navigation;
- aide à la découverte de produits;
- aide aux tailles;
- disponibilité des produits;
- information sur la livraison;
- information sur les retours;
- orientation relative à une commande;
- information générale sur les délais;
- transfert vers une personne;
- collecte limitée d’un courriel lorsqu’un suivi est demandé;
- création d’une demande de soutien;
- accès rapide aux politiques réelles du site.

Chaque fonction devra être fondée sur des données fiables et des règles réelles.

### Identification et transparence

Le chatbot devra :

- indiquer clairement qu’il s’agit d’un assistant automatisé ou propulsé par l’intelligence artificielle;
- ne jamais prétendre être une personne;
- distinguer une réponse automatique d’une réponse humaine;
- expliquer ses principales limites;
- indiquer que certaines réponses peuvent nécessiter une validation;
- permettre une escalade vers une personne;
- fournir un moyen de signaler une réponse inadéquate;
- indiquer les principaux usages des renseignements transmis;
- fournir un accès à la politique de confidentialité.

### Limites obligatoires

Le chatbot ne doit pas :

- demander un mot de passe;
- demander un numéro complet de carte de paiement;
- demander un code de sécurité de carte;
- demander des renseignements médicaux;
- demander des renseignements hautement sensibles sans nécessité et validation;
- afficher les données d’un autre client;
- révéler des informations internes;
- confirmer une commande sans vérification sécurisée;
- modifier une commande sans authentification appropriée;
- inventer une politique de retour;
- inventer un prix;
- inventer un délai;
- inventer un état de livraison;
- inventer une disponibilité;
- présenter une estimation comme une certitude;
- utiliser les conversations pour entraîner un modèle sans décision explicite, documentation et validation;
- charger un fournisseur tiers avant le consentement applicable lorsqu’il est non essentiel.

### Avertissement utilisateur

Le module devra afficher une consigne claire demandant de ne pas transmettre :

- mot de passe;
- information complète de paiement;
- numéro d’assurance sociale;
- document d’identité;
- donnée médicale;
- renseignement sensible non nécessaire.

### Données à inventorier

Selon l’architecture choisie, le chatbot pourrait traiter :

- identifiant de session;
- adresse IP;
- date et heure;
- contenu des messages;
- page consultée;
- produit consulté;
- panier;
- langue;
- appareil;
- navigateur;
- courriel;
- nom;
- numéro de commande;
- statut d’authentification;
- fichier joint;
- métadonnées;
- journaux techniques;
- évaluation de satisfaction;
- transfert vers un humain.

Chaque élément devra être classé comme :

- requis;
- facultatif;
- interdit;
- à confirmer.

### Décisions obligatoires avant intégration

Avant toute intégration, documenter :

- fournisseur;
- modèle utilisé;
- lieu d’hébergement;
- pays de traitement;
- sous-traitants;
- utilisation des conversations pour l’entraînement;
- durée de conservation;
- suppression;
- export;
- chiffrement;
- accès administrateur;
- journalisation;
- isolation des données clients;
- mécanisme d’authentification;
- contrat;
- obligations en cas d’incident;
- communication hors Québec;
- EFVP;
- catégorie de consentement;
- chargement avant ou après décision de confidentialité;
- support humain;
- coûts;
- dépendance technique;
- procédure de désactivation.

---

## 14. Évaluation des facteurs relatifs à la vie privée

Une évaluation des facteurs relatifs à la vie privée, ou EFVP, devra être amorcée avant l’implantation d’un projet technologique important impliquant des renseignements personnels.

Elle devra être révisée lorsque :

- la finalité change;
- un nouveau fournisseur est ajouté;
- de nouvelles données sont collectées;
- un traitement hors Québec est ajouté ou modifié;
- un nouveau modèle d’intelligence artificielle est utilisé;
- les durées de conservation changent;
- une nouvelle fonction de profilage est ajoutée;
- le niveau de risque change de manière importante.

### Checklist EFVP

Documenter au minimum :

- nom du projet;
- propriétaire interne;
- description;
- objectifs;
- personnes concernées;
- renseignements concernés;
- nécessité de chaque renseignement;
- finalité de chaque renseignement;
- sensibilité;
- volume;
- fréquence;
- sources;
- flux de données;
- systèmes;
- fournisseurs;
- sous-traitants;
- pays;
- communications;
- accès internes;
- accès externes;
- authentification;
- autorisations;
- chiffrement en transit;
- chiffrement au repos;
- sauvegardes;
- journalisation;
- surveillance;
- durée de conservation;
- destruction;
- anonymisation;
- export;
- accès;
- rectification;
- retrait;
- suppression;
- fermeture de compte;
- incidents;
- dépendances;
- risques d’utilisation secondaire;
- risques de surcollecte;
- risques de réidentification;
- risques liés aux mineurs;
- risques liés à l’intelligence artificielle;
- risques liés à une décision automatisée;
- mesures d’atténuation;
- risque résiduel;
- acceptation ou refus du risque;
- approbation du responsable;
- date;
- prochaine révision.

### Projets nécessitant une attention prioritaire

- gestionnaire de consentement;
- suivi des paniers abandonnés;
- futur outil analytique;
- futur outil marketing;
- futur chatbot;
- nouvelle plateforme de courriel;
- changement d’hébergement;
- changement important de Stripe ou Printful;
- nouvelle intégration d’intelligence artificielle;
- nouvelle centralisation des données clients.

---

## 15. Communication hors Québec et fournisseurs

Les fournisseurs et services susceptibles de traiter des renseignements personnels doivent être évalués individuellement.

### Fournisseurs connus ou envisagés

- Hostinger;
- Stripe;
- Printful;
- fournisseur de courriel;
- futur outil analytique;
- futur outil marketing;
- futur fournisseur de chatbot;
- fournisseur de modèle d’intelligence artificielle;
- service de journalisation;
- service de surveillance;
- service de soutien;
- service de sauvegarde;
- service antifraude;
- dépôt de code ou outil de développement lorsque des données réelles peuvent y être exposées.

### Fiche fournisseur minimale

Pour chaque fournisseur, documenter :

| Élément | Information |
|---|---|
| Nom du fournisseur | À confirmer |
| Service rendu | À confirmer |
| Rôle | À confirmer |
| Renseignements traités | À confirmer |
| Finalités | À confirmer |
| Pays d’hébergement | À confirmer |
| Pays accessibles | À confirmer |
| Sous-traitants | À confirmer |
| Durée de conservation | À confirmer |
| Suppression | À confirmer |
| Chiffrement | À confirmer |
| Accès administrateur | À confirmer |
| Gestion des incidents | À confirmer |
| Assistance aux demandes | À confirmer |
| Utilisation secondaire | À confirmer |
| Entraînement de modèles | À confirmer |
| Contrat vérifié | Non |
| EFVP effectuée | Non |
| Risques | À confirmer |
| Mesures d’atténuation | À confirmer |
| Décision | En attente |

### Principes

- aucun fournisseur ne doit être approuvé uniquement sur la base de sa réputation;
- les réglages réels du compte Flippin’ Maple doivent être vérifiés;
- les conditions contractuelles doivent être conservées;
- les changements de sous-traitants doivent être surveillés lorsque possible;
- les accès doivent être limités;
- les comptes administrateurs doivent être protégés;
- les données de production ne doivent pas être utilisées inutilement en développement;
- une communication hors Québec doit être documentée et évaluée avant sa mise en œuvre lorsque requis;
- les obligations du fournisseur ne remplacent pas celles de Flippin’ Maple.

---

## 16. Conservation, destruction et anonymisation

Flippin’ Maple devra établir une grille de conservation documentée.

Aucune durée arbitraire ne doit être inscrite simplement pour remplir une politique.

### Catégories à couvrir

- comptes clients;
- comptes inactifs;
- authentification;
- commandes;
- factures;
- obligations fiscales;
- paiement;
- livraison;
- suivi de livraison;
- panier local;
- panier serveur;
- paniers abandonnés;
- consentements;
- preuves de consentement;
- désabonnements;
- communications promotionnelles;
- demandes de soutien;
- pièces jointes;
- conversations du chatbot;
- journaux serveur;
- journaux de sécurité;
- erreurs applicatives;
- incidents de confidentialité;
- demandes d’accès;
- sauvegardes;
- données de test;
- exports administratifs;
- données supprimées chez les fournisseurs.

### Chaque règle devra préciser

| Élément | Description |
|---|---|
| Catégorie | Type de renseignement ou dossier |
| Finalité | Raison de la conservation |
| Début du délai | Événement déclencheur |
| Durée active | À déterminer |
| Durée d’archive | À déterminer |
| Obligation applicable | À confirmer |
| Système | À confirmer |
| Responsable | À confirmer |
| Méthode de destruction | À confirmer |
| Sauvegardes | À confirmer |
| Fournisseurs concernés | À confirmer |
| Preuve de destruction | À confirmer |
| Révision | À confirmer |

### Principes

Chaque durée devra être justifiée par :

- la finalité;
- une obligation légale ou contractuelle;
- la nécessité opérationnelle;
- le risque;
- les droits des personnes;
- les capacités techniques de destruction;
- les périodes de sauvegarde;
- les délais applicables chez les fournisseurs.

Lorsque l’anonymisation est envisagée, elle ne doit pas être confondue avec :

- la pseudonymisation;
- le retrait d’un nom seulement;
- le masquage visuel;
- la suppression d’un seul identifiant.

---

## 17. Accès, rectification, retrait et suppression

Flippin’ Maple devra définir une procédure opérationnelle documentée permettant de traiter les demandes relatives aux renseignements personnels.

### Capacités à prévoir

- recevoir une demande;
- identifier le demandeur de manière proportionnée;
- éviter de collecter excessivement pour vérifier l’identité;
- consigner la demande;
- confirmer sa réception;
- déterminer les systèmes concernés;
- chercher les renseignements;
- contacter les fournisseurs concernés;
- exporter les renseignements;
- corriger les renseignements;
- retirer un consentement;
- désabonner;
- modifier les préférences de confidentialité;
- fermer un compte;
- supprimer lorsque permis;
- conserver lorsque requis;
- expliquer un refus;
- documenter la décision;
- respecter les délais applicables;
- informer la personne;
- consigner la fermeture de la demande.

### Systèmes à couvrir

- base de données MySQL;
- authentification;
- Stripe;
- Printful;
- fournisseur de courriel;
- paniers abandonnés;
- outils analytiques;
- outils marketing;
- chatbot;
- soutien;
- journaux;
- sauvegardes;
- exports administratifs.

### Interface future

Une interface publique pourra éventuellement fournir :

- coordonnées du responsable;
- formulaire de demande;
- type de demande;
- explications;
- méthode sécurisée de vérification;
- suivi;
- confirmation.

Cette interface ne doit pas exposer de renseignements personnels dans une URL publique ou un journal inutile.

---

## 18. Incidents de confidentialité

Flippin’ Maple devra mettre en place un plan de gestion des incidents de confidentialité.

### Plan préliminaire

- canal interne de signalement;
- personne ou rôle responsable;
- disponibilité des coordonnées;
- registre des incidents;
- date de détection;
- date de début estimée;
- systèmes touchés;
- renseignements touchés;
- personnes touchées;
- fournisseurs concernés;
- mesures immédiates;
- suspension d’accès;
- changement de clés ou mots de passe;
- conservation des preuves;
- analyse de la cause;
- analyse du risque de préjudice sérieux;
- facteurs aggravants;
- mesures de réduction du risque;
- décision relative aux avis;
- avis aux personnes lorsque requis;
- avis à la Commission lorsque requis;
- coordination avec les fournisseurs;
- documentation des décisions;
- prévention de récidive;
- revue après incident;
- fermeture de l’incident;
- conservation du registre selon les exigences applicables.

### Exemples à considérer

- accès non autorisé à un compte;
- erreur d’envoi;
- mauvaise commande affichée;
- donnée d’un client exposée à un autre;
- sauvegarde publique;
- journal contenant des données sensibles;
- clé d’API exposée;
- compte administrateur compromis;
- fuite chez un fournisseur;
- conversation de chatbot exposée;
- export téléchargé par erreur;
- ordinateur ou téléphone perdu;
- suppression accidentelle;
- collecte non autorisée;
- script marketing chargé sans consentement applicable.

Aucun exemple ne doit être interprété comme une confirmation qu’un incident s’est produit.

---

## 19. Phases d’implantation

L’ordre suivant est obligatoire afin d’éviter de construire une interface de consentement sans connaître les traitements réels.

### Phase 0 — Documentation et audit

- maintenir le présent document;
- auditer le code;
- auditer la base de données;
- auditer les cookies;
- auditer localStorage;
- auditer sessionStorage;
- auditer les appels réseau;
- auditer les fournisseurs;
- auditer la production;
- documenter les flux;
- identifier les responsables;
- identifier les décisions inconnues;
- documenter les risques.

### Phase 1 — Gouvernance

- identifier le responsable de la protection des renseignements personnels;
- définir les coordonnées publiques;
- créer les politiques internes;
- établir les rôles;
- définir les accès;
- produire les EFVP nécessaires;
- établir le processus de demandes;
- établir le processus d’incidents;
- définir la conservation;
- analyser les contrats fournisseurs;
- documenter les communications hors Québec.

### Phase 2 — Gestionnaire de consentement

- choisir l’architecture;
- définir les catégories;
- définir le schéma versionné;
- créer le registre des services;
- créer la bannière;
- créer le panneau de préférences;
- créer le lien permanent;
- bloquer les services non essentiels;
- permettre le refus;
- permettre le retrait;
- gérer les changements de version;
- tester le stockage;
- tester la navigation;
- tester le checkout;
- tester le panier;
- tester le français;
- tester l’anglais;
- tester l’accessibilité.

### Phase 3 — Pages publiques

- rédiger la politique de confidentialité;
- rédiger la politique relative aux témoins;
- rédiger les conditions d’utilisation;
- publier les coordonnées du responsable;
- expliquer les droits;
- expliquer les demandes;
- expliquer la conservation;
- expliquer les fournisseurs;
- expliquer les communications hors Québec;
- ajouter les destinations réelles au pied de page;
- valider juridiquement.

### Phase 4 — Formulaires et inscription

- créer les avis contextuels;
- séparer les finalités;
- corriger la sémantique de `is_subscribed`;
- rendre l’infolettre facultative;
- retirer les liens inexistants;
- ajouter les liens réels;
- définir les consentements requis;
- définir les consentements facultatifs;
- enregistrer les preuves appropriées;
- synchroniser les désabonnements;
- tester le backend;
- tester les erreurs;
- tester l’accessibilité.

### Phase 5 — Chatbot

- définir les fonctions;
- choisir le fournisseur ou l’architecture interne;
- compléter l’EFVP;
- analyser le contrat;
- définir les données autorisées;
- définir la conservation;
- définir l’entraînement;
- définir le consentement;
- créer un prototype;
- créer les garde-fous;
- créer l’escalade humaine;
- créer les messages de transparence;
- tester les réponses;
- tester les accès;
- tester les suppressions;
- tester les incidents;
- tester le refus des témoins non essentiels.

### Phase 6 — Validation et lancement

- audit technique;
- audit de sécurité;
- audit rédactionnel;
- audit des liens;
- audit des fournisseurs;
- audit des scripts;
- audit mobile;
- audit d’accessibilité;
- test du refus;
- test du retrait;
- test du changement de version;
- test de suppression;
- test de compte;
- test de checkout;
- validation juridique;
- approbation interne;
- sauvegarde;
- plan de retour arrière;
- mise en production autorisée séparément;
- surveillance après lancement.

---

## 20. Critères de blocage

Une fonction ou intégration ne doit pas être mise en production lorsque l’une des conditions suivantes demeure vraie :

- sa finalité n’est pas définie;
- les renseignements collectés ne sont pas inventoriés;
- le caractère nécessaire ou facultatif n’est pas défini;
- le fournisseur est inconnu;
- les sous-traitants pertinents sont inconnus;
- le pays de traitement est inconnu;
- la durée de conservation est inconnue;
- le mécanisme de destruction est inconnu;
- un lien juridique est brisé;
- un texte est fictif;
- un consentement est trompeur;
- un consentement facultatif est précoché;
- un abonnement marketing est obligatoire;
- un service non essentiel contourne les préférences;
- le refus n’est pas fonctionnel;
- le retrait n’est pas fonctionnel;
- le panier cesse de fonctionner après un refus des non essentiels;
- une communication hors Québec n’a pas été évaluée lorsque requis;
- une EFVP requise n’est pas terminée;
- le fournisseur utilise les données pour une finalité non approuvée;
- les conversations du chatbot servent à l’entraînement sans décision documentée;
- les données d’un client peuvent être exposées à un autre;
- les droits d’accès ou de rectification ne peuvent pas être traités;
- les tests de confidentialité échouent;
- les tests de sécurité échouent;
- les textes publics ne correspondent pas au fonctionnement réel;
- la validation juridique requise n’a pas été obtenue;
- la mise en production n’a pas été autorisée explicitement.

---

## 21. Décisions ouvertes

Les décisions suivantes doivent être complétées avant la rédaction définitive des politiques publiques ou la mise en production des fonctions concernées.

| Décision | Statut |
|---|---|
| Nom juridique de l’entreprise | À confirmer |
| Nom commercial à publier | Flippin’ Maple — structure juridique à confirmer |
| Adresse officielle | À confirmer |
| Responsable de la protection des renseignements personnels | À confirmer |
| Coordonnées publiques du responsable | À confirmer |
| Processus de demande | À définir |
| Processus de plainte | À définir |
| Fournisseur de courriel | À confirmer |
| Fournisseur analytique | Aucun confirmé |
| Fournisseur marketing | Aucun confirmé |
| Fournisseur du chatbot | Aucun confirmé |
| Architecture du chatbot | À définir |
| Pays de traitement | À confirmer par fournisseur |
| Durées de conservation | À définir |
| Destruction des sauvegardes | À confirmer |
| Gestion des comptes inactifs | À définir |
| Fermeture d’un compte | À définir |
| Règles de paniers abandonnés | À définir |
| Relance de paniers abandonnés | Non autorisée avant clarification |
| Preuve des consentements | À définir |
| Versionnement des consentements | À définir |
| Outil de gestion du consentement | À choisir ou développer |
| Catégorie du chatbot | À déterminer |
| Gestion des mineurs | À définir |
| Âge minimal du compte | À confirmer |
| Support humain | À définir |
| Canal de soutien | À définir |
| Politique de retour | À documenter séparément |
| Politique de livraison | À documenter séparément |
| Langues des documents | Français et anglais envisagés |
| Validation juridique | Requise |
| Date de lancement | Non déterminée |

Cette liste doit être enrichie à mesure que l’audit révèle de nouvelles décisions.

---

## 22. Références officielles à maintenir

Les références suivantes constituent une base de travail à vérifier au moment de chaque rédaction ou décision importante :

- Légis Québec — Loi sur la protection des renseignements personnels dans le secteur privé, chapitre P-39.1;
- Commission d’accès à l’information du Québec — ressources destinées aux entreprises privées;
- Commission d’accès à l’information du Québec — collecte de renseignements personnels;
- Commission d’accès à l’information du Québec — consentement;
- Commission d’accès à l’information du Québec — responsable de la protection des renseignements personnels;
- Commission d’accès à l’information du Québec — politiques et pratiques de gouvernance;
- Commission d’accès à l’information du Québec — évaluation des facteurs relatifs à la vie privée;
- Commission d’accès à l’information du Québec — incidents de confidentialité;
- Commission d’accès à l’information du Québec — communication de renseignements personnels hors Québec;
- CRTC — Loi canadienne anti-pourriel;
- Gouvernement du Canada — exigences relatives aux messages électroniques commerciaux;
- Commissariat à la protection de la vie privée du Canada — ressources relatives aux technologies, à l’intelligence artificielle et aux services en ligne lorsque pertinentes.

> Les références doivent être vérifiées au moment de rédiger les textes publics et avant chaque mise en production importante. Le texte législatif officiel et les obligations applicables au contexte réel de Flippin’ Maple doivent prévaloir.

Ne transforme pas cette section en bibliographie exhaustive.
Ne crée pas d’URL non vérifiée.
Les liens précis pourront être ajoutés au moment de la validation documentaire.

---

## 23. Prochaine action autorisée

La prochaine action autorisée est un audit technique ciblé du projet.

Ordre :

1. auditer les cookies utilisés par le frontend et le backend;
2. auditer les options des cookies d’authentification;
3. auditer `localStorage`;
4. auditer `sessionStorage`;
5. auditer les technologies similaires;
6. auditer les appels vers les fournisseurs tiers;
7. auditer les scripts chargés dans le navigateur;
8. auditer le panier;
9. auditer le checkout;
10. auditer le suivi des paniers abandonnés;
11. auditer les données enregistrées dans MySQL;
12. compléter les tableaux des sections 6 et 7;
13. identifier les inconnues qui exigent une vérification dans les tableaux de bord de production;
14. produire une première EFVP interne;
15. concevoir ensuite seulement le gestionnaire de consentement.

### Restrictions de l’étape actuelle

- aucun changement à `Register.jsx`;
- aucune bannière de témoins codée;
- aucun panneau de préférences codé;
- aucun script tiers ajouté;
- aucun outil analytique ajouté;
- aucun outil marketing ajouté;
- aucun chatbot intégré;
- aucune page juridique fictive créée;
- aucun lien juridique brisé ajouté;
- aucune modification du checkout;
- aucune modification de Stripe;
- aucune modification de Printful;
- aucun changement de base de données;
- aucun build;
- aucun test global;
- aucun serveur;
- aucun push;
- aucun déploiement.

Le document devra être mis à jour à la suite de chaque phase d’audit ou de chaque décision importante.

---

## Avertissement

Le présent document est un outil interne de planification technique, fonctionnelle et documentaire.

Il ne constitue pas :

- un avis juridique;
- une certification;
- une déclaration de conformité;
- une politique publique définitive;
- une garantie que toutes les obligations applicables ont été recensées.

Une validation juridique québécoise demeure requise avant la publication des textes définitifs et avant la mise en production des mécanismes sensibles.
