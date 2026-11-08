# Instructions pour les assistants IA — Flippin’ Maple

Ce fichier complète la Constitution. Il ne la remplace pas et ne la contredit pas.

Avant une modification importante, lire dans cet ordre :

1. `docs/00_PROJECT_MASTER.md`
2. `README.md` §2
3. Le document spécialisé du domaine (`docs/engineering/`, `docs/brand/`, `docs/compliance/`, `docs/web/`)
4. `docs/ETAT_DU_PROJET.md`, `docs/TRAVAUX_EN_COURS.md`, `docs/GUIDE_REPRISE.md`

En cas de conflit : la Constitution prime sur la vision ; le document spécialisé prime sur son domaine technique. Ces consignes opérationnelles passent après les deux.

## Modifications

- Ne pas modifier du code stable sans une justification liée à la demande en cours.
- Analyser les dépendances et les effets collatéraux avant d’éditer : routes, services, tables, jobs, docs d’invariants.
- Préserver l’architecture et les conventions existantes. Le monolithe modulaire est la direction ; il n’autorise pas un refactor de Stripe, Printful ou du checkout sans mandat explicite.
- Fournir des modifications complètes, ciblées et vérifiables. Nommer les fichiers touchés et expliquer le changement.
- Prévoir un retour arrière : `git diff` puis `git restore -- chemin` sur un travail non commité. Pas de `git clean`, `git reset --hard` ni de force-push sans demande explicite.
- Ne pas supprimer ni restructurer des fichiers sans autorisation explicite.
- Ne pas committer, pousser, migrer (`npm run migrate`), importer Printful, ni déployer sans autorisation explicite.
- Ne pas lancer `npm audit fix --force`.
- Ne pas copier de secrets, de fichiers `.env`, d’identifiants API, de données clients ou d’autres informations confidentielles dans la documentation, les commits ou le chat.

Les programmes de sécurité P3–P24 sont fermés. Le chantier produit ouvert documenté est le redesign storefront (Shop et Product Detail encore devant). Ne pas inventer une phase ou un P25.

Cursor charge aussi `.cursor/rules/securite-des-changements.mdc`.
