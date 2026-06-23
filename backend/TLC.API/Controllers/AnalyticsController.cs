using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TLC.API.DTOs;
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
    public async Task<ActionResult<DashboardKpiDto>> GetDashboardKpis(int? districtId = null, int? blockId = null)
    {
        try
        {
            var tlcGroups = await _unitOfWork.TLCGroups.GetAll();
            var teachers = await _unitOfWork.Teachers.GetAll();
            var tlcMembers = await _unitOfWork.TLCMembers.GetAll();
            var tlcAndMasterclasses = await _unitOfWork.TLCAndMasterclasses.GetAll();

            // Apply filters
            if (districtId.HasValue)
            {
                tlcGroups = tlcGroups.Where(g => g.DistrictId == districtId);
                tlcAndMasterclasses = tlcAndMasterclasses.Where(t => t.DistrictId == districtId || t.Type == "Masterclass");
            }

            if (blockId.HasValue)
            {
                tlcGroups = tlcGroups.Where(g => g.BlockId == blockId);
                tlcAndMasterclasses = tlcAndMasterclasses.Where(t => t.BlockId == blockId || t.Type == "Masterclass");
            }

            var groupIds = tlcGroups.Select(g => g.Id).ToList();
            var groupMembers = tlcMembers.Where(m => groupIds.Contains(m.TlcGroupId));

            var kpis = new DashboardKpiDto
            {
                TlcGroupsFormed = tlcGroups.Count(),
                TeacherLeaders = tlcGroups.Count(),
                TlcMembers = groupMembers.Count(),
                TlcMeetsPlanned = tlcAndMasterclasses.Count(t => t.Type == "TLC" && t.Status == "Planned"),
                TlcMeetsConducted = tlcAndMasterclasses.Count(t => t.Type == "TLC" && t.Status == "Conducted"),
                TlcsCancelled = tlcAndMasterclasses.Count(t => t.Type == "TLC" && t.Status == "Cancelled"),
                MasterclassesHeld = tlcAndMasterclasses.Count(t => t.Type == "Masterclass" && t.Status == "Conducted")
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
                .GroupBy(t => t.DateConducted.Value.Year)
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
}
