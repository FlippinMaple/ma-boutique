-- P20-D6: drop residual legacy table wishlists.
-- Wishlist API disabled since P18; current runtime has no wishlist/wishlists usage.
-- No inbound FKs, triggers, views, or routines reference this table.
-- DROP TABLE removes wishlists and its own indexes/FKs. No other tables are touched.

DROP TABLE IF EXISTS wishlists;
