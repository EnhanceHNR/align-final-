import { redirect } from "next/navigation";

// This legacy page had no auth check at all (it queried and displayed every
// organization's name and user count to anyone who loaded the URL). The real,
// access-controlled version of this panel is /superadmin -- redirect there
// instead of trying to patch auth into a duplicate page.
export default function LegacyAdminRedirect() {
  redirect("/superadmin");
}
