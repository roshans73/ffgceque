using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TLC.API.DTOs;
using TLC.Core.Models;
using TLC.Core.Services;

namespace TLC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DistrictsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public DistrictsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DistrictDto>>> GetAll()
    {
        var districts = await _unitOfWork.Districts.GetAll();
        return Ok(districts.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DistrictDto>> GetById(int id)
    {
        var district = await _unitOfWork.Districts.GetById(id);
        if (district == null)
            return NotFound();

        return Ok(MapToDto(district));
    }

    [HttpPost]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Create(IEnumerable<CreateDistrictDto> dtos)
    {
        var dtoList = dtos.ToList();
        var districts = new List<District>();

        foreach (var dto in dtoList)
        {
            var district = new District
            {
                Code = dto.Code,
                Name = dto.Name,
                ShortForm = dto.ShortForm
            };
            await _unitOfWork.Districts.Add(district);
            districts.Add(district);
        }

        await _unitOfWork.SaveChangesAsync();

        if (dtoList.Count == 1)
            return CreatedAtAction(nameof(GetById), new { id = districts[0].Id }, MapToDto(districts[0]));

        return Ok(districts.Select(MapToDto));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Update(int id, CreateDistrictDto dto)
    {
        var district = await _unitOfWork.Districts.GetById(id);
        if (district == null)
            return NotFound();

        district.Code = dto.Code;
        district.Name = dto.Name;
        district.ShortForm = dto.ShortForm;

        await _unitOfWork.Districts.Update(district);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Delete(int id)
    {
        var district = await _unitOfWork.Districts.GetById(id);
        if (district == null)
            return NotFound();

        await _unitOfWork.Districts.Delete(district);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    private static DistrictDto MapToDto(District district)
    {
        return new DistrictDto
        {
            Id = district.Id,
            Code = district.Code,
            Name = district.Name,
            ShortForm = district.ShortForm
        };
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BlocksController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public BlocksController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BlockDto>>> GetAll(int? districtId = null)
    {
        var blocks = await _unitOfWork.Blocks.GetAll();
        if (districtId.HasValue)
            blocks = blocks.Where(b => b.DistrictId == districtId);

        return Ok(blocks.Select(MapToDto));
    }

    [HttpPost]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Create(IEnumerable<CreateBlockDto> dtos)
    {
        var dtoList = dtos.ToList();
        var blocks = new List<Block>();

        foreach (var dto in dtoList)
        {
            var block = new Block
            {
                DistrictId = dto.DistrictId,
                Code = dto.Code,
                Name = dto.Name
            };
            await _unitOfWork.Blocks.Add(block);
            blocks.Add(block);
        }

        await _unitOfWork.SaveChangesAsync();

        if (dtoList.Count == 1)
            return CreatedAtAction(nameof(GetAll), MapToDto(blocks[0]));

        return Ok(blocks.Select(MapToDto));
    }

    private static BlockDto MapToDto(Block block)
    {
        return new BlockDto
        {
            Id = block.Id,
            DistrictId = block.DistrictId,
            Code = block.Code,
            Name = block.Name
        };
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CoachesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public CoachesController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CoachDto>>> GetAll(int? districtId = null, int? blockId = null)
    {
        var coaches = await _unitOfWork.Coaches.GetAll();

        if (districtId.HasValue)
            coaches = coaches.Where(c => c.DistrictId == districtId);

        if (blockId.HasValue)
            coaches = coaches.Where(c => c.BlockId == blockId);

        return Ok(coaches.Select(MapToDto));
    }

    [HttpPost]
    [Authorize(Roles = "TechMETeam")]
    public async Task<IActionResult> Create(IEnumerable<CreateCoachDto> dtos)
    {
        var dtoList = dtos.ToList();
        var coaches = new List<Coach>();

        foreach (var dto in dtoList)
        {
            var coach = new Coach
            {
                DistrictId = dto.DistrictId,
                BlockId = dto.BlockId,
                EmpNo = dto.EmpNo,
                Name = dto.Name,
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.Coaches.Add(coach);
            coaches.Add(coach);
        }

        await _unitOfWork.SaveChangesAsync();

        if (dtoList.Count == 1)
            return CreatedAtAction(nameof(GetAll), MapToDto(coaches[0]));

        return Ok(coaches.Select(MapToDto));
    }

    private static CoachDto MapToDto(Coach coach)
    {
        return new CoachDto
        {
            Id = coach.Id,
            DistrictId = coach.DistrictId,
            BlockId = coach.BlockId,
            EmpNo = coach.EmpNo,
            Name = coach.Name
        };
    }
}
