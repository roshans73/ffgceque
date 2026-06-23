using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TLC.API.DTOs;
using TLC.Core.Models;
using TLC.Core.Services;

namespace TLC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICodeGeneratorService _codeGenerator;
    private readonly ILogger<AttendanceController> _logger;

    public AttendanceController(
        IUnitOfWork unitOfWork,
        ICodeGeneratorService codeGenerator,
        ILogger<AttendanceController> logger)
    {
        _unitOfWork = unitOfWork;
        _codeGenerator = codeGenerator;
        _logger = logger;
    }

    [HttpPost("tlc")]
    [Authorize(Roles = "TLCManager")]
    public async Task<IActionResult> RecordTLCAttendance([FromBody] TLCAttendanceEntryDto dto)
    {
        if (dto.Attendees.Count == 0)
            return BadRequest("No attendees provided");

        try
        {
            await _unitOfWork.BeginTransactionAsync();

            // Validate TLC Group exists
            var tlcGroup = await _unitOfWork.TLCGroups.GetById(dto.TlcGroupId);
            if (tlcGroup == null)
                return BadRequest("TLC Group not found");

            // Process each attendee
            var attendanceRecords = new List<TLCAttendance>();
            var newTeachers = new List<Teacher>();

            foreach (var attendee in dto.Attendees)
            {
                int teacherId;

                if (attendee.TeacherId.HasValue)
                {
                    // Existing teacher
                    teacherId = attendee.TeacherId.Value;
                }
                else
                {
                    // New teacher - register them
                    if (string.IsNullOrWhiteSpace(attendee.TeacherName))
                        return BadRequest("Teacher name is required for new teachers");

                    var newTeacher = new Teacher
                    {
                        TeacherCode = await _codeGenerator.GenerateTeacherCodeAsync(tlcGroup.DistrictId),
                        Name = attendee.TeacherName,
                        School = attendee.School ?? "",
                        DistrictId = tlcGroup.DistrictId,
                        BlockId = tlcGroup.BlockId,
                        Gender = attendee.Gender ?? "",
                        Mobile = attendee.Mobile ?? "",
                        Email = attendee.Email ?? "",
                        IsTipTeacher = attendee.IsTipTeacher,
                        YearsInTip = attendee.YearsInTip,
                        CoachId = attendee.CoachId,
                        RegisteredDate = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _unitOfWork.Teachers.Add(newTeacher);
                    // Note: We need to save first to get the ID, so we'll save individually for new teachers
                    await _unitOfWork.SaveChangesAsync();
                    newTeachers.Add(newTeacher);
                    teacherId = newTeacher.Id;

                    // Add to TLC Members if not already there
                    var existingMember = (await _unitOfWork.TLCMembers.GetAll())
                        .FirstOrDefault(m => m.TlcGroupId == dto.TlcGroupId && m.TeacherId == teacherId);

                    if (existingMember == null)
                    {
                        var member = new TLCMember
                        {
                            TlcGroupId = dto.TlcGroupId,
                            TeacherId = teacherId,
                            MembershipDate = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _unitOfWork.TLCMembers.Add(member);
                    }
                }

                // Create attendance record
                var attendance = new TLCAttendance
                {
                    TlcOrMasterclassId = 0, // Will be set after creating TLC/Masterclass record
                    TeacherId = teacherId,
                    AttendanceDate = dto.TlcDate,
                    CreatedAt = DateTime.UtcNow
                };

                attendanceRecords.Add(attendance);
            }

            // Create or update TLC & Masterclass record
            var existingTLC = (await _unitOfWork.TLCAndMasterclasses.GetAll())
                .FirstOrDefault(t => t.TlcGroupId == dto.TlcGroupId &&
                    t.DateConducted == dto.TlcDate &&
                    t.Type == "TLC");

            TLCAndMasterclass tlcRecord;
            if (existingTLC != null)
            {
                tlcRecord = existingTLC;
                tlcRecord.Status = "Conducted";
                tlcRecord.LocationConducted = dto.Location;
                tlcRecord.LedBy = dto.LeadBy;
                tlcRecord.Topic = dto.Topic;
                tlcRecord.Remarks = dto.Remarks;
                tlcRecord.TotalAttendance = attendanceRecords.Count;
                tlcRecord.UpdatedAt = DateTime.UtcNow;
                await _unitOfWork.TLCAndMasterclasses.Update(tlcRecord);
            }
            else
            {
                tlcRecord = new TLCAndMasterclass
                {
                    Code = "", // Code can be set based on TLC codification if needed
                    Type = "TLC",
                    TlcGroupId = dto.TlcGroupId,
                    DistrictId = tlcGroup.DistrictId,
                    BlockId = tlcGroup.BlockId,
                    Status = "Conducted",
                    DateConducted = dto.TlcDate,
                    LocationConducted = dto.Location,
                    LedBy = dto.LeadBy,
                    Topic = dto.Topic,
                    TotalAttendance = attendanceRecords.Count,
                    Remarks = dto.Remarks,
                    CreatedAt = DateTime.UtcNow
                };
                await _unitOfWork.TLCAndMasterclasses.Add(tlcRecord);
                await _unitOfWork.SaveChangesAsync();
            }

            // Update attendance records with TLC/Masterclass ID
            foreach (var record in attendanceRecords)
            {
                record.TlcOrMasterclassId = tlcRecord.Id;
                await _unitOfWork.TLCAttendances.Add(record);
            }

            await _unitOfWork.SaveChangesAsync();
            await _unitOfWork.CommitTransactionAsync();

            return Ok(new { message = "TLC attendance recorded successfully", tlcId = tlcRecord.Id });
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackTransactionAsync();
            _logger.LogError(ex, "Error recording TLC attendance");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while recording attendance" });
        }
    }

    [HttpPost("masterclass")]
    [Authorize(Roles = "SustainabilityLead")]
    public async Task<IActionResult> RecordMasterclassAttendance([FromBody] MasterclassAttendanceEntryDto dto)
    {
        if (dto.Attendees.Count == 0)
            return BadRequest("No attendees provided");

        try
        {
            await _unitOfWork.BeginTransactionAsync();

            // Process attendees
            var attendanceRecords = new List<TLCAttendance>();
            var newTeachers = new List<Teacher>();

            foreach (var attendee in dto.Attendees)
            {
                int teacherId;

                if (attendee.TeacherId.HasValue)
                {
                    teacherId = attendee.TeacherId.Value;
                }
                else
                {
                    if (string.IsNullOrWhiteSpace(attendee.TeacherName))
                        return BadRequest("Teacher name is required for new teachers");

                    var newTeacher = new Teacher
                    {
                        TeacherCode = await _codeGenerator.GenerateTeacherCodeAsync(0),
                        Name = attendee.TeacherName,
                        School = attendee.School ?? "",
                        DistrictId = 0, // Masterclasses don't have district/block
                        BlockId = 0,
                        Gender = attendee.Gender ?? "",
                        Mobile = attendee.Mobile ?? "",
                        Email = attendee.Email ?? "",
                        IsTipTeacher = attendee.IsTipTeacher,
                        YearsInTip = attendee.YearsInTip,
                        CoachId = attendee.CoachId,
                        RegisteredDate = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _unitOfWork.Teachers.Add(newTeacher);
                    await _unitOfWork.SaveChangesAsync();
                    newTeachers.Add(newTeacher);
                    teacherId = newTeacher.Id;
                }

                var attendance = new TLCAttendance
                {
                    TlcOrMasterclassId = 0,
                    TeacherId = teacherId,
                    AttendanceDate = dto.MasterclassDate,
                    CreatedAt = DateTime.UtcNow
                };

                attendanceRecords.Add(attendance);
            }

            // Create Masterclass record
            var masterclassCode = await _codeGenerator.GenerateMasterclassCodeAsync();
            var masterclass = new TLCAndMasterclass
            {
                Code = masterclassCode,
                Type = "Masterclass",
                Status = "Conducted",
                DateConducted = dto.MasterclassDate,
                LocationConducted = dto.Location,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                LedBy = dto.LeadBy,
                Topic = dto.Topic,
                TotalAttendance = attendanceRecords.Count,
                Remarks = dto.Remarks,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.TLCAndMasterclasses.Add(masterclass);
            await _unitOfWork.SaveChangesAsync();

            // Update attendance records with Masterclass ID
            foreach (var record in attendanceRecords)
            {
                record.TlcOrMasterclassId = masterclass.Id;
                await _unitOfWork.TLCAttendances.Add(record);
            }

            await _unitOfWork.SaveChangesAsync();
            await _unitOfWork.CommitTransactionAsync();

            return Ok(new { message = "Masterclass attendance recorded successfully", masterclassId = masterclass.Id, masterclassCode = masterclass.Code });
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackTransactionAsync();
            _logger.LogError(ex, "Error recording masterclass attendance");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while recording attendance" });
        }
    }
}
