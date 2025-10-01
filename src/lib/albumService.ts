import { supabase } from '@/app/supabase/client';
import { Album, Photo } from '@/types';

interface AlbumWithImages extends Album {
  album_images: Photo[];
  profiles?: {
    id: string;
    username: string | null;
    full_name: string | null;
  };
}

export const albumService = {
  // Public albums with creator profile (landing)
  async getPublicAlbumsWithCreators() {
    const { data, error } = await supabase
      .from('albums')
      .select('id, title, description, created_at, privacy, user_id, album_images(storage_path, display_order), profiles:profiles!albums_user_id_fkey(id, username, full_name)')
      .eq('privacy', 'public')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as any[];
  },
  // Get all albums for a user
  async getUserAlbumsWithCreators(userId: string) {
    const { data, error } = await supabase
      .from('albums')
      .select('id, title, description, created_at, privacy, user_id, album_images(storage_path, display_order), profiles:profiles!albums_user_id_fkey(id, username, full_name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as any[];
  },

  // Get single album with images
  async getAlbumWithImages(albumId: string) {
    const [albumResponse, imagesResponse] = await Promise.all([
      supabase.from('albums').select('*').eq('id', albumId).single(),
      supabase.from('album_images').select('*').eq('album_id', albumId),
    ]);

    if (albumResponse.error) throw albumResponse.error;
    if (imagesResponse.error) throw imagesResponse.error;

    return {
      album: albumResponse.data as Album,
      images: imagesResponse.data as Photo[]
    };
  },

  // Get single album with images and creator profile
  async getAlbumWithImagesAndCreator(albumId: string) {
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

    return { album, images } as any;
  },

  // Create new album
  async createAlbum(albumData: Omit<Album, 'id' | 'created_at' | 'updated_at' | 'profiles' | 'cover_url'>) {
    const { data, error } = await supabase
      .from('albums')
      .insert(albumData)
      .select()
      .single();
    
    if (error) throw error;
    return data as Album;
  },

  // Add images to album
  async addImagesToAlbum(albumId: string, images: { storage_path: string; display_order: number }[]) {
    const { data, error } = await supabase
      .from('album_images')
      .insert(
        images.map((image, index) => ({
          album_id: albumId,
          storage_path: image.storage_path,
          display_order: index // Use index as display_order
        }))
      )
      .select();

    if (error) {
      console.error('Error adding images to album:', error);
      throw new Error(`Failed to add images to album: ${error.message}`);
    }
    return data;
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

    const paths = (images ?? []).map((i: any) => i.storage_path).filter(Boolean);
    if (paths.length > 0) {
      // Remove from storage bucket
      const { error: removeErr } = await supabase.storage.from('album-images').remove(paths);
      if (removeErr) throw removeErr;
    }

    // Then remove DB rows (images then album)
    await this.deleteAlbum(albumId);
  }
};
