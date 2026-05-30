using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TLC.API.DTOs;
using TLC.Core.Models;
using TLC.Core.Services;

namespace TLC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public UsersController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    [Authorize(Roles = "CEO,TechMETeam")]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAll()
    {
        var users = await _unitOfWork.Users.GetAll();
        return Ok(users.Select(MapToDto));
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "CEO,TechMETeam")]
    public async Task<ActionResult<UserDto>> GetById(int id)
    {
        var user = await _unitOfWork.Users.GetById(id);
        if (user == null)
            return NotFound();

        return Ok(MapToDto(user));
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        var aadId = User.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value
            ?? User.FindFirst("oid")?.Value;

        if (string.IsNullOrEmpty(aadId))
            return Unauthorized();

        var users = await _unitOfWork.Users.GetAll();
        var user = users.FirstOrDefault(u => u.AzureAadId == aadId);

        if (user == null)
            return NotFound();

        return Ok(MapToDto(user));
    }

    [HttpPost]
    [Authorize(Roles = "TechMETeam")]
    public async Task<ActionResult<UserDto>> Create(CreateUserDto dto)
    {
        var user = new User
        {
            AzureAadId = dto.AzureAadId,
            Email = dto.Email,
            Name = dto.Name,
            RoleId = dto.RoleId,
            DistrictId = dto.DistrictId,
            BlockId = dto.BlockId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Users.Add(user);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, MapToDto(user));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Update(int id, CreateUserDto dto)
    {
        var user = await _unitOfWork.Users.GetById(id);
        if (user == null)
            return NotFound();

        user.Email = dto.Email;
        user.Name = dto.Name;
        user.RoleId = dto.RoleId;
        user.DistrictId = dto.DistrictId;
        user.BlockId = dto.BlockId;
        user.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpPatch("{id}/deactivate")]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var user = await _unitOfWork.Users.GetById(id);
        if (user == null)
            return NotFound();

        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpPatch("{id}/activate")]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Activate(int id)
    {
        var user = await _unitOfWork.Users.GetById(id);
        if (user == null)
            return NotFound();

        user.IsActive = true;
        user.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    private static UserDto MapToDto(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        Name = user.Name,
        RoleId = user.RoleId,
        DistrictId = user.DistrictId,
        BlockId = user.BlockId,
        IsActive = user.IsActive
    };
}
