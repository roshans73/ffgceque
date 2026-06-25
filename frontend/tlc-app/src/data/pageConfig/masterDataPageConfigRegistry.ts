import { coachesTableConfig } from '../masterDataTableConfig/CoachesTableConfig';
import { teachersTableConfig } from '../masterDataTableConfig/TeacherTableConfig';
import { tlcGroupsTableConfig } from '../masterDataTableConfig/TLCGroupsPageConfig';

export { coachesTableConfig, teachersTableConfig, tlcGroupsTableConfig };

export const masterDataPageConfigs = {
  coaches: coachesTableConfig,
  teachers: teachersTableConfig,
  tlcgroups: tlcGroupsTableConfig,
} as const;

export type MasterDataPageKey = keyof typeof masterDataPageConfigs;