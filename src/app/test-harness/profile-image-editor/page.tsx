import { notFound } from "next/navigation";

import { ProfileImageEditorHarness } from "./profile-image-editor-harness";

export const dynamic = "force-dynamic";

export default function ProfileImageEditorTestPage() {
  if (process.env.PROFILE_IMAGE_EDITOR_TEST_HARNESS !== "1") notFound();
  return <ProfileImageEditorHarness />;
}
