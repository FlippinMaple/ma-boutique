-- P20-D1: remove the contradictory CASCADE FK on order_items.order_id.
-- Historical drift left two FKs on the same relation:
--   fk_order               ON DELETE RESTRICT  (kept — snapshots must not vanish)
--   fk_order_items_order   ON DELETE CASCADE   (removed)
-- No row data is modified. fk_order is not touched. variant_id FKs are not touched.
-- No index is dropped. No replacement FK is added.

SET @fk_order_items_order_exists = (
  SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
     AND TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'order_items'
     AND CONSTRAINT_NAME = 'fk_order_items_order'
     AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql = IF(
  @fk_order_items_order_exists > 0,
  'ALTER TABLE order_items DROP FOREIGN KEY fk_order_items_order',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
