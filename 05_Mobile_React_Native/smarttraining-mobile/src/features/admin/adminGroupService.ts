import {
  getTrainerGroup,
  getTrainerGroupMembers,
  getTrainerGroups,
} from "../trainer/trainerGroupService";
import type {
  TrainerLearnerGroup,
  TrainerLearnerGroupMember,
} from "../../types/trainerGroupMobile";

export async function getAdminGroups(): Promise<
  TrainerLearnerGroup[]
> {
  return getTrainerGroups();
}

export async function getAdminGroup(
  groupId: number,
): Promise<TrainerLearnerGroup> {
  return getTrainerGroup(groupId);
}

export async function getAdminGroupMembers(
  groupId: number,
): Promise<TrainerLearnerGroupMember[]> {
  return getTrainerGroupMembers(groupId);
}
