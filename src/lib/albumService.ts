import { supabase } from "@/app/supabase/client";
import type { Album, AlbumImage } from "@/types";

export type AlbumPreview = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  privacy: Album["privacy"];
  user_id: string;
  album_images: Array<Pick<AlbumImage, "storage_path" | "display_order">> | null;
  profiles?: {
    id: string;
    username: string | null;
    full_name: string | null;
  };
};

export type AlbumDetailsWithCreator = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  privacy: Album["privacy"];
  user_id: string;
  profiles?: {
    id: string;
    username: string | null;
    full_name: string | null;
  };
};

export type AlbumImageRow = Pick<AlbumImage, "storage_path" | "display_order">;

type CreateAlbumInput = {
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  privacy: Album["privacy"];
  cover_url: string | null;
};

export const albumService = {
  // Public albums with creator profile (landing)
  async getPublicAlbumsWithCreators(): Promise<AlbumPreview[]> {
    const { data, error } = await supabase
      .from('albums')
      .select('id, title, description, created_at, privacy, user_id, album_images(storage_path, display_order), profiles:profiles!albums_user_id_fkey(id, username, full_name)')
      .eq('privacy', 'public')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AlbumPreview[];
  },
  // Get all albums for a user
  async getUserAlbumsWithCreators(userId: string): Promise<AlbumPreview[]> {
    const { data, error } = await supabase
      .from('albums')
      .select('id, title, description, created_at, privacy, user_id, album_images(storage_path, display_order), profiles:profiles!albums_user_id_fkey(id, username, full_name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data ?? []) as AlbumPreview[];
  },

  // Get single album with images
  async getAlbumWithImages(albumId: string): Promise<{ album: Album; images: AlbumImage[] }> {
    const [albumResponse, imagesResponse] = await Promise.all([
      supabase.from('albums').select('*').eq('id', albumId).single(),
      supabase.from('album_images').select('*').eq('album_id', albumId),
    ]);

    if (albumResponse.error) throw albumResponse.error;
    if (imagesResponse.error) throw imagesResponse.error;

    return {
      album: albumResponse.data as Album,
      images: (imagesResponse.data ?? []) as AlbumImage[]
    };
  },

  // Get single album with images and creator profile
  async getAlbumWithImagesAndCreator(albumId: string): Promise<{ album: AlbumDetailsWithCreator; images: AlbumImageRow[] }> {
    const { data: album, error } = await supabase
      .from('albums')
      .select('id, title, description, created_at, privacy, user_id, profiles:profiles!albums_user_id_fkey(id, username, full_name)')
      .eq('id', albumId)
      .single();
    if (error) throw error;

    const { data: images, error: imagesError } = await supabase
      .from('album_images')
      .select('storage_path, display_order')
      .eq('album_id', albumId);
    if (imagesError) throw imagesError;

    return {
      album: album as AlbumDetailsWithCreator,
      images: (images ?? []) as AlbumImageRow[],
    };
  },

  // Create new album
  async createAlbum(albumData: CreateAlbumInput) {
    const { data, error } = await supabase
      .from('albums')
      .insert(albumData)
      .select()
      .single();
    
    if (error) throw error;
    return data as Album;
  },

  // Add images to album
  async addImagesToAlbum(albumId: string, images: AlbumImageRow[]) {
    const { data, error } = await supabase
      .from('album_images')
      .insert(
        images.map((image, index) => ({
          album_id: albumId,
          storage_path: image.storage_path,
          display_order: image.display_order ?? index,
        }))
      )
      .select();

    if (error) {
      console.error('Error adding images to album:', error);
      throw new Error(`Failed to add images to album: ${error.message}`);
    }
    return (data ?? []) as AlbumImage[];
  },

  // Update album
  async updateAlbum(albumId: string, updates: Partial<Album>) {
    const { data, error } = await supabase
      .from('albums')
      .update(updates)
      .eq('id', albumId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Album;
  },

  // Delete album and its images
  async deleteAlbum(albumId: string) {
    // First delete all images
    const { error: imagesError } = await supabase
      .from('album_images')
      .delete()
      .eq('album_id', albumId);
    
    if (imagesError) throw imagesError;

    // Then delete the album
    const { error: albumError } = await supabase
      .from('albums')
      .delete()
      .eq('id', albumId);
    
    if (albumError) throw albumError;
  }
  ,
  // Delete album including storage objects
  async deleteAlbumWithStorage(albumId: string) {
    // Fetch image paths first
    const { data: images, error: fetchErr } = await supabase
      .from('album_images')
      .select('storage_path')
      .eq('album_id', albumId);
    if (fetchErr) throw fetchErr;

    const paths = (images ?? []).map((i) => i.storage_path).filter((path): path is string => Boolean(path));
    if (paths.length > 0) {
      // Remove from storage bucket
      const { error: removeErr } = await supabase.storage.from('album-images').remove(paths);
      if (removeErr) throw removeErr;
    }

    // Then remove DB rows (images then album)
    await this.deleteAlbum(albumId);
  }
};
