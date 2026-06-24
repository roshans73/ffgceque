using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TLC.API.DTOs;
using TLC.Core.Models;
using TLC.Core.Services;

namespace TLC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TLCMembersController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public TLCMembersController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TLCMemberDto>>> GetAll(int? tlcGroupId = null, int? teacherId = null)
    {
        var members = await _unitOfWork.TLCMembers.GetAll();

        if (tlcGroupId.HasValue)
            members = members.Where(m => m.TlcGroupId == tlcGroupId);

        if (teacherId.HasValue)
            members = members.Where(m => m.TeacherId == teacherId);

        return Ok(members.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TLCMemberDto>> GetById(int id)
    {
        var member = await _unitOfWork.TLCMembers.GetById(id);
        if (member == null)
            return NotFound();

        return Ok(MapToDto(member));
    }

    [HttpPost]
    [Authorize(Roles = "TLCManager,TechMETeam")]
    public async Task<IActionResult> Create(IEnumerable<CreateTLCMemberDto> dtos)
    {
        var dtoList = dtos.ToList();
        var members = new List<TLCMember>();
        var existingMembers = await _unitOfWork.TLCMembers.GetAll();

        foreach (var dto in dtoList)
        {
            var group = await _unitOfWork.TLCGroups.GetById(dto.TlcGroupId);
            if (group == null)
                return BadRequest($"TLC Group {dto.TlcGroupId} not found");

            var teacher = await _unitOfWork.Teachers.GetById(dto.TeacherId);
            if (teacher == null)
                return BadRequest($"Teacher {dto.TeacherId} not found");

            var existing = existingMembers.FirstOrDefault(m => m.TlcGroupId == dto.TlcGroupId && m.TeacherId == dto.TeacherId);
            if (existing != null)
                return Conflict($"Teacher {dto.TeacherId} is already a member of TLC group {dto.TlcGroupId}");

            var checkInBatch = members.FirstOrDefault(m => m.TlcGroupId == dto.TlcGroupId && m.TeacherId == dto.TeacherId);
            if (checkInBatch != null)
                return Conflict($"Duplicate membership in request: Teacher {dto.TeacherId} in group {dto.TlcGroupId}");

            var member = new TLCMember
            {
                TlcGroupId = dto.TlcGroupId,
                TeacherId = dto.TeacherId,
                MembershipDate = dto.MembershipDate,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.TLCMembers.Add(member);
            members.Add(member);
        }

        await _unitOfWork.SaveChangesAsync();

        if (dtoList.Count == 1)
            return CreatedAtAction(nameof(GetById), new { id = members[0].Id }, MapToDto(members[0]));

        return Ok(members.Select(MapToDto));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "TLCManager,TechMETeam")]
    public async Task<IActionResult> Delete(int id)
    {
        var member = await _unitOfWork.TLCMembers.GetById(id);
        if (member == null)
            return NotFound();

        await _unitOfWork.TLCMembers.Delete(member);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    private static TLCMemberDto MapToDto(TLCMember member) => new()
    {
        Id = member.Id,
        TlcGroupId = member.TlcGroupId,
        TeacherId = member.TeacherId,
        MembershipDate = member.MembershipDate
    };
}
