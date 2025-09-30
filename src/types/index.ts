export type Album = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  createdAt: string;
  isPublic: boolean;
};

export type Photo = {
  id: string;
  albumId: string;
  url: string;
  caption?: string;
  createdAt: string;
};
