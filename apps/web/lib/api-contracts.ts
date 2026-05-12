export type ApiMeta = {
  license: string;
  attribution?: string;
  api_version?: 'v1';
};

export type ProductionApiResponse = {
  production: unknown;
  formats: readonly unknown[];
  studios: readonly unknown[];
  crew: readonly unknown[];
  scenes: readonly unknown[];
  sources: readonly unknown[];
  vfx: unknown;
  videos: readonly unknown[];
  post_houses: readonly unknown[];
  _meta: ApiMeta;
};

export type CrewApiResponse = {
  slug: string;
  display_name: string;
  biography: string | null;
  primary_role: string | null;
  country: string | null;
  birth_year: number | null;
  death_year: number | null;
  imdb_id: string | null;
  tmdb_person_id: number | null;
  wikidata_id: string | null;
  filmography: readonly {
    production_slug: string;
    production_title: string;
    release_year: number | null;
    role_name: string;
    role_category: string;
  }[];
  _meta: ApiMeta;
};
