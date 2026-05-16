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

export const lightingRoleEnum = pgEnum('lighting_role_enum', [
  'key', 'fill', 'back', 'rim', 'kicker', 'practical', 'eye_light',
  'ambient', 'hair_light', 'set_light', 'special', 'natural',
]);

export const roleCategoryEnum = pgEnum('role_category_enum', [
  'camera', 'grip', 'electric', 'sound', 'art', 'wardrobe', 'makeup_hair',
  'production', 'post', 'vfx', 'direction', 'writing', 'music', 'stunts',
]);

export const sourceKindEnum = pgEnum('source_kind_enum', [
  'magazine_article', 'press_release', 'epk_document', 'interview_transcript',
  'book', 'podcast', 'commentary_track', 'documentary',
  'manufacturer_product_page', 'social_media', 'personal_communication',
  'forum_post', 'wiki', 'vfx_breakdown_article',
  'asc_article', 'icg_article', 'cinematographer_interview',
  'director_interview', 'vfx_supervisor_interview', 'official_epk',
  'bts_video', 'vfx_breakdown_video', 'manufacturer_documentation',
  'rental_house_confirmation', 'studio_press_kit', 'award_submission',
  'trade_article', 'database_import', 'community_submission',
  'other',
]);

export const sourceConfidenceEnum = pgEnum('source_confidence_enum', [
  'primary', 'secondary', 'manufacturer_marketing', 'speculative',
]);

export const vfxCreditRoleEnum = pgEnum('vfx_credit_role_enum', [
  'primary', 'additional', 'special_sequences', 'miniatures', 'previsualization',
]);

export const vfxTechniqueCategoryEnum = pgEnum('vfx_technique_category_enum', [
  'creature', 'environment', 'character', 'practical_enhancement',
  'simulation', 'compositing', 'other',
]);

export const videoSourceEnum = pgEnum('video_source_enum', [
  'youtube', 'vimeo',
]);

export const videoStatusEnum = pgEnum('video_status_enum', [
  'published', 'pending', 'rejected',
]);

export const videoCategoryEnum = pgEnum('video_category_enum', [
  'vfx_breakdown', 'compositing', 'making_of', 'behind_the_scenes',
  'director_interview', 'dp_interview', 'production_design',
  'stunts', 'sound', 'music', 'other',
]);

export const awardOrgEnum = pgEnum('award_org_enum', [
  'academy_awards', 'bafta', 'cannes', 'golden_globes',
  'critics_choice', 'asc_award', 'aso_award', 'csc_award',
  'bsc_award', 'spirit_awards', 'venice', 'berlin', 'ves_award', 'eca', 'other',
]);

export const vfxHouseKindEnum = pgEnum('vfx_house_kind_enum', [
  'full_service', 'boutique', 'in_house', 'rendering', 'previsualization', 'other',
]);

export const correctionStatusEnum = pgEnum('correction_status_enum', [
  'open', 'triaged', 'resolved', 'dismissed',
]);

export const claimTypeEnum = pgEnum('claim_type_enum', [
  'production_camera',
  'production_lens',
  'production_filter',
  'production_format',
  'production_lighting',
  'production_color_pipeline',
  'production_post_house',
  'production_vfx_house',
  'production_vfx_sequence',
  'scene_camera',
  'scene_lens',
  'scene_lighting',
  'scene_vfx',
  'scene_location',
  'gear_spec',
  'person_credit',
  'video_evidence',
  'general_bts_fact',
]);

export const claimStatusEnum = pgEnum('claim_status_enum', [
  'candidate',
  'needs_source',
  'sourced',
  'reviewed',
  'verified',
  'disputed',
  'deprecated',
  'rejected',
]);

export const claimConfidenceEnum = pgEnum('claim_confidence_enum', [
  'primary',
  'secondary',
  'manufacturer',
  'rental_house',
  'bts_visual',
  'inferred',
  'speculative',
  'conflicting',
]);

export const claimEntityTypeEnum = pgEnum('claim_entity_type_enum', [
  'production',
  'scene',
  'person',
  'role',
  'equipment_manufacturer',
  'equipment_series',
  'equipment_item',
  'vfx_house',
  'source',
  'video',
  'post_house',
  'location',
  // Migration 0061 — added for Theme F2 (citation rendering on remaining
  // detail page surfaces). Format is a slug-keyed lookup, not a row;
  // claim_entities.entity_id stores 0 with `entity_slug` populated.
  'stunt_company',
  'stunt_school',
  'format',
  'society',
]);

export const claimConflictKindEnum = pgEnum('claim_conflict_kind_enum', [
  'direct_conflict',
  'partial_conflict',
  'stale_source',
  'duplicate',
  'scope_mismatch',
]);

export const claimConflictResolutionStatusEnum = pgEnum('claim_conflict_resolution_status_enum', [
  'open',
  'reviewing',
  'resolved',
  'dismissed',
]);

export const evidenceKindEnum = pgEnum('evidence_kind_enum', [
  'video_timestamp',
  'video_still',
  'article_quote',
  'image_crop',
  'pdf_page',
  'social_post',
  'manual_editor_note',
]);

export const evidenceReviewStatusEnum = pgEnum('evidence_review_status_enum', [
  'pending',
  'reviewed',
  'rejected',
]);

export const transcriptStatusEnum = pgEnum('transcript_status_enum', [
  'pending',
  'fetched',
  'manual',
  'unavailable',
  'failed',
]);

export const videoAnnotationTypeEnum = pgEnum('video_annotation_type_enum', [
  'visible_gear',
  'vfx_before_after',
  'lighting_setup_visible',
  'monitor_lut_visible',
  'rigging_stunt_visible',
  'virtual_production_visible',
  'interview_quote',
  'general_evidence',
]);

export const videoAnnotationReviewStatusEnum = pgEnum('video_annotation_review_status_enum', [
  'pending',
  'reviewed',
  'rejected',
]);
