using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TLC.API.DTOs;
using TLC.Core.Models;
using TLC.Core.Services;

namespace TLC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(IUnitOfWork unitOfWork, ILogger<AnalyticsController> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardKpiDto>> GetDashboardKpis(
        int? districtId = null,
        int? blockId = null,
        DateTime? startDate = null,
        DateTime? endDate = null)
    {
        try
        {
            if (startDate.HasValue && endDate.HasValue && endDate.Value.Date < startDate.Value.Date)
                return BadRequest(new { message = "End date must be on or after start date" });

            var tlcGroups = (await _unitOfWork.TLCGroups.GetAll()).ToList();
            var teachers = (await _unitOfWork.Teachers.GetAll()).ToList();
            var tlcMembers = (await _unitOfWork.TLCMembers.GetAll()).ToList();
            var tlcAndMasterclasses = (await _unitOfWork.TLCAndMasterclasses.GetAll()).ToList();
            var attendances = (await _unitOfWork.TLCAttendances.GetAll()).ToList();

            var rangeStart = startDate?.Date;
            var rangeEnd = endDate?.Date;
            var groupsById = tlcGroups.ToDictionary(g => g.Id);
            var teachersById = teachers.ToDictionary(t => t.Id);
            var attendancesByEvent = attendances
                .GroupBy(a => a.TlcOrMasterclassId)
                .ToDictionary(g => g.Key, g => g.ToList());

            bool IsInDateRange(DateTime? date)
            {
                if (!rangeStart.HasValue && !rangeEnd.HasValue)
                    return true;

                if (!date.HasValue)
                    return false;

                var value = date.Value.Date;
                return (!rangeStart.HasValue || value >= rangeStart.Value) &&
                       (!rangeEnd.HasValue || value <= rangeEnd.Value);
            }

            bool TeacherMatchesLocation(Teacher teacher)
            {
                return (!districtId.HasValue || teacher.DistrictId == districtId.Value) &&
                       (!blockId.HasValue || teacher.BlockId == blockId.Value);
            }

            bool GroupMatchesLocation(TLCGroup group)
            {
                return (!districtId.HasValue || group.DistrictId == districtId.Value) &&
                       (!blockId.HasValue || group.BlockId == blockId.Value);
            }

            bool EventHasAttendanceInLocation(TLCAndMasterclass record)
            {
                if (!attendancesByEvent.TryGetValue(record.Id, out var eventAttendances))
                    return false;

                return eventAttendances.Any(a =>
                    teachersById.TryGetValue(a.TeacherId, out var teacher) &&
                    TeacherMatchesLocation(teacher));
            }

            bool EventMatchesLocation(TLCAndMasterclass record)
            {
                if (!districtId.HasValue && !blockId.HasValue)
                    return true;

                int? eventDistrictId = record.DistrictId;
                int? eventBlockId = record.BlockId;

                if (record.TlcGroupId.HasValue &&
                    groupsById.TryGetValue(record.TlcGroupId.Value, out var group))
                {
                    eventDistrictId ??= group.DistrictId;
                    eventBlockId ??= group.BlockId;
                }

                var eventLocationMatches =
                    (!districtId.HasValue || eventDistrictId == districtId.Value) &&
                    (!blockId.HasValue || eventBlockId == blockId.Value);

                if (record.Type == "Masterclass")
                    return eventLocationMatches || EventHasAttendanceInLocation(record);

                return eventLocationMatches;
            }

            var groupsInLocation = tlcGroups
                .Where(GroupMatchesLocation)
                .ToList();
            var groupIdsInLocation = groupsInLocation
                .Select(g => g.Id)
                .ToHashSet();
            var groupsInSelectedRange = groupsInLocation
                .Where(g => IsInDateRange(g.DateFormed))
                .ToList();

            var membersInLocation = tlcMembers
                .Where(m => groupIdsInLocation.Contains(m.TlcGroupId))
                .ToList();
            var membersInSelectedRange = membersInLocation
                .Where(m => IsInDateRange(m.MembershipDate))
                .ToList();
            var memberTeacherIds = membersInSelectedRange
                .Select(m => m.TeacherId)
                .Distinct()
                .ToList();

            var filteredEvents = tlcAndMasterclasses
                .Where(t => IsInDateRange(t.DateConducted) && EventMatchesLocation(t))
                .ToList();
            var filteredTlcEvents = filteredEvents
                .Where(t => t.Type == "TLC")
                .ToList();
            var conductedTlcEvents = filteredTlcEvents
                .Where(t => t.Status == "Conducted")
                .ToList();
            var conductedTlcEventIds = conductedTlcEvents
                .Select(t => t.Id)
                .ToHashSet();
            var conductedMasterclassEvents = filteredEvents
                .Where(t => t.Type == "Masterclass" && t.Status == "Conducted")
                .ToList();
            var conductedMasterclassEventIds = conductedMasterclassEvents
                .Select(t => t.Id)
                .ToHashSet();

            var tlcAttendances = attendances
                .Where(a => conductedTlcEventIds.Contains(a.TlcOrMasterclassId))
                .Where(a => teachersById.TryGetValue(a.TeacherId, out var teacher) && TeacherMatchesLocation(teacher))
                .ToList();
            var tlcAttendanceCountsByTeacher = tlcAttendances
                .GroupBy(a => a.TeacherId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(a => a.TlcOrMasterclassId).Distinct().Count());
            var teachersAttendedAtLeastOneTlc = tlcAttendanceCountsByTeacher
                .Select(kvp => kvp.Key)
                .ToHashSet();

            var masterclassAttendances = attendances
                .Where(a => conductedMasterclassEventIds.Contains(a.TlcOrMasterclassId))
                .Where(a => teachersById.TryGetValue(a.TeacherId, out var teacher) && TeacherMatchesLocation(teacher))
                .ToList();

            var teachersWithMinimum3 = memberTeacherIds
                .Count(id => tlcAttendanceCountsByTeacher.TryGetValue(id, out var count) && count >= 3);
            var requiredTlcCountFor60Percent = conductedTlcEventIds.Count > 0
                ? (int)Math.Ceiling(conductedTlcEventIds.Count * 0.6)
                : 0;
            var uniqueTeachers60PercentOrMore = requiredTlcCountFor60Percent > 0
                ? memberTeacherIds.Count(id =>
                    tlcAttendanceCountsByTeacher.TryGetValue(id, out var count) &&
                    count >= requiredTlcCountFor60Percent)
                : 0;

            var attendanceReport = memberTeacherIds
                .Select(id =>
                {
                    teachersById.TryGetValue(id, out var teacher);
                    var tlcsAttended = tlcAttendanceCountsByTeacher.TryGetValue(id, out var count) ? count : 0;

                    return new AttendanceReportEntryDto
                    {
                        TeacherId = id,
                        TeacherName = teacher?.Name ?? string.Empty,
                        School = teacher?.School ?? string.Empty,
                        TlcsAttended = tlcsAttended,
                        PercentOfTotal = conductedTlcEventIds.Count > 0
                            ? tlcsAttended * 100.0 / conductedTlcEventIds.Count
                            : 0
                    };
                })
                .OrderByDescending(r => r.TlcsAttended)
                .ThenBy(r => r.TeacherName)
                .ToList();

            var kpis = new DashboardKpiDto
            {
                TlcGroupsFormed = groupsInSelectedRange.Count,
                TeacherLeaders = groupsInSelectedRange
                    .Select(g => g.TeacherLeaderId)
                    .Where(id => id > 0)
                    .Distinct()
                    .Count(),
                TlcMembers = membersInSelectedRange.Count,
                TlcMeetsPlanned = filteredTlcEvents.Count(t => t.Status == "Planned"),
                TlcMeetsConducted = conductedTlcEvents.Count,
                TlcsCancelled = filteredTlcEvents.Count(t => t.Status == "Cancelled"),
                MasterclassesHeld = conductedMasterclassEvents.Count,
                TipTeachersAttendedAtLeastOne = teachersAttendedAtLeastOneTlc.Count(id =>
                    teachersById.TryGetValue(id, out var teacher) && teacher.IsTipTeacher),
                NonTipTeachersAttendedAtLeastOne = teachersAttendedAtLeastOneTlc.Count(id =>
                    teachersById.TryGetValue(id, out var teacher) && !teacher.IsTipTeacher),
                TlcMeetsHeld = conductedTlcEvents.Count,
                PercentTeachersMin3 = memberTeacherIds.Count > 0
                    ? teachersWithMinimum3 * 100.0 / memberTeacherIds.Count
                    : 0,
                UniqueTeachers60PercentOrMore = uniqueTeachers60PercentOrMore,
                AvgTeachersPerMasterclass = conductedMasterclassEvents.Count > 0
                    ? conductedMasterclassEvents.Average(masterclass =>
                        masterclassAttendances.Count(a => a.TlcOrMasterclassId == masterclass.Id))
                    : 0,
                AttendanceReport = attendanceReport
            };

            return Ok(kpis);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard KPIs");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while retrieving dashboard data" });
        }
    }

    [HttpGet("yearend-summary")]
    public async Task<ActionResult> GetYearEndSummary(int? districtId = null, int? blockId = null, int? year = null)
    {
        try
        {
            var currentYear = year ?? DateTime.UtcNow.Year;
            var yearStart = new DateTime(currentYear, 1, 1);
            var yearEnd = new DateTime(currentYear + 1, 1, 1);

            var tlcAndMasterclasses = (await _unitOfWork.TLCAndMasterclasses.GetAll())
                .Where(t => t.DateConducted >= yearStart && t.DateConducted < yearEnd)
                .ToList();

            var attendances = (await _unitOfWork.TLCAttendances.GetAll())
                .Where(a => a.AttendanceDate >= yearStart && a.AttendanceDate < yearEnd)
                .ToList();

            if (districtId.HasValue)
                tlcAndMasterclasses = tlcAndMasterclasses.Where(t => t.DistrictId == districtId || t.Type == "Masterclass").ToList();

            if (blockId.HasValue)
                tlcAndMasterclasses = tlcAndMasterclasses.Where(t => t.BlockId == blockId || t.Type == "Masterclass").ToList();

            var tlcIds = tlcAndMasterclasses.Where(t => t.Type == "TLC").Select(t => t.Id).ToList();
            var masterclassIds = tlcAndMasterclasses.Where(t => t.Type == "Masterclass").Select(t => t.Id).ToList();

            var tlcAttendances = attendances.Where(a => tlcIds.Contains(a.TlcOrMasterclassId)).ToList();
            var masterclassAttendances = attendances.Where(a => masterclassIds.Contains(a.TlcOrMasterclassId)).ToList();

            // Calculate metrics
            var uniqueTeachers = tlcAttendances.Select(a => a.TeacherId).Distinct().ToList();
            var teacherAttendanceCounts = uniqueTeachers.ToDictionary(t => t, t => tlcAttendances.Count(a => a.TeacherId == t));
            var teachersWithMinimum3 = teacherAttendanceCounts.Count(kvp => kvp.Value >= 3);
            var teachersAttending60Percent = teacherAttendanceCounts.Count(kvp => kvp.Value >= tlcIds.Count * 0.6);

            var summary = new
            {
                Year = currentYear,
                PercentageTeachersAttending3OrMore = uniqueTeachers.Count > 0 ? (teachersWithMinimum3 * 100.0 / uniqueTeachers.Count) : 0,
                UniqueTeachersAttending60Percent = teachersAttending60Percent,
                AverageMasterclassAttendance = masterclassAttendances.Count > 0 ? masterclassAttendances.Count / (double)masterclassIds.Count : 0,
                TipTeachersAttendance = tlcAttendances.Join(
                    await _unitOfWork.Teachers.GetAll(),
                    ta => ta.TeacherId,
                    t => t.Id,
                    (ta, t) => new { ta, t }
                ).Where(x => x.t.IsTipTeacher).Select(x => x.ta.TeacherId).Distinct().Count(),
                NonTipTeachersAttendance = tlcAttendances.Join(
                    await _unitOfWork.Teachers.GetAll(),
                    ta => ta.TeacherId,
                    t => t.Id,
                    (ta, t) => new { ta, t }
                ).Where(x => !x.t.IsTipTeacher).Select(x => x.ta.TeacherId).Distinct().Count()
            };

            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting year-end summary");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while retrieving summary data" });
        }
    }

    [HttpGet("tlcgroup/{tlcGroupId}")]
    public async Task<ActionResult> GetTLCGroupReport(int tlcGroupId)
    {
        try
        {
            var tlcGroup = await _unitOfWork.TLCGroups.GetById(tlcGroupId);
            if (tlcGroup == null)
                return NotFound();

            var members = (await _unitOfWork.TLCMembers.GetAll())
                .Where(m => m.TlcGroupId == tlcGroupId)
                .ToList();

            var tlcs = (await _unitOfWork.TLCAndMasterclasses.GetAll())
                .Where(t => t.TlcGroupId == tlcGroupId && t.Type == "TLC")
                .ToList();

            var attendances = (await _unitOfWork.TLCAttendances.GetAll())
                .Where(a => tlcs.Select(t => t.Id).Contains(a.TlcOrMasterclassId))
                .ToList();

            var report = new
            {
                TlcGroupId = tlcGroupId,
                TlcGroupCode = tlcGroup.TlcGroupCode,
                TeachersPerGroup = members.Count,
                AverageAttendancePerTLC = tlcs.Count > 0 ? (double)tlcs.Sum(t => t.TotalAttendance) / tlcs.Count : 0,
                TLCsPlanned = tlcs.Count(t => t.Status == "Planned"),
                TLCsConducted = tlcs.Count(t => t.Status == "Conducted"),
                TLCsWithTarget = 10, // Fixed target of 10 per year
                AttendanceRecordCount = attendances.Count
            };

            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TLC group report");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while retrieving group report" });
        }
    }

    [HttpGet("longitudinal")]
    public async Task<ActionResult> GetLongitudinalAnalysis(int? districtId = null, int? blockId = null)
    {
        try
        {
            var tlcGroups = await _unitOfWork.TLCGroups.GetAll();
            var tlcAndMasterclasses = await _unitOfWork.TLCAndMasterclasses.GetAll();
            var tlcMembers = await _unitOfWork.TLCMembers.GetAll();
            var attendances = await _unitOfWork.TLCAttendances.GetAll();
            var teachers = await _unitOfWork.Teachers.GetAll();

            if (districtId.HasValue)
                tlcGroups = tlcGroups.Where(g => g.DistrictId == districtId);

            if (blockId.HasValue)
                tlcGroups = tlcGroups.Where(g => g.BlockId == blockId);

            var yearlyMetrics = tlcAndMasterclasses
                .Where(t => t.DateConducted.HasValue)
                .GroupBy(t => t.DateConducted.GetValueOrDefault().Year)
                .OrderBy(g => g.Key)
                .Select(group => new
                {
                    Year = group.Key,
                    TLCGroupsFormed = tlcGroups.Count(g => g.DateFormed.Year <= group.Key),
                    MeetsPlanned = group.Count(t => t.Type == "TLC" && t.Status == "Planned"),
                    MeetsConducted = group.Count(t => t.Type == "TLC" && t.Status == "Conducted"),
                    MasterclassesHeld = group.Count(t => t.Type == "Masterclass" && t.Status == "Conducted"),
                    MembersCount = tlcMembers.Count(m => tlcGroups.Select(g => g.Id).Contains(m.TlcGroupId))
                })
                .ToList();

            return Ok(new
            {
                YearlyMetrics = yearlyMetrics,
                AverageTLCsPerGroupPerYear = yearlyMetrics.Count > 0 ?
                    yearlyMetrics.Average(m => m.MeetsConducted / (double)Math.Max(m.TLCGroupsFormed, 1)) : 0
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting longitudinal analysis");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while retrieving analysis data" });
        }
    }

    [HttpGet("teacherleader-formation")]
    public async Task<ActionResult> GetTeacherLeaderFormationReport(int? districtId = null, int? blockId = null, string? format = null)
    {
        try
        {
            var teacherLeaders = (await _unitOfWork.TeacherLeaders.GetAll()).ToList();
            var tlcGroups = (await _unitOfWork.TLCGroups.GetAll()).ToList();
            var teachers = (await _unitOfWork.Teachers.GetAll()).ToList();
            var districts = (await _unitOfWork.Districts.GetAll()).ToList();
            var blocks = (await _unitOfWork.Blocks.GetAll()).ToList();

            if (districtId.HasValue)
            {
                tlcGroups = tlcGroups.Where(g => g.DistrictId == districtId).ToList();
            }

            if (blockId.HasValue)
            {
                tlcGroups = tlcGroups.Where(g => g.BlockId == blockId).ToList();
            }

            var groupIds = tlcGroups.Select(g => g.Id).ToHashSet();
            var reportRows = teacherLeaders
                .Where(tl => groupIds.Contains(tl.TlcGroupId))
                .Select(tl =>
                {
                    var group = tlcGroups.FirstOrDefault(g => g.Id == tl.TlcGroupId);
                    var teacher = teachers.FirstOrDefault(t => t.Id == tl.TeacherId);
                    var district = districts.FirstOrDefault(d => d.Id == group?.DistrictId);
                    var block = blocks.FirstOrDefault(b => b.Id == group?.BlockId);
                    return new
                    {
                        TeacherLeaderId = tl.Id,
                        TeacherId = tl.TeacherId,
                        TeacherName = teacher?.Name ?? string.Empty,
                        School = teacher?.School ?? string.Empty,
                        TlcGroupId = tl.TlcGroupId,
                        TlcGroupCode = group?.TlcGroupCode ?? string.Empty,
                        DateFormed = group?.DateFormed.ToString("yyyy-MM-dd") ?? string.Empty,
                        District = district?.Name ?? string.Empty,
                        Block = block?.Name ?? string.Empty,
                        TeacherLeaderCreatedAt = tl.CreatedAt.ToString("yyyy-MM-dd")
                    };
                })
                .OrderBy(r => r.DateFormed)
                .ThenBy(r => r.TeacherLeaderId)
                .ToList();

            if (string.Equals(format, "csv", StringComparison.OrdinalIgnoreCase))
            {
                var builder = new StringBuilder();
                builder.AppendLine("TeacherLeaderId,TeacherId,TeacherName,School,TlcGroupId,TlcGroupCode,DateFormed,District,Block,TeacherLeaderCreatedAt");

                foreach (var row in reportRows)
                {
                    string Escape(string value) => value?.Replace("\"", "\"\"") ?? string.Empty;
                    builder.AppendLine($"{row.TeacherLeaderId},{row.TeacherId},\"{Escape(row.TeacherName)}\",\"{Escape(row.School)}\",{row.TlcGroupId},\"{Escape(row.TlcGroupCode)}\",{row.DateFormed},\"{Escape(row.District)}\",\"{Escape(row.Block)}\",{row.TeacherLeaderCreatedAt}");
                }

                var csvBytes = Encoding.UTF8.GetBytes(builder.ToString());
                return File(csvBytes, "text/csv; charset=utf-8", "teacher-leader-formation.csv");
            }

            return Ok(reportRows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting teacher leader formation report");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while retrieving the teacher leader formation report" });
        }
    }
}
