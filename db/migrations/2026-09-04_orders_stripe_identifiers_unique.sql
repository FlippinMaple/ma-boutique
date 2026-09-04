-- P20-D4: exact Stripe identifiers on orders — at most one order per ID.
-- stripe_session_id / stripe_payment_intent_id become utf8mb4_bin (case-sensitive,
-- matching Stripe IDs and existing BINARY lookups). UNIQUE indexes keep the current
-- names. NULL remains allowed (several unpaid/legacy rows). No row UPDATE/DELETE/TRIM.
-- Invalid whitespace (empty, spaces-only, leading/trailing) aborts. Duplicates are
-- checked with COLLATE utf8mb4_bin. Nothing is normalized or cleaned up.

BEGIN NOT ATOMIC
  IF EXISTS (
    SELECT 1
      FROM orders
     WHERE stripe_session_id IS NOT NULL
       AND (
            TRIM(stripe_session_id) = ''
         OR BINARY stripe_session_id <> BINARY TRIM(stripe_session_id)
       )
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D4 abort: invalid stripe_session_id whitespace';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM orders
     WHERE stripe_payment_intent_id IS NOT NULL
       AND (
            TRIM(stripe_payment_intent_id) = ''
         OR BINARY stripe_payment_intent_id <> BINARY TRIM(stripe_payment_intent_id)
       )
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D4 abort: invalid stripe_payment_intent_id whitespace';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM orders
     WHERE stripe_session_id IS NOT NULL
     GROUP BY stripe_session_id COLLATE utf8mb4_bin
    HAVING COUNT(*) > 1
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D4 abort: duplicate stripe_session_id';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM orders
     WHERE stripe_payment_intent_id IS NOT NULL
     GROUP BY stripe_payment_intent_id COLLATE utf8mb4_bin
    HAVING COUNT(*) > 1
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D4 abort: duplicate stripe_payment_intent_id';
  END IF;
END;

SET @idx_session_non_unique = (
  SELECT NON_UNIQUE
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'orders'
     AND INDEX_NAME = 'idx_orders_stripe_session'
     AND SEQ_IN_INDEX = 1
   LIMIT 1
);

SET @idx_pi_non_unique = (
  SELECT NON_UNIQUE
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'orders'
     AND INDEX_NAME = 'idx_orders_pi'
     AND SEQ_IN_INDEX = 1
   LIMIT 1
);

-- NULL = index missing; 1 = non-unique present; 0 = already UNIQUE.
SET @session_idx_sql = CASE
  WHEN @idx_session_non_unique IS NULL THEN
    ', ADD UNIQUE INDEX idx_orders_stripe_session (stripe_session_id)'
  WHEN @idx_session_non_unique = 1 THEN
    ', DROP INDEX idx_orders_stripe_session, ADD UNIQUE INDEX idx_orders_stripe_session (stripe_session_id)'
  ELSE
    ''
END;

SET @pi_idx_sql = CASE
  WHEN @idx_pi_non_unique IS NULL THEN
    ', ADD UNIQUE INDEX idx_orders_pi (stripe_payment_intent_id)'
  WHEN @idx_pi_non_unique = 1 THEN
    ', DROP INDEX idx_orders_pi, ADD UNIQUE INDEX idx_orders_pi (stripe_payment_intent_id)'
  ELSE
    ''
END;

SET @sql = CONCAT(
  'ALTER TABLE orders ',
  'MODIFY COLUMN stripe_session_id VARCHAR(255) ',
  'CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL, ',
  'MODIFY COLUMN stripe_payment_intent_id VARCHAR(255) ',
  'CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL',
  @session_idx_sql,
  @pi_idx_sql
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
