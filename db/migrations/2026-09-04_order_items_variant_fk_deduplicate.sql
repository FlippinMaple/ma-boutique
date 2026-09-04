-- P20-D2: remove the redundant auto-named FK on order_items.variant_id.
-- Historical drift left two equivalent FKs on the same relation:
--   fk_order_items_product_variant  ON DELETE CASCADE  (kept — descriptive name)
--   order_items_ibfk_2              ON DELETE CASCADE  (removed — auto-named duplicate)
-- No row data is modified. The descriptive FK is not touched.
-- fk_order and idx_product_variant_id are not touched.
-- No index is dropped. No replacement FK is added.

SET @order_items_ibfk_2_exists = (
  SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
     AND TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'order_items'
     AND CONSTRAINT_NAME = 'order_items_ibfk_2'
     AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql = IF(
  @order_items_ibfk_2_exists > 0,
  'ALTER TABLE order_items DROP FOREIGN KEY order_items_ibfk_2',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
