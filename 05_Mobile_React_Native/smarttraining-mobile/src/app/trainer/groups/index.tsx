import { Href, router } from "expo-router";

import TrainerGroupsScreen from "../../../screens/trainer/TrainerGroupsScreen";

export default function TrainerGroupsRoute() {
  return (
    <TrainerGroupsScreen
      onOpenGroup={(groupId) =>
        router.push(
          `/trainer/groups/${groupId}` as Href,
        )
      }
    />
  );
}