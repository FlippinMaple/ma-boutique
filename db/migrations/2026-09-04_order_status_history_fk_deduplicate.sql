-- P20-D3: remove the redundant auto-named FK on order_status_history.order_id.
-- Historical drift left two equivalent FKs on the same relation:
--   fk_status_history_order         ON DELETE CASCADE  (kept — descriptive name)
--   order_status_history_ibfk_1     ON DELETE CASCADE  (removed — auto-named duplicate)
-- No row data is modified. The descriptive FK is not touched.
-- idx_status_order_id is not touched.
-- No index is dropped. No replacement FK is added.

SET @order_status_history_ibfk_1_exists = (
  SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
     AND TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'order_status_history'
     AND CONSTRAINT_NAME = 'order_status_history_ibfk_1'
     AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql = IF(
  @order_status_history_ibfk_1_exists > 0,
  'ALTER TABLE order_status_history DROP FOREIGN KEY order_status_history_ibfk_1',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
