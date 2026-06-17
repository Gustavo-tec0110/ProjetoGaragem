export type EssentialProjectProgressInput = {
  name: string | null | undefined;
  slug: string | null | undefined;
  brand: string | null | undefined;
  model: string | null | undefined;
  year: number | null | undefined;
  version: string | null | undefined;
  versionConfidence: string | null | undefined;
  city: string | null | undefined;
  state: string | null | undefined;
  description: string | null | undefined;
  tags: string[];
  isPublic: boolean;
  photoUrls: string[];
  engine: string | null | undefined;
  powerCv: number | null | undefined;
  fuelType: string | null | undefined;
  transmission: string | null | undefined;
  drivetrain: string | null | undefined;
  projectStatus: string | null | undefined;
  projectGoal: string | null | undefined;
};

function hasValue(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function hasVersionAnswer(version: string | null | undefined, versionConfidence: string | null | undefined) {
  return hasValue(version) || versionConfidence === "unknown";
}

export function calculateEssentialProjectProgress(input: EssentialProjectProgressInput) {
  const essentialChecks = [
    hasValue(input.name),
    hasValue(input.slug),
    hasValue(input.brand),
    hasValue(input.model),
    hasValue(input.year),
    hasVersionAnswer(input.version, input.versionConfidence),
    hasValue(input.city),
    hasValue(input.state),
    hasValue(input.description),
    input.tags.length > 0,
    input.isPublic,
    input.photoUrls.length > 0,
    hasValue(input.engine),
    hasValue(input.powerCv),
    hasValue(input.fuelType),
    hasValue(input.transmission),
    hasValue(input.drivetrain),
    hasValue(input.projectStatus),
    hasValue(input.projectGoal),
  ];

  const completed = essentialChecks.filter(Boolean).length;
  return Math.round((completed / essentialChecks.length) * 100);
}
