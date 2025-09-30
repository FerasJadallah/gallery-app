export type AlbumPrivacy = 'public' | 'private';

export interface Profile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string;
  user_id: string;
  title: string;
  slug: string;  // Add this line
  description: string | null;
  privacy: AlbumPrivacy;
  created_at: string;
  updated_at: string;
}

export interface AlbumImage {
  id: string;
  album_id: string;
  storage_path: string;
  display_order: number;
  created_at: string;
}

// Form-related types
export type FormErrors = Partial<Record<"title" | "description" | "privacy" | "files", string>>;
export type UploadProgress = Record<string, number>;

// Database insert types (without auto-generated fields)
export type AlbumInsert = Omit<Album, 'id' | 'created_at' | 'updated_at'>;
export type AlbumImageInsert = Omit<AlbumImage, 'id' | 'created_at'>;
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;

interface UploadedPhoto {
  path: string;
}

// Update the variable type in your component
const uploadedPhotos: UploadedPhoto[] = [];