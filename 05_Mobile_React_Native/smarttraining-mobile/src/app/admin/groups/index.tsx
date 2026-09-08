import { Href, router } from "expo-router";

import AdminGroupsScreen from "../../../screens/admin/AdminGroupsScreen";

export default function AdminGroupsRoute() {
  return (
    <AdminGroupsScreen
      onOpenGroup={(groupId) =>
        router.push(
          `/admin/groups/${groupId}` as Href,
        )
      }
    />
  );
}
