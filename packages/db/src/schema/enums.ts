import { pgEnum } from 'drizzle-orm/pg-core';

export const productionTypeEnum = pgEnum('production_type_enum', [
  'feature', 'series', 'episode', 'short', 'special', 'documentary',
]);

export const studioKindEnum = pgEnum('studio_kind_enum', [
  'studio', 'production_company', 'distributor', 'network', 'streamer',
]);

export const productionStudioRoleEnum = pgEnum('production_studio_role_enum', [
  'production_company', 'distributor', 'financier', 'network', 'co_production',
]);

export const equipmentManufacturerKindEnum = pgEnum('equipment_manufacturer_kind_enum', [
  'manufacturer', 'rental_house', 'custom_builder',
]);

export const equipmentSeriesCategoryEnum = pgEnum('equipment_series_category_enum', [
  'lens_set', 'camera_body', 'lighting_fixture', 'filter', 'recorder', 'mount', 'accessory',
]);

export const equipmentItemStatusEnum = pgEnum('equipment_item_status_enum', [
  'active', 'discontinued', 'rare', 'prototype', 'rehoused',
]);

export const sceneInteriorExteriorEnum = pgEnum('scene_interior_exterior_enum', [
  'int', 'ext', 'int_ext',
]);

export const sceneTimeOfDayEnum = pgEnum('scene_time_of_day_enum', [
  'dawn', 'day', 'dusk', 'night', 'magic_hour',
]);

export const roleCategoryEnum = pgEnum('role_category_enum', [
  'camera', 'grip', 'electric', 'sound', 'art', 'wardrobe', 'makeup_hair',
  'production', 'post', 'vfx', 'direction', 'writing', 'music', 'stunts',
]);

export const sourceKindEnum = pgEnum('source_kind_enum', [
  'magazine_article', 'press_release', 'epk_document', 'interview_transcript',
  'book', 'podcast', 'commentary_track', 'documentary',
  'manufacturer_product_page', 'social_media', 'personal_communication',
  'forum_post', 'wiki', 'other',
]);

export const sourceConfidenceEnum = pgEnum('source_confidence_enum', [
  'primary', 'secondary', 'manufacturer_marketing', 'speculative',
]);
