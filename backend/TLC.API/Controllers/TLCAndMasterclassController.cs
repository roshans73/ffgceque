using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TLC.API.DTOs;
using TLC.Core.Models;
using TLC.Core.Services;

namespace TLC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TLCAndMasterclassController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICodeGeneratorService _codeGenerator;

    public TLCAndMasterclassController(IUnitOfWork unitOfWork, ICodeGeneratorService codeGenerator)
    {
        _unitOfWork = unitOfWork;
        _codeGenerator = codeGenerator;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TLCAndMasterclassDto>>> GetAll(
        string? type = null,
        string? status = null,
        int? districtId = null,
        int? blockId = null,
        int? tlcGroupId = null,
        int? year = null)
    {
        var records = await _unitOfWork.TLCAndMasterclasses.GetAll();

        if (!string.IsNullOrWhiteSpace(type))
            records = records.Where(r => r.Type == type);

        if (!string.IsNullOrWhiteSpace(status))
            records = records.Where(r => r.Status == status);

        if (districtId.HasValue)
            records = records.Where(r => r.DistrictId == districtId);

        if (blockId.HasValue)
            records = records.Where(r => r.BlockId == blockId);

        if (tlcGroupId.HasValue)
            records = records.Where(r => r.TlcGroupId == tlcGroupId);

        if (year.HasValue)
            records = records.Where(r =>
                (r.DateConducted.HasValue && r.DateConducted.Value.Year == year) ||
                (!r.DateConducted.HasValue && r.CreatedAt.Year == year));

        return Ok(records.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TLCAndMasterclassDto>> GetById(int id)
    {
        var record = await _unitOfWork.TLCAndMasterclasses.GetById(id);
        if (record == null)
            return NotFound();

        return Ok(MapToDto(record));
    }

    [HttpPost]
    [Authorize(Roles = "TLCManager,SustainabilityLead,TechMETeam")]
    public async Task<IActionResult> Create(IEnumerable<CreateTLCAndMasterclassDto> dtos)
    {
        var dtoList = dtos.ToList();
        var records = new List<TLCAndMasterclass>();

        foreach (var dto in dtoList)
        {
            string code;
            if (dto.Type == "Masterclass")
            {
                code = await _codeGenerator.GenerateMasterclassCodeAsync();
            }
            else if (dto.Type == "TLC" && dto.TlcGroupId.HasValue)
            {
                var group = await _unitOfWork.TLCGroups.GetById(dto.TlcGroupId.Value);
                if (group == null)
                    return BadRequest("TLC Group not found");
                var existingCount = (await _unitOfWork.TLCAndMasterclasses.GetAll())
                    .Count(r => r.TlcGroupId == dto.TlcGroupId && r.Type == "TLC");
                code = $"{group.TlcGroupCode}/{existingCount + 1:00}";
            }
            else
            {
                return BadRequest("Type must be 'TLC' (with TlcGroupId) or 'Masterclass'");
            }

            var record = new TLCAndMasterclass
            {
                Code = code,
                Type = dto.Type,
                TlcGroupId = dto.TlcGroupId,
                DistrictId = dto.DistrictId,
                BlockId = dto.BlockId,
                Status = dto.Status,
                DateConducted = dto.DateConducted,
                LocationConducted = dto.LocationConducted,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                LedBy = dto.LedBy,
                Topic = dto.Topic,
                Remarks = dto.Remarks,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.TLCAndMasterclasses.Add(record);
            records.Add(record);
        }

        await _unitOfWork.SaveChangesAsync();

        if (dtoList.Count == 1)
            return CreatedAtAction(nameof(GetById), new { id = records[0].Id }, MapToDto(records[0]));

        return Ok(records.Select(MapToDto));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "TLCManager,SustainabilityLead,TechMETeam")]
    public async Task<IActionResult> Update(int id, CreateTLCAndMasterclassDto dto)
    {
        var record = await _unitOfWork.TLCAndMasterclasses.GetById(id);
        if (record == null)
            return NotFound();

        record.Status = dto.Status;
        record.DateConducted = dto.DateConducted;
        record.LocationConducted = dto.LocationConducted;
        record.StartTime = dto.StartTime;
        record.EndTime = dto.EndTime;
        record.LedBy = dto.LedBy;
        record.Topic = dto.Topic;
        record.Remarks = dto.Remarks;
        record.DistrictId = dto.DistrictId;
        record.BlockId = dto.BlockId;
        record.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.TLCAndMasterclasses.Update(record);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpPatch("{id}/cancel")]
    [Authorize(Roles = "TLCManager,SustainabilityLead,TechMETeam")]
    public async Task<IActionResult> Cancel(int id, [FromBody] string remarks)
    {
        var record = await _unitOfWork.TLCAndMasterclasses.GetById(id);
        if (record == null)
            return NotFound();

        record.Status = "Cancelled";
        record.Remarks = remarks;
        record.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.TLCAndMasterclasses.Update(record);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id}/attendance")]
    public async Task<ActionResult<IEnumerable<TLCAttendanceDto>>> GetAttendance(int id)
    {
        var record = await _unitOfWork.TLCAndMasterclasses.GetById(id);
        if (record == null)
            return NotFound();

        var attendance = (await _unitOfWork.TLCAttendances.GetAll())
            .Where(a => a.TlcOrMasterclassId == id);

        return Ok(attendance.Select(a => new TLCAttendanceDto
        {
            Id = a.Id,
            TlcOrMasterclassId = a.TlcOrMasterclassId,
            TeacherId = a.TeacherId,
            AttendanceDate = a.AttendanceDate
        }));
    }

    private static TLCAndMasterclassDto MapToDto(TLCAndMasterclass r) => new()
    {
        Id = r.Id,
        Code = r.Code,
        Type = r.Type,
        TlcGroupId = r.TlcGroupId,
        DistrictId = r.DistrictId,
        BlockId = r.BlockId,
        Status = r.Status,
        DateConducted = r.DateConducted,
        LocationConducted = r.LocationConducted,
        StartTime = r.StartTime,
        EndTime = r.EndTime,
        LedBy = r.LedBy,
        Topic = r.Topic,
        TotalAttendance = r.TotalAttendance,
        Remarks = r.Remarks
    };
}
