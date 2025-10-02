export type AlbumPrivacy = 'public' | 'private';

export interface BaseModel {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Profile extends BaseModel {
  email: string;
  username: string | null;
  full_name: string | null;
}

export interface Album extends BaseModel {
  user_id: string;
  title: string;
  description: string | null;
  privacy: AlbumPrivacy;
  cover_url: string | null;
  slug: string;
  signed_cover_url?: string | null;
  profiles?: {
    username: string | null;
    full_name: string | null;
  };
}

export interface AlbumImage extends Omit<BaseModel, 'updated_at'> {
  album_id: string;
  storage_path: string;
  display_order: number;
  url?: string | null;
  caption?: string | null;
}

// Form-related types
export type FormErrors = Partial<Record<"title" | "description" | "privacy" | "files", string>>;
export type UploadProgress = Record<string, number>;

// Upload types
export interface UploadedPhoto {
  path: string;
  url: string;
}

// State types
export interface LoadedAlbumState {
  kind: "loaded";
  album: Album;
  images: AlbumImage[];
}

// Alias for AlbumImage, for backward compatibility
export type Photo = AlbumImage;
