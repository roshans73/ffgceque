using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TLC.API.DTOs;
using TLC.API.Services;
using TLC.Core.Services;

namespace TLC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class AuthController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthController(IUnitOfWork unitOfWork, IJwtTokenService jwtTokenService)
    {
        _unitOfWork = unitOfWork;
        _jwtTokenService = jwtTokenService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login(LoginRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Email and password are required." });

        var users = await _unitOfWork.Users.GetAll();
        var user = users.FirstOrDefault(u => u.Email.Equals(dto.Email, StringComparison.OrdinalIgnoreCase));

        if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !PasswordHasher.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        if (!user.IsActive)
            return Unauthorized(new { message = "This account has been deactivated." });

        var role = await _unitOfWork.Roles.GetById(user.RoleId);
        var (token, expiresAt) = _jwtTokenService.GenerateToken(user, role?.Name ?? string.Empty);

        return Ok(new LoginResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                RoleId = user.RoleId,
                RoleName = role?.Name ?? string.Empty,
                DistrictId = user.DistrictId,
                BlockId = user.BlockId,
                IsActive = user.IsActive
            }
        });
    }
}
