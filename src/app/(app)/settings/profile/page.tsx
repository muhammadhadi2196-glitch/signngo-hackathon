import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileSettingsClient } from "@/components/settings/ProfileSettingsClient";

export const metadata = {
  title: "Profile — signNGO",
};

export default async function ProfileSettingsPage() {
  const { authUser, profile } = await requireUser().catch(() => {
    redirect("/login");
    return Promise.reject();
  });

  return (
    <ProfileSettingsClient
      email={authUser.email ?? ""}
      name={profile.name}
    />
  );
}
