import { getSupabaseClient } from "@/app/supabase/client";
import type { Album, AlbumImage } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type StorageBucketApi = ReturnType<SupabaseClient["storage"]["from"]>;

const ALBUM_IMAGES_BUCKET = "album-images";

const getPublicUrlForPath = (
  storage: StorageBucketApi,
  path: string | null | undefined
): string | null => {
  if (!path) return null;
  const { data } = storage.getPublicUrl(path);
  return data?.publicUrl ?? null;
};

export type AlbumImageRow = Pick<AlbumImage, "storage_path" | "display_order" | "url">;

export type AlbumPreview = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  privacy: Album["privacy"];
  user_id: string;
  album_images: AlbumImageRow[] | null;
  profiles?: {
    id: string;
    username: string | null;
    full_name: string | null;
  };
  cover_signed_url?: string | null;
};

export type AlbumDetailsWithCreator = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  privacy: Album["privacy"];
  user_id: string;
  cover_url: string | null;
  signed_cover_url?: string | null;
  profiles?: {
    id: string;
    username: string | null;
    full_name: string | null;
  };
};

type CreateAlbumInput = {
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  privacy: Album["privacy"];
  cover_url: string | null;
};

const mapAlbumImages = (value: unknown): AlbumImageRow[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((image) => {
      if (!image || typeof image !== "object") return null;
      const storagePath = (image as { storage_path?: unknown }).storage_path;
      if (typeof storagePath !== "string" || storagePath.length === 0) return null;
      const displayOrderValue = (image as { display_order?: unknown }).display_order;
      const displayOrder = typeof displayOrderValue === "number" ? displayOrderValue : 0;
      return {
        storage_path: storagePath,
        display_order: displayOrder,
        url: null,
      } satisfies AlbumImageRow;
    })
    .filter((item): item is AlbumImageRow => item !== null);
};

const mapProfile = (value: unknown): AlbumPreview["profiles"] => {
  if (!value || typeof value !== "object") return undefined;
  const source = Array.isArray(value) ? value[0] : value;
  if (!source || typeof source !== "object") return undefined;
  const idRaw = (source as { id?: unknown }).id;
  // id is optional for display, but keep undefined if missing
  const id = typeof idRaw === "string" ? idRaw : undefined;
  const username = (source as { username?: unknown }).username;
  const fullName = (source as { full_name?: unknown }).full_name;
  return {
    id: id ?? "",
    username: typeof username === "string" ? username : null,
    full_name: typeof fullName === "string" ? fullName : null,
  };
};

const mapAlbumPreview = (row: unknown): AlbumPreview | null => {
  if (!row || typeof row !== "object") return null;
  const source = row as Record<string, unknown>;
  const id = source.id;
  const createdAt = source.created_at;
  const userId = source.user_id;
  if (typeof id !== "string" || typeof createdAt !== "string" || typeof userId !== "string") {
    return null;
  }

  const privacyRaw = source.privacy;
  const privacy: Album["privacy"] = privacyRaw === "public" ? "public" : "private";

  return {
    id,
    title: typeof source.title === "string" ? source.title : "",
    description: typeof source.description === "string" ? source.description : null,
    created_at: createdAt,
    privacy,
    user_id: userId,
    album_images: mapAlbumImages(source.album_images),
    cover_signed_url: null,
    profiles: mapProfile(source.profiles),
  };
};

const mapAlbumDetails = (row: unknown): AlbumDetailsWithCreator | null => {
  if (!row || typeof row !== "object") return null;
  const source = row as Record<string, unknown>;
  const id = source.id;
  const createdAt = source.created_at;
  const userId = source.user_id;
  if (typeof id !== "string" || typeof createdAt !== "string" || typeof userId !== "string") {
    return null;
  }

  const privacyRaw = source.privacy;
  const privacy: Album["privacy"] = privacyRaw === "public" ? "public" : "private";

  return {
    id,
    title: typeof source.title === "string" ? source.title : "",
    description: typeof source.description === "string" ? source.description : null,
    created_at: createdAt,
    privacy,
    user_id: userId,
    cover_url: typeof source.cover_url === "string" ? source.cover_url : null,
    signed_cover_url: null,
    profiles: mapProfile(source.profiles),
  };
};

const createSignedUrlMap = async (
  supabase: SupabaseClient,
  paths: string[],
  expiresIn: number = 60 * 60
) => {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  if (uniquePaths.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.storage
    .from(ALBUM_IMAGES_BUCKET)
    .createSignedUrls(uniquePaths, expiresIn);

  if (error) {
    console.error('Failed to create signed URLs', error);
    return new Map<string, string>();
  }

  const map = new Map<string, string>();
  for (const item of data ?? []) {
    if (!item || typeof item !== 'object') continue;
    const path = (item as { path?: unknown }).path;
    const signedUrl = (item as { signedUrl?: unknown }).signedUrl;
    if (typeof path === 'string' && typeof signedUrl === 'string') {
      map.set(path, signedUrl);
    }
  }
  return map;
};

const attachCoverSignedUrls = async (
  supabase: SupabaseClient,
  albums: AlbumPreview[]
): Promise<AlbumPreview[]> => {
  if (albums.length === 0) {
    return albums;
  }

  const covers = albums.map((album) => {
    const images = album.album_images ?? [];
    const preferred = images.find((image) => image.display_order === 0) ?? images[0];
    return {
      album,
      coverPath: preferred?.storage_path ?? null,
    };
  });

  const allCoverPaths = covers
    .map(({ coverPath }) => coverPath)
    .filter((path): path is string => Boolean(path));

  const signedMap = await createSignedUrlMap(supabase, allCoverPaths);
  const storage = supabase.storage.from(ALBUM_IMAGES_BUCKET);

  return covers.map(({ album, coverPath }) => {
    if (!coverPath) {
      return { ...album, cover_signed_url: null };
    }

    const isPublic = album.privacy === "public";
    const publicUrl = isPublic ? getPublicUrlForPath(storage, coverPath) : null;
    const fallbackSignedUrl = signedMap.get(coverPath) ?? null;

    return {
      ...album,
      cover_signed_url: publicUrl ?? fallbackSignedUrl,
    };
  });
};

export const albumService = {
  // Public albums with creator profile (landing)
  async getPublicAlbumsWithCreators(): Promise<AlbumPreview[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('albums')
      .select('id, title, description, created_at, privacy, user_id, album_images(storage_path, display_order), profiles:profiles!albums_user_id_fkey(id, username, full_name)')
      .eq('privacy', 'public')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const albums = (data ?? [])
      .map(mapAlbumPreview)
      .filter((album): album is AlbumPreview => album !== null);

    return attachCoverSignedUrls(supabase, albums);
  },
  // Get all albums for a user
  async getUserAlbumsWithCreators(userId: string): Promise<AlbumPreview[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('albums')
      .select('id, title, description, created_at, privacy, user_id, album_images(storage_path, display_order), profiles:profiles!albums_user_id_fkey(id, username, full_name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    const albums = (data ?? [])
      .map(mapAlbumPreview)
      .filter((album): album is AlbumPreview => album !== null);

    return attachCoverSignedUrls(supabase, albums);
  },

  // Get single album with images
  async getAlbumWithImages(albumId: string): Promise<{ album: Album; images: AlbumImage[] }> {
    const supabase = getSupabaseClient();
    const [albumResponse, imagesResponse] = await Promise.all([
      supabase.from('albums').select('*').eq('id', albumId).single(),
      supabase.from('album_images').select('*').eq('album_id', albumId),
    ]);

    if (albumResponse.error) throw albumResponse.error;
    if (imagesResponse.error) throw imagesResponse.error;

    const album = albumResponse.data as Album;
    const imageRows = (imagesResponse.data ?? []) as AlbumImage[];
    const storage = supabase.storage.from(ALBUM_IMAGES_BUCKET);
    const allPaths = [
      ...imageRows.map((img) => img.storage_path),
      album.cover_url ?? '',
    ].filter(Boolean);
    const signedMap = await createSignedUrlMap(supabase, allPaths);
    const isPublicAlbum = album.privacy === 'public';

    const resolveUrl = (
      path: string | null | undefined,
      existing?: string | null
    ): string | null => {
      if (!path) {
        return existing ?? null;
      }

      if (isPublicAlbum) {
        const publicUrl = getPublicUrlForPath(storage, path);
        if (publicUrl) {
          return publicUrl;
        }
      }

      return signedMap.get(path) ?? existing ?? null;
    };

    const imagesWithUrls = imageRows.map((image) => ({
      ...image,
      url: resolveUrl(image.storage_path, image.url ?? null),
    }));

    const coverUrl = resolveUrl(album.cover_url ?? null, album.signed_cover_url ?? null);

    return {
      album: { ...album, signed_cover_url: coverUrl },
      images: imagesWithUrls,
    };
  },

  // Get single album with images and creator profile
  async getAlbumWithImagesAndCreator(albumId: string): Promise<{ album: AlbumDetailsWithCreator; images: AlbumImageRow[] }> {
    const supabase = getSupabaseClient();
    const { data: album, error } = await supabase
      .from('albums')
      .select('id, title, description, created_at, privacy, user_id, cover_url, profiles:profiles!albums_user_id_fkey(id, username, full_name)')
      .eq('id', albumId)
      .single();
    if (error) throw error;

    const { data: images, error: imagesError } = await supabase
      .from('album_images')
      .select('storage_path, display_order')
      .eq('album_id', albumId);
    if (imagesError) throw imagesError;

    const mappedAlbum = mapAlbumDetails(album);
    if (!mappedAlbum) {
      throw new Error("Failed to load album metadata");
    }

    const imageRows = mapAlbumImages(images ?? []);
    const allPaths = [
      ...imageRows.map((img) => img.storage_path),
      mappedAlbum.cover_url ?? '',
    ].filter(Boolean);
    const signedMap = await createSignedUrlMap(supabase, allPaths);
    const storage = supabase.storage.from(ALBUM_IMAGES_BUCKET);
    const isPublicAlbum = mappedAlbum.privacy === 'public';

    const resolveUrl = (
      path: string | null | undefined,
      existing?: string | null
    ): string | null => {
      if (!path) {
        return existing ?? null;
      }

      if (isPublicAlbum) {
        const publicUrl = getPublicUrlForPath(storage, path);
        if (publicUrl) {
          return publicUrl;
        }
      }

      return signedMap.get(path) ?? existing ?? null;
    };

    return {
      album: { ...mappedAlbum, signed_cover_url: resolveUrl(mappedAlbum.cover_url, mappedAlbum.signed_cover_url ?? null) },
      images: imageRows.map((img) => ({ ...img, url: resolveUrl(img.storage_path, img.url ?? null) })),
    };
  },

  // Create new album
  async createAlbum(albumData: CreateAlbumInput) {
    const supabase = getSupabaseClient();
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
    const supabase = getSupabaseClient();
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
    const supabase = getSupabaseClient();
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
    const supabase = getSupabaseClient();
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
    const supabase = getSupabaseClient();
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
