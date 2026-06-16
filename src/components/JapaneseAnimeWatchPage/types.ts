export type SourceItem = {
  type?: string;
  server?: string;
  proxyUrl?: string;
  streamFormat?: string;
  idx?: number;
  tracks?: any[];
  rawStream?: any;
};

export type MediaCard = {
  id: string | number;
  title: string;
  subtitle?: string;
  image?: string;
  href?: string;
  score?: number;
  format?: string;
};
