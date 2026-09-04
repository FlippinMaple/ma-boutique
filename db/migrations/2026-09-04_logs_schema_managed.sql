-- P20-D7: versioned logs schema (rich production table).
-- Case 1: missing table -> CREATE TABLE IF NOT EXISTS.
-- Case 2: rich schema already present -> no-op.
-- Case 3 / partial compatible -> in-place ADD/MODIFY only for known gaps.
-- Any unexpected third form -> SIGNAL 45000. No DROP/DELETE/DML/silent repair.

CREATE TABLE IF NOT EXISTS logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  level ENUM('debug','info','warn','error') NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  context VARCHAR(128) NULL,
  details LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_created_at (created_at),
  INDEX idx_level (level),
  INDEX idx_context (context)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @engine = (
  SELECT ENGINE
    FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
);

SET @table_collation = (
  SELECT TABLE_COLLATION
    FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
);

SET @pk_row_count = (
  SELECT COUNT(*)
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND INDEX_NAME = 'PRIMARY'
);

SET @pk_is_id_only = (
  SELECT COUNT(*)
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND INDEX_NAME = 'PRIMARY'
     AND SEQ_IN_INDEX = 1
     AND COLUMN_NAME = 'id'
);

SET @id_is_rich = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND COLUMN_NAME = 'id'
     AND DATA_TYPE = 'bigint'
     AND COLUMN_TYPE LIKE '%unsigned%'
     AND IS_NULLABLE = 'NO'
     AND LOWER(EXTRA) LIKE '%auto_increment%'
);

SET @id_is_minimal = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND COLUMN_NAME = 'id'
     AND DATA_TYPE = 'bigint'
     AND COLUMN_TYPE NOT LIKE '%unsigned%'
     AND IS_NULLABLE = 'NO'
     AND LOWER(EXTRA) LIKE '%auto_increment%'
);

SET @level_is_enum_ok = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND COLUMN_NAME = 'level'
     AND DATA_TYPE = 'enum'
     AND COLUMN_TYPE = 'enum(''debug'',''info'',''warn'',''error'')'
     AND IS_NULLABLE = 'NO'
     AND COLUMN_DEFAULT IN ('info', '''info''')
);

SET @level_is_varchar_ok = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND COLUMN_NAME = 'level'
     AND DATA_TYPE = 'varchar'
     AND CHARACTER_MAXIMUM_LENGTH = 16
     AND IS_NULLABLE = 'NO'
     AND (
          COLUMN_DEFAULT IS NULL
          OR UPPER(COLUMN_DEFAULT) = 'NULL'
         )
);

SET @message_ok = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND COLUMN_NAME = 'message'
     AND DATA_TYPE = 'text'
     AND IS_NULLABLE = 'NO'
     AND (
          COLUMN_DEFAULT IS NULL
          OR UPPER(COLUMN_DEFAULT) = 'NULL'
         )
);

SET @has_context = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND COLUMN_NAME = 'context'
);

SET @context_ok = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND COLUMN_NAME = 'context'
     AND DATA_TYPE = 'varchar'
     AND CHARACTER_MAXIMUM_LENGTH = 128
     AND IS_NULLABLE = 'YES'
     AND (
          COLUMN_DEFAULT IS NULL
          OR UPPER(COLUMN_DEFAULT) = 'NULL'
         )
);

SET @has_details = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND COLUMN_NAME = 'details'
);

SET @details_ok = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND COLUMN_NAME = 'details'
     AND DATA_TYPE = 'longtext'
     AND IS_NULLABLE = 'YES'
     AND (
          COLUMN_DEFAULT IS NULL
          OR UPPER(COLUMN_DEFAULT) = 'NULL'
         )
);

SET @created_is_rich = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND COLUMN_NAME = 'created_at'
     AND DATA_TYPE = 'datetime'
     AND IS_NULLABLE = 'NO'
     AND LOWER(COLUMN_DEFAULT) IN ('current_timestamp()', 'current_timestamp')
     AND (EXTRA IS NULL OR EXTRA = '' OR LOWER(EXTRA) = 'default_generated')
);

SET @created_is_minimal = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND COLUMN_NAME = 'created_at'
     AND DATA_TYPE = 'datetime'
     AND IS_NULLABLE = 'NO'
     AND (
          COLUMN_DEFAULT IS NULL
          OR UPPER(COLUMN_DEFAULT) = 'NULL'
         )
     AND (EXTRA IS NULL OR EXTRA = '')
);

SET @idx_created_at_rows = (
  SELECT COUNT(*)
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND INDEX_NAME = 'idx_created_at'
);

SET @idx_created_at_ok = (
  SELECT COUNT(*)
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND INDEX_NAME = 'idx_created_at'
     AND SEQ_IN_INDEX = 1
     AND COLUMN_NAME = 'created_at'
     AND INDEX_TYPE = 'BTREE'
     AND NON_UNIQUE = 1
     AND SUB_PART IS NULL
);

SET @idx_level_rows = (
  SELECT COUNT(*)
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND INDEX_NAME = 'idx_level'
);

SET @idx_level_ok = (
  SELECT COUNT(*)
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND INDEX_NAME = 'idx_level'
     AND SEQ_IN_INDEX = 1
     AND COLUMN_NAME = 'level'
     AND INDEX_TYPE = 'BTREE'
     AND NON_UNIQUE = 1
     AND SUB_PART IS NULL
);

SET @idx_context_rows = (
  SELECT COUNT(*)
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND INDEX_NAME = 'idx_context'
);

SET @idx_context_ok = (
  SELECT COUNT(*)
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'logs'
     AND INDEX_NAME = 'idx_context'
     AND SEQ_IN_INDEX = 1
     AND COLUMN_NAME = 'context'
     AND INDEX_TYPE = 'BTREE'
     AND NON_UNIQUE = 1
     AND SUB_PART IS NULL
);

BEGIN NOT ATOMIC
  IF @engine IS NULL OR UPPER(@engine) <> 'INNODB' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs ENGINE is not InnoDB';
  END IF;

  IF @table_collation IS NULL OR @table_collation NOT LIKE 'utf8mb4%' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs charset/collation is not utf8mb4';
  END IF;

  IF @pk_row_count <> 1 OR @pk_is_id_only <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs PRIMARY KEY is not (id)';
  END IF;

  IF @id_is_rich = 0 AND @id_is_minimal = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs.id is not a supported bigint PK';
  END IF;

  IF @id_is_minimal = 1 AND EXISTS (
    SELECT 1 FROM logs WHERE id IS NULL OR id < 0
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs.id has NULL or negative values';
  END IF;

  IF @level_is_enum_ok = 0 AND @level_is_varchar_ok = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs.level is not a supported type';
  END IF;

  IF @level_is_varchar_ok = 1 AND EXISTS (
    SELECT 1
      FROM logs
     WHERE level IS NULL
        OR level NOT IN ('debug', 'info', 'warn', 'error')
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs.level values incompatible with enum';
  END IF;

  IF @message_ok = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs.message is not TEXT NOT NULL';
  END IF;

  IF @has_context > 0 AND @context_ok = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs.context is not a supported type';
  END IF;

  IF @has_details > 0 AND @details_ok = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs.details is not a supported type';
  END IF;

  IF @created_is_rich = 0 AND @created_is_minimal = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs.created_at is not a supported type';
  END IF;

  IF @idx_created_at_rows > 0 AND NOT (@idx_created_at_rows = 1 AND @idx_created_at_ok = 1) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs.idx_created_at is incompatible';
  END IF;

  IF @idx_level_rows > 0 AND NOT (@idx_level_rows = 1 AND @idx_level_ok = 1) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs.idx_level is incompatible';
  END IF;

  IF @idx_context_rows > 0 AND NOT (@idx_context_rows = 1 AND @idx_context_ok = 1) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'P20-D7 abort: logs.idx_context is incompatible';
  END IF;
END;

SET @alter_parts = CONCAT_WS(', ',
  IF(@has_context = 0, 'ADD COLUMN context VARCHAR(128) NULL DEFAULT NULL', NULL),
  IF(@has_details = 0, 'ADD COLUMN details LONGTEXT NULL DEFAULT NULL', NULL),
  IF(@id_is_minimal = 1, 'MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT', NULL),
  IF(@level_is_varchar_ok = 1, 'MODIFY COLUMN level ENUM(''debug'',''info'',''warn'',''error'') NOT NULL DEFAULT ''info''', NULL),
  IF(@created_is_minimal = 1, 'MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP', NULL),
  IF(@idx_created_at_rows = 0, 'ADD INDEX idx_created_at (created_at)', NULL),
  IF(@idx_level_rows = 0, 'ADD INDEX idx_level (level)', NULL),
  IF(@idx_context_rows = 0, 'ADD INDEX idx_context (context)', NULL)
);

SET @sql = IF(
  @alter_parts IS NULL OR @alter_parts = '',
  'SELECT 1',
  CONCAT('ALTER TABLE logs ', @alter_parts)
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
