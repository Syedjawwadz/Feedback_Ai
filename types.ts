
export type ContentSource = 'reddit' | 'newsletter';

export interface ContentItem {
  id: string;
  source: ContentSource;
  title: string;
  excerpt: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  isSaved: boolean;
}

export interface Hook {
  id: string;
  contentItemId: string;
  text: string;
}

export enum NavTab {
  FEED = 'feed',
  SAVED = 'saved'
}
