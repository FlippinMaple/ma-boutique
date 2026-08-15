CREATE TABLE IF NOT EXISTS checkout_idempotency (
  idempotency_key VARCHAR(64) NOT NULL,
  order_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (idempotency_key),
  INDEX idx_checkout_idempotency_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
