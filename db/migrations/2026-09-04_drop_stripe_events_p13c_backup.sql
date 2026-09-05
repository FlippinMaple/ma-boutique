-- P20-D9: drop temporary P13-C backup stripe_events_p13c_backup_20260818.
-- Fail-closed. No DML. No ALTER of other tables. Backup payload values are never
-- selected or returned. Live stripe_events.payload is classified only via COUNT /
-- JSON_VALID / JSON_TYPE / JSON_LENGTH / JSON_EXTRACT / IS NULL.
-- phpMyAdmin: compound IF/SIGNAL/DROP is wrapped in PREPARE (P20-D7). No DELIMITER.

SET @backup_exists = (
  SELECT COUNT(*)
    FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'stripe_events_p13c_backup_20260818'
     AND TABLE_TYPE = 'BASE TABLE'
);

SET @live_exists = (
  SELECT COUNT(*)
    FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'stripe_events'
     AND TABLE_TYPE = 'BASE TABLE'
);

SET @backup_col_count = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'stripe_events_p13c_backup_20260818'
);

SET @backup_unexpected_cols = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'stripe_events_p13c_backup_20260818'
     AND COLUMN_NAME NOT IN ('event_id', 'payload')
);

SET @backup_event_id_ok = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'stripe_events_p13c_backup_20260818'
     AND COLUMN_NAME = 'event_id'
     AND DATA_TYPE = 'varchar'
     AND CHARACTER_MAXIMUM_LENGTH = 255
     AND IS_NULLABLE = 'NO'
);

SET @backup_payload_ok = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'stripe_events_p13c_backup_20260818'
     AND COLUMN_NAME = 'payload'
     AND DATA_TYPE = 'longtext'
     AND IS_NULLABLE = 'YES'
);

SET @backup_fk_out = (
  SELECT COUNT(*)
    FROM information_schema.KEY_COLUMN_USAGE
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'stripe_events_p13c_backup_20260818'
     AND REFERENCED_TABLE_NAME IS NOT NULL
);

SET @backup_fk_in = (
  SELECT COUNT(*)
    FROM information_schema.KEY_COLUMN_USAGE
   WHERE TABLE_SCHEMA = DATABASE()
     AND REFERENCED_TABLE_SCHEMA = DATABASE()
     AND REFERENCED_TABLE_NAME = 'stripe_events_p13c_backup_20260818'
);

SET @backup_fk_ref_out = (
  SELECT COUNT(*)
    FROM information_schema.REFERENTIAL_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
     AND TABLE_NAME = 'stripe_events_p13c_backup_20260818'
);

SET @backup_fk_ref_in = (
  SELECT COUNT(*)
    FROM information_schema.REFERENTIAL_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
     AND REFERENCED_TABLE_NAME = 'stripe_events_p13c_backup_20260818'
);

SET @backup_rows = NULL;
SET @backup_distinct = NULL;
SET @backup_null_event_id = NULL;
SET @backup_null_payload = NULL;
SET @missing_live = NULL;
SET @n_null = NULL;
SET @n_obj = NULL;
SET @n_pi = NULL;
SET @n_invalid = NULL;
SET @n_legacy = NULL;
SET @n_other = NULL;

SET @stats_sql = IF(
  @backup_exists = 1
  AND @live_exists = 1
  AND @backup_col_count = 2
  AND @backup_unexpected_cols = 0
  AND @backup_event_id_ok = 1
  AND @backup_payload_ok = 1,
  'SELECT COUNT(*),
          COUNT(DISTINCT b.event_id),
          SUM(b.event_id IS NULL),
          SUM(b.payload IS NULL),
          SUM(se.event_id IS NULL),
          SUM(se.event_id IS NOT NULL AND se.payload IS NULL),
          SUM(se.event_id IS NOT NULL
              AND se.payload IS NOT NULL
              AND JSON_VALID(se.payload) = 1
              AND JSON_TYPE(se.payload) = ''OBJECT''
              AND JSON_LENGTH(se.payload) = 1
              AND JSON_TYPE(JSON_EXTRACT(se.payload, ''$.object_id'')) = ''STRING''),
          SUM(se.event_id IS NOT NULL
              AND se.payload IS NOT NULL
              AND JSON_VALID(se.payload) = 1
              AND JSON_TYPE(se.payload) = ''OBJECT''
              AND JSON_LENGTH(se.payload) = 1
              AND JSON_TYPE(JSON_EXTRACT(se.payload, ''$.payment_intent_id'')) = ''STRING''),
          SUM(se.event_id IS NOT NULL
              AND se.payload IS NOT NULL
              AND JSON_VALID(se.payload) = 0),
          SUM(se.event_id IS NOT NULL
              AND se.payload IS NOT NULL
              AND JSON_VALID(se.payload) = 1
              AND NOT (
                    JSON_TYPE(se.payload) = ''OBJECT''
                AND JSON_LENGTH(se.payload) = 1
                AND JSON_TYPE(JSON_EXTRACT(se.payload, ''$.object_id'')) = ''STRING''
              )
              AND NOT (
                    JSON_TYPE(se.payload) = ''OBJECT''
                AND JSON_LENGTH(se.payload) = 1
                AND JSON_TYPE(JSON_EXTRACT(se.payload, ''$.payment_intent_id'')) = ''STRING''
              )
              AND (
                    JSON_EXTRACT(se.payload, ''$.data.object'') IS NOT NULL
                 OR JSON_TYPE(JSON_EXTRACT(se.payload, ''$.data'')) = ''OBJECT''
              )),
          SUM(se.event_id IS NOT NULL
              AND se.payload IS NOT NULL
              AND JSON_VALID(se.payload) = 1
              AND NOT (
                    JSON_TYPE(se.payload) = ''OBJECT''
                AND JSON_LENGTH(se.payload) = 1
                AND JSON_TYPE(JSON_EXTRACT(se.payload, ''$.object_id'')) = ''STRING''
              )
              AND NOT (
                    JSON_TYPE(se.payload) = ''OBJECT''
                AND JSON_LENGTH(se.payload) = 1
                AND JSON_TYPE(JSON_EXTRACT(se.payload, ''$.payment_intent_id'')) = ''STRING''
              )
              AND JSON_EXTRACT(se.payload, ''$.data.object'') IS NULL
              AND (JSON_TYPE(JSON_EXTRACT(se.payload, ''$.data'')) IS NULL
                   OR JSON_TYPE(JSON_EXTRACT(se.payload, ''$.data'')) <> ''OBJECT''))
     INTO @backup_rows,
          @backup_distinct,
          @backup_null_event_id,
          @backup_null_payload,
          @missing_live,
          @n_null,
          @n_obj,
          @n_pi,
          @n_invalid,
          @n_legacy,
          @n_other
     FROM `stripe_events_p13c_backup_20260818` AS b
     LEFT JOIN stripe_events AS se
            ON se.event_id = b.event_id',
  'SELECT NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
     INTO @backup_rows,
          @backup_distinct,
          @backup_null_event_id,
          @backup_null_payload,
          @missing_live,
          @n_null,
          @n_obj,
          @n_pi,
          @n_invalid,
          @n_legacy,
          @n_other'
);

PREPARE stats_stmt FROM @stats_sql;
EXECUTE stats_stmt;
DEALLOCATE PREPARE stats_stmt;

SET @guard_sql = 'BEGIN NOT ATOMIC
  IF @backup_exists <> 1 THEN
    SIGNAL SQLSTATE ''45000''
      SET MESSAGE_TEXT = ''P20-D9 abort: backup table missing'';
  END IF;

  IF @live_exists <> 1 THEN
    SIGNAL SQLSTATE ''45000''
      SET MESSAGE_TEXT = ''P20-D9 abort: stripe_events missing'';
  END IF;

  IF @backup_col_count <> 2
     OR @backup_unexpected_cols <> 0
     OR @backup_event_id_ok <> 1
     OR @backup_payload_ok <> 1 THEN
    SIGNAL SQLSTATE ''45000''
      SET MESSAGE_TEXT = ''P20-D9 abort: unexpected backup structure'';
  END IF;

  IF @backup_fk_out <> 0
     OR @backup_fk_in <> 0
     OR @backup_fk_ref_out <> 0
     OR @backup_fk_ref_in <> 0 THEN
    SIGNAL SQLSTATE ''45000''
      SET MESSAGE_TEXT = ''P20-D9 abort: backup has foreign keys'';
  END IF;

  IF @backup_rows <> 48 OR @backup_null_event_id <> 0 THEN
    SIGNAL SQLSTATE ''45000''
      SET MESSAGE_TEXT = ''P20-D9 abort: backup row count is not 48'';
  END IF;

  IF @backup_distinct <> 48 THEN
    SIGNAL SQLSTATE ''45000''
      SET MESSAGE_TEXT = ''P20-D9 abort: backup event_id not 48 distinct'';
  END IF;

  IF @backup_null_payload <> 0 THEN
    SIGNAL SQLSTATE ''45000''
      SET MESSAGE_TEXT = ''P20-D9 abort: backup payload contract changed'';
  END IF;

  IF @missing_live <> 0 THEN
    SIGNAL SQLSTATE ''45000''
      SET MESSAGE_TEXT = ''P20-D9 abort: backup event_id missing in stripe_events'';
  END IF;

  IF @n_null <> 6
     OR @n_obj <> 28
     OR @n_pi <> 14
     OR @n_invalid <> 0
     OR @n_legacy <> 0
     OR @n_other <> 0 THEN
    SIGNAL SQLSTATE ''45000''
      SET MESSAGE_TEXT = ''P20-D9 abort: live payload shape is not 28/14/6'';
  END IF;

  DROP TABLE `stripe_events_p13c_backup_20260818`;
END';

PREPARE guard_stmt FROM @guard_sql;
EXECUTE guard_stmt;
DEALLOCATE PREPARE guard_stmt;
