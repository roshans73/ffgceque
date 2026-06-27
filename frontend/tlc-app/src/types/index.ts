// Auth Types
export interface User {
  id: number;
  email: string;
  name: string;
  roleId: number;
  roleName: string;
  districtId?: number;
  blockId?: number;
  isActive: boolean;
}

// Master Data Types
export interface District {
  id: number;
  code: string;
  name: string;
  shortForm: string;
}

export interface Block {
  id: number;
  districtId: number;
  code: string;
  name: string;
}

export interface Coach {
  id: number;
  districtId: number;
  blockId: number;
  empNo: string;
  name: string;
}

export interface Teacher {
  id: number;
  teacherCode: string;
  name: string;
  school: string;
  districtId: number;
  blockId: number;
  gender: string;
  mobile: string;
  email: string;
  isTipTeacher: boolean;
  yearsInTip?: number;
  coachId?: number;
  registeredDate: string;
}

export interface TLCGroup {
  id: number;
  tlcGroupCode: string;
  districtId: number;
  blockId: number;
  location: string;
  dateFormed: string;
  teacherLeaderId: number;
}

export interface TLCAndMasterclass {
  id: number;
  code: string;
  type: 'TLC' | 'Masterclass';
  tlcGroupId?: number;
  districtId?: number;
  blockId?: number;
  status: 'Planned' | 'Conducted' | 'Cancelled';
  dateConducted?: string;
  locationConducted: string;
  startTime?: string;
  endTime?: string;
  ledBy?: number;
  topic: string;
  totalAttendance: number;
  remarks: string;
}

// Request/Response Types
export interface BulkUploadResponse {
  success: boolean;
  successCount: number;
  errorCount: number;
  errors: string[];
  message: string;
}

export interface DashboardKpis {
  districts: number;
  blocks: number;
  tlcGroupsFormed: number;
  teacherLeaders: number;
  tlcMembers: number;
  tlcMeetsPlanned: number;
  tlcMeetsConducted: number;
  tlcsCancelled: number;
  masterclassesHeld: number;
}

export interface AttendanceReportEntry {
  teacherId: number;
  teacherName: string;
  school?: string;
  tlcsAttended: number;
  percentOfTotal: number; // 0-100
}

// Extended KPIs requested by the Main Dashboard
export interface ExtendedDashboardKpis extends DashboardKpis {
  tipTeachersAttendedAtLeastOne: number;
  nonTipTeachersAttendedAtLeastOne: number;
  tlcMeetsHeld: number;
  percentTeachersMin3: number; // percent of teachers who have attended >=3
  uniqueTeachers60PercentOrMore: number;
  avgTeachersPerMasterclass: number;
  attendanceReport: AttendanceReportEntry[];
}

export interface AttendanceEntry {
  district: District;
  block: Block;
  tlcGroup: TLCGroup;
  date: string;
  location: string;
  topic: string;
  ledBy: Teacher;
  attendees: AttendeeEntry[];
}

export interface AttendeeEntry {
  teacherId?: number;
  teacherName?: string;
  school?: string;
  gender?: string;
  mobile?: string;
  email?: string;
  isTipTeacher: boolean;
  yearsInTip?: number;
  coachId?: number;
}

export interface TeacherLeaderFormation {
  teacherLeaderId: number;
  teacherId: number;
  teacherName: string;
  school: string;
  tlcGroupId: number;
  tlcGroupCode: string;
  dateFormed: string;
  district: string;
  block: string;
  teacherLeaderCreatedAt: string;
}
