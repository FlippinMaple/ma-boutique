# Contraintes d’hébergement

**Document :** `docs/engineering/HOSTING_CONSTRAINTS.md`  
**Statut :** actif — migré depuis l’inventaire technique  
**Provenance :** `docs/INVENTAIRE_Flippin_Maple.md` — section `IMPORTANT — Contraintes d’hébergement (Hostinger / prod actuelle)`  
**Date de migration :** 2026-07-16  
**Portée :** contraintes Hostinger / MySQL prod et émulation des règles en code  

---

IMPORTANT — Contraintes d’hébergement (Hostinger / prod actuelle)

La base MySQL en prod (Hostinger) ne nous laisse pas exécuter librement des ALTER TABLE (erreur 1044).

Résultat : certaines contraintes qu’on voudrait mettre directement en base (FK carts.user_id → customers.id ON DELETE SET NULL, FK orders.shipping_address_id → addresses.id, etc.) ne peuvent pas être ajoutées en ce moment.

On émule donc ces contraintes dans le code backend :

Quand on associe un panier à un user, si le user n’existe pas, on force user_id = NULL (équivalent à ON DELETE SET NULL).

Au checkout, on capture des snapshots immuables (adresse, email, prix payé) dans orders et order_items au moment de la création de la commande.

Dès qu’on crée une session Stripe pour un panier, on passe ce panier en status='ordered' pour faire respecter l’unicité "un seul panier open".

On enregistre immédiatement stripe_session_id dans orders pour pouvoir relier les webhooks Stripe à la commande.

On écrit aussi une ligne initiale dans order_status_history.

Ces règles côté code SONT la vérité opérationnelle tant qu’on n’a pas les droits ALTER TABLE sur l’hébergeur. Le jour où on migre vers une base où on a les droits root, on pourra les traduire en vraies contraintes SQL.
