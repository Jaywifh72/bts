CREATE TYPE "public"."equipment_item_status_enum" AS ENUM('active', 'discontinued', 'rare', 'prototype', 'rehoused');--> statement-breakpoint
CREATE TYPE "public"."equipment_manufacturer_kind_enum" AS ENUM('manufacturer', 'rental_house', 'custom_builder');--> statement-breakpoint
CREATE TYPE "public"."equipment_series_category_enum" AS ENUM('lens_set', 'camera_body', 'lighting_fixture', 'filter', 'recorder', 'mount', 'accessory');--> statement-breakpoint
CREATE TYPE "public"."production_studio_role_enum" AS ENUM('production_company', 'distributor', 'financier', 'network', 'co_production');--> statement-breakpoint
CREATE TYPE "public"."production_type_enum" AS ENUM('feature', 'series', 'episode', 'short', 'special', 'documentary');--> statement-breakpoint
CREATE TYPE "public"."role_category_enum" AS ENUM('camera', 'grip', 'electric', 'sound', 'art', 'wardrobe', 'makeup_hair', 'production', 'post', 'vfx', 'direction', 'writing', 'music', 'stunts');--> statement-breakpoint
CREATE TYPE "public"."scene_interior_exterior_enum" AS ENUM('int', 'ext', 'int_ext');--> statement-breakpoint
CREATE TYPE "public"."scene_time_of_day_enum" AS ENUM('dawn', 'day', 'dusk', 'night', 'magic_hour');--> statement-breakpoint
CREATE TYPE "public"."source_confidence_enum" AS ENUM('primary', 'secondary', 'manufacturer_marketing', 'speculative');--> statement-breakpoint
CREATE TYPE "public"."source_kind_enum" AS ENUM('magazine_article', 'press_release', 'epk_document', 'interview_transcript', 'book', 'podcast', 'commentary_track', 'documentary', 'manufacturer_product_page', 'social_media', 'personal_communication', 'forum_post', 'wiki', 'other');--> statement-breakpoint
CREATE TYPE "public"."studio_kind_enum" AS ENUM('studio', 'production_company', 'distributor', 'network', 'streamer');