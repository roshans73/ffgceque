using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TLC.API.DTOs;
using TLC.Core.Models;
using TLC.Core.Services;

namespace TLC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TeachersController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICodeGeneratorService _codeGenerator;

    public TeachersController(IUnitOfWork unitOfWork, ICodeGeneratorService codeGenerator)
    {
        _unitOfWork = unitOfWork;
        _codeGenerator = codeGenerator;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TeacherDto>>> GetAll(
        int? districtId = null,
        int? blockId = null,
        int? coachId = null,
        bool? isTipTeacher = null,
        string? search = null)
    {
        var teachers = await _unitOfWork.Teachers.GetAll();

        if (districtId.HasValue)
            teachers = teachers.Where(t => t.DistrictId == districtId);

        if (blockId.HasValue)
            teachers = teachers.Where(t => t.BlockId == blockId);

        if (coachId.HasValue)
            teachers = teachers.Where(t => t.CoachId == coachId);

        if (isTipTeacher.HasValue)
            teachers = teachers.Where(t => t.IsTipTeacher == isTipTeacher);

        if (!string.IsNullOrWhiteSpace(search))
            teachers = teachers.Where(t =>
                t.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                t.TeacherCode.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                t.School.Contains(search, StringComparison.OrdinalIgnoreCase));

        return Ok(teachers.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TeacherDto>> GetById(int id)
    {
        var teacher = await _unitOfWork.Teachers.GetById(id);
        if (teacher == null)
            return NotFound();

        return Ok(MapToDto(teacher));
    }

    [HttpPost]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Create(IEnumerable<CreateTeacherDto> dtos)
    {
        var dtoList = dtos.ToList();
        var teachers = new List<Teacher>();

        foreach (var dto in dtoList)
        {
            var teacherCode = await _codeGenerator.GenerateTeacherCodeAsync(dto.DistrictId);

            var teacher = new Teacher
            {
                TeacherCode = teacherCode,
                Name = dto.Name,
                School = dto.School,
                DistrictId = dto.DistrictId,
                BlockId = dto.BlockId,
                Gender = dto.Gender,
                Mobile = dto.Mobile,
                Email = dto.Email,
                IsTipTeacher = dto.IsTipTeacher,
                YearsInTip = dto.YearsInTip,
                CoachId = dto.CoachId,
                RegisteredDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Teachers.Add(teacher);
            teachers.Add(teacher);
        }

        await _unitOfWork.SaveChangesAsync();

        if (dtoList.Count == 1)
            return CreatedAtAction(nameof(GetById), new { id = teachers[0].Id }, MapToDto(teachers[0]));

        return Ok(teachers.Select(MapToDto));
    }

    [HttpPost("bulk")]
    [Authorize(Roles = "TechMETeam")]
    public async Task<ActionResult<IEnumerable<TeacherDto>>> CreateBulk(IEnumerable<CreateTeacherDto> dtos)
    {
        var teachers = new List<Teacher>();
        foreach (var dto in dtos)
        {
            var teacherCode = await _codeGenerator.GenerateTeacherCodeAsync(dto.DistrictId);

            var teacher = new Teacher
            {
                TeacherCode = teacherCode,
                Name = dto.Name,
                School = dto.School,
                DistrictId = dto.DistrictId,
                BlockId = dto.BlockId,
                Gender = dto.Gender,
                Mobile = dto.Mobile,
                Email = dto.Email,
                IsTipTeacher = dto.IsTipTeacher,
                YearsInTip = dto.YearsInTip,
                CoachId = dto.CoachId,
                RegisteredDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Teachers.Add(teacher);
            teachers.Add(teacher);
        }

        await _unitOfWork.SaveChangesAsync();
        return Ok(teachers.Select(MapToDto));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Update(int id, CreateTeacherDto dto)
    {
        var teacher = await _unitOfWork.Teachers.GetById(id);
        if (teacher == null)
            return NotFound();

        teacher.Name = dto.Name;
        teacher.School = dto.School;
        teacher.DistrictId = dto.DistrictId;
        teacher.BlockId = dto.BlockId;
        teacher.Gender = dto.Gender;
        teacher.Mobile = dto.Mobile;
        teacher.Email = dto.Email;
        teacher.IsTipTeacher = dto.IsTipTeacher;
        teacher.YearsInTip = dto.YearsInTip;
        teacher.CoachId = dto.CoachId;
        teacher.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Teachers.Update(teacher);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Delete(int id)
    {
        var teacher = await _unitOfWork.Teachers.GetById(id);
        if (teacher == null)
            return NotFound();

        await _unitOfWork.Teachers.Delete(teacher);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    private static TeacherDto MapToDto(Teacher teacher) => new()
    {
        Id = teacher.Id,
        TeacherCode = teacher.TeacherCode,
        Name = teacher.Name,
        School = teacher.School,
        DistrictId = teacher.DistrictId,
        BlockId = teacher.BlockId,
        Gender = teacher.Gender,
        Mobile = teacher.Mobile,
        Email = teacher.Email,
        IsTipTeacher = teacher.IsTipTeacher,
        YearsInTip = teacher.YearsInTip,
        CoachId = teacher.CoachId,
        RegisteredDate = teacher.RegisteredDate
    };
}
