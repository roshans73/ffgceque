using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TLC.API.DTOs;
using TLC.Core.Models;
using TLC.Core.Services;

namespace TLC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TLCGroupsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICodeGeneratorService _codeGenerator;

    public TLCGroupsController(IUnitOfWork unitOfWork, ICodeGeneratorService codeGenerator)
    {
        _unitOfWork = unitOfWork;
        _codeGenerator = codeGenerator;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TLCGroupDto>>> GetAll(int? districtId = null, int? blockId = null)
    {
        var groups = await _unitOfWork.TLCGroups.GetAll();

        if (districtId.HasValue)
            groups = groups.Where(g => g.DistrictId == districtId);

        if (blockId.HasValue)
            groups = groups.Where(g => g.BlockId == blockId);

        return Ok(groups.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TLCGroupDto>> GetById(int id)
    {
        var group = await _unitOfWork.TLCGroups.GetById(id);
        if (group == null)
            return NotFound();

        return Ok(MapToDto(group));
    }

    [HttpPost]
    [Authorize(Roles = "TechMETeam")]
    public async Task<ActionResult<TLCGroupDto>> Create(CreateTLCGroupDto dto)
    {
        var code = await _codeGenerator.GenerateTLCGroupCodeAsync(dto.DistrictId, dto.GroupShortForm);

        var group = new TLCGroup
        {
            TlcGroupCode = code,
            DistrictId = dto.DistrictId,
            BlockId = dto.BlockId,
            Location = dto.Location,
            DateFormed = dto.DateFormed,
            TeacherLeaderId = dto.TeacherLeaderId,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.TLCGroups.Add(group);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = group.Id }, MapToDto(group));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Update(int id, CreateTLCGroupDto dto)
    {
        var group = await _unitOfWork.TLCGroups.GetById(id);
        if (group == null)
            return NotFound();

        group.DistrictId = dto.DistrictId;
        group.BlockId = dto.BlockId;
        group.Location = dto.Location;
        group.DateFormed = dto.DateFormed;
        group.TeacherLeaderId = dto.TeacherLeaderId;
        group.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.TLCGroups.Update(group);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Delete(int id)
    {
        var group = await _unitOfWork.TLCGroups.GetById(id);
        if (group == null)
            return NotFound();

        await _unitOfWork.TLCGroups.Delete(group);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id}/members")]
    public async Task<ActionResult<IEnumerable<TLCMemberDto>>> GetMembers(int id)
    {
        var group = await _unitOfWork.TLCGroups.GetById(id);
        if (group == null)
            return NotFound();

        var members = (await _unitOfWork.TLCMembers.GetAll())
            .Where(m => m.TlcGroupId == id);

        return Ok(members.Select(m => new TLCMemberDto
        {
            Id = m.Id,
            TlcGroupId = m.TlcGroupId,
            TeacherId = m.TeacherId,
            MembershipDate = m.MembershipDate
        }));
    }

    private static TLCGroupDto MapToDto(TLCGroup group) => new()
    {
        Id = group.Id,
        TlcGroupCode = group.TlcGroupCode,
        DistrictId = group.DistrictId,
        BlockId = group.BlockId,
        Location = group.Location,
        DateFormed = group.DateFormed,
        TeacherLeaderId = group.TeacherLeaderId
    };
}
