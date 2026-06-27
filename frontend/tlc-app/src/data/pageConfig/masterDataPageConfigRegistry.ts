
import { coachesTableConfig }   from '../masterDataTableConfig/CoachesTableConfig';
import { teachersTableConfig }  from '../masterDataTableConfig/TeacherTableConfig';
import { tlcGroupsTableConfig } from '../masterDataTableConfig/TLCGroupsPageConfig';
import { districtsBlocksTableConfig } from '../masterDataTableConfig/DistrictsBlocksTableConfig';

export {
  coachesTableConfig,
  teachersTableConfig,
  tlcGroupsTableConfig,
districtsBlocksTableConfig
};

export const masterDataPageConfigs = {
  coaches:   coachesTableConfig,
  teachers:  teachersTableConfig,
  tlcgroups: tlcGroupsTableConfig,
  'districts-blocks': districtsBlocksTableConfig,      
} as const;

export type MasterDataPageKey = keyof typeof masterDataPageConfigs;