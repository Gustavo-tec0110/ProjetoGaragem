/** Limites centralizados para proteger a experiência e os recursos da plataforma. */
export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_UPLOAD_MAX_WIDTH = 4096;
export const IMAGE_UPLOAD_MAX_HEIGHT = 4096;
export const IMAGE_UPLOAD_MAX_PIXELS = 16_000_000;
export const PROJECT_IMAGES_PER_PROJECT = 12;
export const USER_IMAGE_QUOTA_COUNT = 150;
export const USER_IMAGE_QUOTA_BYTES = 500 * 1024 * 1024;

export const PROJECT_REQUEST_MAX_BYTES = 512 * 1024;
export const UPLOAD_REQUEST_MAX_BYTES = IMAGE_UPLOAD_MAX_BYTES + 256 * 1024;
export const PROJECT_FORM_MAX_FIELDS = 80;
export const PROJECT_FORM_MAX_FIELD_LENGTH = 5_000;
export const PROJECT_FORM_MAX_JSON_LENGTH = 100_000;
export const PROJECTS_PER_USER = 25;
export const PROJECT_PARTS_MAX_ITEMS = 60;
export const PROJECT_UPDATES_MAX_ITEMS = 40;
export const PROJECT_EXPENSES_MAX_ITEMS = 100;

export const COMMENT_MAX_LENGTH = 1_000;
export const PROFILE_DISPLAY_NAME_MAX_LENGTH = 80;
export const PROFILE_CITY_MAX_LENGTH = 100;
export const PROFILE_SOCIAL_LINK_MAX_LENGTH = 240;
