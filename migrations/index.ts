import * as migration_20261011_014606_initial from './20261011_014606_initial';
import * as migration_20261011_181740_order_idempotency_key from './20261011_181740_order_idempotency_key';
import * as migration_20261024_061017_product_label from './20261024_061017_product_label';
import * as migration_20261024_061141_promo_cards from './20261024_061141_promo_cards';
import * as migration_20261027_145423_deal_ends_at from './20261027_145423_deal_ends_at';
import * as migration_20261030_172753_media_storage_fields from './20261030_172753_media_storage_fields';
import * as migration_20261031_160131_mirza_store_name from './20261031_160131_mirza_store_name';
import * as migration_20261101_205147_flat_categories from './20261101_205147_flat_categories';
import * as migration_20261105_121934_storefront_content from './20261105_121934_storefront_content';

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
    name: '20261030_172753_media_storage_fields',
  },
  {
    up: migration_20261031_160131_mirza_store_name.up,
    down: migration_20261031_160131_mirza_store_name.down,
    name: '20261031_160131_mirza_store_name',
  },
  {
    up: migration_20261101_205147_flat_categories.up,
    down: migration_20261101_205147_flat_categories.down,
    name: '20261101_205147_flat_categories',
  },
  {
    up: migration_20261105_121934_storefront_content.up,
    down: migration_20261105_121934_storefront_content.down,
    name: '20261105_121934_storefront_content'
  },
];
