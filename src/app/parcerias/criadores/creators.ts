export type FoundingCreator = {
  name: string;
  handle: string;
  photo: string;
  profileUrl: string;
  publicationAuthorized: boolean;
};

// Add real, confirmed creators here, using local photos and authorized profile URLs.
// The section only appears once at least three creators authorize publication.
export const foundingCreators: FoundingCreator[] = [];

export const minimumVisibleCreators = 3;
