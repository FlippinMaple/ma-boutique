-- Crée (ou upgrade) la table stripe_events pour les webhooks Stripe

CREATE TABLE IF NOT EXISTS stripe_events (
  event_id   VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(64)  NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT UTC_TIMESTAMP(),
  payload    LONGTEXT     NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Index utile (ignore #1061 si déjà présent)
ALTER TABLE stripe_events
  ADD INDEX idx_type_created (event_type, created_at);

-- (Optionnel) UPGRADE si ancienne table minimale existait
-- Les lignes ci-dessous provoqueront des #1054/#1060/#1061 si déjà fait → OK
ALTER TABLE stripe_events CHANGE COLUMN id event_id VARCHAR(255) NOT NULL;
ALTER TABLE stripe_events ADD COLUMN event_type VARCHAR(64)  NOT NULL;
ALTER TABLE stripe_events ADD COLUMN created_at DATETIME     NOT NULL DEFAULT UTC_TIMESTAMP();
ALTER TABLE stripe_events ADD COLUMN payload    LONGTEXT     NULL;
ALTER TABLE stripe_events DROP PRIMARY KEY, ADD PRIMARY KEY (event_id);
