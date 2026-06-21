namespace TLC.API.DTOs;

// District DTOs
public class DistrictDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ShortForm { get; set; } = string.Empty;
}

public class CreateDistrictDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ShortForm { get; set; } = string.Empty;
}

// Block DTOs
public class BlockDto
{
    public int Id { get; set; }
    public int DistrictId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class CreateBlockDto
{
    public int DistrictId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

// Coach DTOs
public class CoachDto
{
    public int Id { get; set; }
    public int DistrictId { get; set; }
    public int BlockId { get; set; }
    public string EmpNo { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class CreateCoachDto
{
    public int DistrictId { get; set; }
    public int BlockId { get; set; }
    public string EmpNo { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

// Teacher DTOs
public class TeacherDto
{
    public int Id { get; set; }
    public string TeacherCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string School { get; set; } = string.Empty;
    public int DistrictId { get; set; }
    public int BlockId { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsTipTeacher { get; set; }
    public int? YearsInTip { get; set; }
    public int? CoachId { get; set; }
    public DateTime RegisteredDate { get; set; }
}

public class CreateTeacherDto
{
    public string Name { get; set; } = string.Empty;
    public string School { get; set; } = string.Empty;
    public int DistrictId { get; set; }
    public int BlockId { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsTipTeacher { get; set; }
    public int? YearsInTip { get; set; }
    public int? CoachId { get; set; }
}

// TLC Group DTOs
public class TLCGroupDto
{
    public int Id { get; set; }
    public string TlcGroupCode { get; set; } = string.Empty;
    public int DistrictId { get; set; }
    public int BlockId { get; set; }
    public string Location { get; set; } = string.Empty;
    public DateTime DateFormed { get; set; }
    public int TeacherLeaderId { get; set; }
}

public class CreateTLCGroupDto
{
    public int DistrictId { get; set; }
    public int BlockId { get; set; }
    public string Location { get; set; } = string.Empty;
    public DateTime DateFormed { get; set; }
    public int TeacherLeaderId { get; set; }
    public string GroupShortForm { get; set; } = string.Empty;
}

// TLC Member DTOs
public class TLCMemberDto
{
    public int Id { get; set; }
    public int TlcGroupId { get; set; }
    public int TeacherId { get; set; }
    public DateTime MembershipDate { get; set; }
}

public class CreateTLCMemberDto
{
    public int TlcGroupId { get; set; }
    public int TeacherId { get; set; }
    public DateTime MembershipDate { get; set; }
}

// TLC & Masterclass DTOs
public class TLCAndMasterclassDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int? TlcGroupId { get; set; }
    public int? DistrictId { get; set; }
    public int? BlockId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? DateConducted { get; set; }
    public string LocationConducted { get; set; } = string.Empty;
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public int? LedBy { get; set; }
    public string Topic { get; set; } = string.Empty;
    public int TotalAttendance { get; set; }
    public string Remarks { get; set; } = string.Empty;
}

public class CreateTLCAndMasterclassDto
{
    public string Type { get; set; } = string.Empty;
    public int? TlcGroupId { get; set; }
    public int? DistrictId { get; set; }
    public int? BlockId { get; set; }
    public string Status { get; set; } = "Planned";
    public DateTime? DateConducted { get; set; }
    public string LocationConducted { get; set; } = string.Empty;
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public int? LedBy { get; set; }
    public string Topic { get; set; } = string.Empty;
    public string Remarks { get; set; } = string.Empty;
}

// TLC Attendance DTOs
public class TLCAttendanceDto
{
    public int Id { get; set; }
    public int TlcOrMasterclassId { get; set; }
    public int TeacherId { get; set; }
    public DateTime AttendanceDate { get; set; }
}

public class CreateTLCAttendanceDto
{
    public int TlcOrMasterclassId { get; set; }
    public int TeacherId { get; set; }
    public DateTime AttendanceDate { get; set; }
}

// User DTOs
public class UserDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public int? DistrictId { get; set; }
    public int? BlockId { get; set; }
    public bool IsActive { get; set; }
}

public class CreateUserDto
{
    public string AzureAadId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public int? DistrictId { get; set; }
    public int? BlockId { get; set; }
}

// Auth DTOs
public class LoginRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserDto User { get; set; } = new();
}

// Bulk Upload DTOs
public class BulkUploadRequest
{
    public string MasterType { get; set; } = string.Empty; // TLCGroup, Teacher, Coach, TeacherLeader, TLCAndMasterclass
    public IFormFile File { get; set; } = null!;
}

public class BulkUploadResponse
{
    public bool Success { get; set; }
    public int SuccessCount { get; set; }
    public int ErrorCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}

// Dashboard DTOs
public class DashboardKpiDto
{
    public int TlcGroupsFormed { get; set; }
    public int TeacherLeaders { get; set; }
    public int TlcMembers { get; set; }
    public int TlcMeetsPlanned { get; set; }
    public int TlcMeetsConducted { get; set; }
    public int TlcsCancelled { get; set; }
    public int MasterclassesHeld { get; set; }
}

// Attendance Entry DTOs
public class TLCAttendanceEntryDto
{
    public int TlcGroupId { get; set; }
    public DateTime TlcDate { get; set; }
    public string Location { get; set; } = string.Empty;
    public int LeadBy { get; set; }
    public string Topic { get; set; } = string.Empty;
    public string Remarks { get; set; } = string.Empty;
    public List<AttendeeDto> Attendees { get; set; } = new();
}

public class AttendeeDto
{
    public int? TeacherId { get; set; } // If existing teacher
    public string? TeacherName { get; set; } // If new teacher
    public string? School { get; set; }
    public string? Gender { get; set; }
    public string? Mobile { get; set; }
    public string? Email { get; set; }
    public bool IsTipTeacher { get; set; }
    public int? YearsInTip { get; set; }
    public int? CoachId { get; set; }
}

public class MasterclassAttendanceEntryDto
{
    public DateTime MasterclassDate { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public int LeadBy { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string Remarks { get; set; } = string.Empty;
    public List<AttendeeDto> Attendees { get; set; } = new();
}
