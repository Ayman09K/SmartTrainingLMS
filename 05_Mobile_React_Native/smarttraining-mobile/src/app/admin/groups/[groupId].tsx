import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";

import ErrorMessage from "../../../components/ErrorMessage";
import ScreenContainer from "../../../components/ScreenContainer";
import AdminGroupDetailScreen from "../../../screens/admin/AdminGroupDetailScreen";

export default function AdminGroupDetailRoute() {
  const { groupId } =
    useLocalSearchParams<{ groupId: string }>();

  const parsedGroupId = Number(groupId);

  if (
    !Number.isFinite(parsedGroupId) ||
    parsedGroupId <= 0
  ) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message="Groupe invalide."
          onRetry={() =>
            router.replace("/admin/groups" as Href)
          }
        />
      </ScreenContainer>
    );
  }

  return (
    <AdminGroupDetailScreen
      groupId={parsedGroupId}
    />
  );
}
