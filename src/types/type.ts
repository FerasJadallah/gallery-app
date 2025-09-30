export type AlbumRow = {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  visibility: "public" | "private" | null;
  cover_url: string | null;
  created_at: string;
  updated_at?: string;
};

export type PhotoRow = {
  id: string;
  album_id: string;
  user_id: string;
  url: string;
  storage_path: string | null;
  caption: string | null;
  created_at: string;
  order?: number | null;
};
