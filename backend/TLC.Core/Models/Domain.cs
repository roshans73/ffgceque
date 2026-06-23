namespace TLC.Core.Models;

public class District
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ShortForm { get; set; } = string.Empty;
}

public class Block
{
    public int Id { get; set; }
    public int DistrictId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public District? District { get; set; }
}

public class Coach
{
    public int Id { get; set; }
    public int DistrictId { get; set; }
    public int BlockId { get; set; }
    public string EmpNo { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public District? District { get; set; }
    public Block? Block { get; set; }
}

public class Teacher
{
    public int Id { get; set; }
    public string TeacherCode { get; set; } = string.Empty; // Tnnn format
    public string Name { get; set; } = string.Empty;
    public string School { get; set; } = string.Empty;
    public int DistrictId { get; set; }
    public int BlockId { get; set; }
    public string Gender { get; set; } = string.Empty; // M/F
    public string Mobile { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsTipTeacher { get; set; }
    public int? YearsInTip { get; set; }
    public int? CoachId { get; set; }
    public DateTime RegisteredDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public District? District { get; set; }
    public Block? Block { get; set; }
    public Coach? Coach { get; set; }
}

public class TLCGroup
{
    public int Id { get; set; }
    public string TlcGroupCode { get; set; } = string.Empty; // XXnn-YY format
    public int DistrictId { get; set; }
    public int BlockId { get; set; }
    public string Location { get; set; } = string.Empty;
    public DateTime DateFormed { get; set; }
    public int TeacherLeaderId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public District? District { get; set; }
    public Block? Block { get; set; }
    public Teacher? TeacherLeader { get; set; }
    public ICollection<TLCMember> Members { get; set; } = new List<TLCMember>();
    public ICollection<TLCAndMasterclass> TLCs { get; set; } = new List<TLCAndMasterclass>();
}

public class TeacherLeader
{
    public int Id { get; set; }
    public int TlcGroupId { get; set; }
    public int TeacherId { get; set; }
    public DateTime CreatedAt { get; set; }
    public TLCGroup? TLCGroup { get; set; }
    public Teacher? Teacher { get; set; }
}

public class TLCMember
{
    public int Id { get; set; }
    public int TlcGroupId { get; set; }
    public int TeacherId { get; set; }
    public DateTime MembershipDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public TLCGroup? TLCGroup { get; set; }
    public Teacher? Teacher { get; set; }
}

public class TLCAndMasterclass
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty; // XXnn-YY for TLC, MSnnn for Masterclass
    public string Type { get; set; } = string.Empty; // TLC or Masterclass
    public int? TlcGroupId { get; set; }
    public int? DistrictId { get; set; }
    public int? BlockId { get; set; }
    public string Status { get; set; } = "Planned"; // Planned, Conducted, Cancelled
    public DateTime? DateConducted { get; set; }
    public string LocationConducted { get; set; } = string.Empty;
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public int? LedBy { get; set; } // TeacherId
    public string Topic { get; set; } = string.Empty;
    public int TotalAttendance { get; set; }
    public string Remarks { get; set; } = string.Empty; // Reason for cancellation
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public TLCGroup? TLCGroup { get; set; }
    public District? District { get; set; }
    public Block? Block { get; set; }
    public Teacher? LeadByTeacher { get; set; }
    public ICollection<TLCAttendance> AttendanceRecords { get; set; } = new List<TLCAttendance>();
}

public class TLCAttendance
{
    public int Id { get; set; }
    public int TlcOrMasterclassId { get; set; }
    public int TeacherId { get; set; }
    public DateTime AttendanceDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public TLCAndMasterclass? TLCOrMasterclass { get; set; }
    public Teacher? Teacher { get; set; }
}

public class Role
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class User
{
    public int Id { get; set; }
    public string AzureAadId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public int? DistrictId { get; set; }
    public int? BlockId { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Role? Role { get; set; }
    public District? District { get; set; }
    public Block? Block { get; set; }
}

public class AuditLog
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Action { get; set; } = string.Empty; // Create, Update, Delete
    public string EntityType { get; set; } = string.Empty; // Name of the entity modified
    public int? EntityId { get; set; }
    public string OldValues { get; set; } = string.Empty; // JSON serialized
    public string NewValues { get; set; } = string.Empty; // JSON serialized
    public DateTime CreatedAt { get; set; }
    public User? User { get; set; }
}

public class UploadLog
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string MasterType { get; set; } = string.Empty; // TLCGroup, Teacher, Coach, etc.
    public string FileName { get; set; } = string.Empty;
    public int SuccessCount { get; set; }
    public int ErrorCount { get; set; }
    public string ErrorDetails { get; set; } = string.Empty; // JSON array
    public DateTime UploadedAt { get; set; }
    public User? User { get; set; }
}
