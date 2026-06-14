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
    public async Task<IActionResult> Create(IEnumerable<CreateUserDto> dtos)
    {
        var dtoList = dtos.ToList();
        var users = new List<User>();
        var existingUsers = await _unitOfWork.Users.GetAll();

        foreach (var dto in dtoList)
        {
            var email = dto.Email?.Trim() ?? string.Empty;
            var name = dto.Name?.Trim() ?? string.Empty;
            string? aadId = string.IsNullOrWhiteSpace(dto.AzureAadId) ? null : dto.AzureAadId!.Trim();

            if (string.IsNullOrWhiteSpace(email))
                return BadRequest("Email is required for all users.");

            if (string.IsNullOrWhiteSpace(name))
                return BadRequest("Name is required for all users.");

            if (existingUsers.Any(u => string.Equals(u.Email, email, StringComparison.OrdinalIgnoreCase)))
                return BadRequest($"A user with email '{email}' already exists.");

            if (!string.IsNullOrWhiteSpace(aadId) && existingUsers.Any(u => string.Equals(u.AzureAadId, aadId, StringComparison.OrdinalIgnoreCase)))
                return BadRequest($"A user with Azure AD object ID '{aadId}' already exists.");

            if (users.Any(u => string.Equals(u.Email, email, StringComparison.OrdinalIgnoreCase)))
                return BadRequest($"Duplicate email '{email}' in request.");

            if (!string.IsNullOrWhiteSpace(aadId) && users.Any(u => string.Equals(u.AzureAadId, aadId, StringComparison.OrdinalIgnoreCase)))
                return BadRequest($"Duplicate Azure AD object ID '{aadId}' in request.");

            var user = new User
            {
                AzureAadId = aadId,
                Email = email,
                Name = name,
                RoleId = dto.RoleId,
                DistrictId = dto.DistrictId,
                BlockId = dto.BlockId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Users.Add(user);
            users.Add(user);
        }

        await _unitOfWork.SaveChangesAsync();

        if (dtoList.Count == 1)
            return CreatedAtAction(nameof(GetById), new { id = users[0].Id }, MapToDto(users[0]));

        return Ok(users.Select(MapToDto));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Update(int id, CreateUserDto dto)
    {
        var user = await _unitOfWork.Users.GetById(id);
        if (user == null)
            return NotFound();

        var email = dto.Email?.Trim() ?? string.Empty;
        var name = dto.Name?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(email))
            return BadRequest("Email is required.");

        if (string.IsNullOrWhiteSpace(name))
            return BadRequest("Name is required.");

        var users = await _unitOfWork.Users.GetAll();
        if (users.Any(u => u.Id != id && string.Equals(u.Email, email, StringComparison.OrdinalIgnoreCase)))
            return BadRequest("A user with this email already exists.");

        user.Email = email;
        user.Name = name;
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
