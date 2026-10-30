import * as migration_20261011_014606_initial from './20261011_014606_initial';
import * as migration_20261011_181740_order_idempotency_key from './20261011_181740_order_idempotency_key';
import * as migration_20261024_061017_product_label from './20261024_061017_product_label';
import * as migration_20261024_061141_promo_cards from './20261024_061141_promo_cards';
import * as migration_20261027_145423_deal_ends_at from './20261027_145423_deal_ends_at';
import * as migration_20261030_172753_media_storage_fields from './20261030_172753_media_storage_fields';

export const migrations = [
  {
    up: migration_20261011_014606_initial.up,
    down: migration_20261011_014606_initial.down,
    name: '20261011_014606_initial',
  },
  {
    up: migration_20261011_181740_order_idempotency_key.up,
    down: migration_20261011_181740_order_idempotency_key.down,
    name: '20261011_181740_order_idempotency_key',
  },
  {
    up: migration_20261024_061017_product_label.up,
    down: migration_20261024_061017_product_label.down,
    name: '20261024_061017_product_label',
  },
  {
    up: migration_20261024_061141_promo_cards.up,
    down: migration_20261024_061141_promo_cards.down,
    name: '20261024_061141_promo_cards',
  },
  {
    up: migration_20261027_145423_deal_ends_at.up,
    down: migration_20261027_145423_deal_ends_at.down,
    name: '20261027_145423_deal_ends_at',
  },
  {
    up: migration_20261030_172753_media_storage_fields.up,
    down: migration_20261030_172753_media_storage_fields.down,
    name: '20261030_172753_media_storage_fields'
  },
];
