using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TLC.API.DTOs;
using TLC.Core.Services;

namespace TLC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "TechMETeam")]
public class UploadController : ControllerBase
{
    private readonly IImportService _importService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICodeGeneratorService _codeGenerator;
    private readonly ILogger<UploadController> _logger;

    public UploadController(
        IImportService importService,
        IUnitOfWork unitOfWork,
        ICodeGeneratorService codeGenerator,
        ILogger<UploadController> logger)
    {
        _importService = importService;
        _unitOfWork = unitOfWork;
        _codeGenerator = codeGenerator;
        _logger = logger;
    }

    [HttpPost("coaches")]
    public async Task<ActionResult<BulkUploadResponse>> UploadCoaches(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new BulkUploadResponse { Message = "No file provided" });

        if (!file.FileName.EndsWith(".xlsx"))
            return BadRequest(new BulkUploadResponse { Message = "Only Excel files (.xlsx) are supported" });

        try
        {
            using (var stream = file.OpenReadStream())
            {
                var result = await _importService.ImportCoachesAsync(stream, _unitOfWork);
                return Ok(new BulkUploadResponse
                {
                    Success = result.Success,
                    SuccessCount = result.SuccessCount,
                    ErrorCount = result.ErrorCount,
                    Errors = result.Errors,
                    Message = result.Success ?
                        $"Successfully imported {result.SuccessCount} coaches" :
                        "Import completed with errors"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading coaches file");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new BulkUploadResponse { Message = "An error occurred during file processing" });
        }
    }

    [HttpPost("teachers")]
    public async Task<ActionResult<BulkUploadResponse>> UploadTeachers(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new BulkUploadResponse { Message = "No file provided" });

        if (!file.FileName.EndsWith(".xlsx"))
            return BadRequest(new BulkUploadResponse { Message = "Only Excel files (.xlsx) are supported" });

        try
        {
            using (var stream = file.OpenReadStream())
            {
                var result = await _importService.ImportTeachersAsync(stream, _unitOfWork);
                return Ok(new BulkUploadResponse
                {
                    Success = result.Success,
                    SuccessCount = result.SuccessCount,
                    ErrorCount = result.ErrorCount,
                    Errors = result.Errors,
                    Message = result.Success ?
                        $"Successfully imported {result.SuccessCount} teachers" :
                        "Import completed with errors"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading teachers file");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new BulkUploadResponse { Message = "An error occurred during file processing" });
        }
    }

    [HttpPost("tlcgroups")]
    public async Task<ActionResult<BulkUploadResponse>> UploadTLCGroups(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new BulkUploadResponse { Message = "No file provided" });

        if (!file.FileName.EndsWith(".xlsx"))
            return BadRequest(new BulkUploadResponse { Message = "Only Excel files (.xlsx) are supported" });

        try
        {
            using (var stream = file.OpenReadStream())
            {
                var result = await _importService.ImportTLCGroupsAsync(stream, _unitOfWork, _codeGenerator);
                return Ok(new BulkUploadResponse
                {
                    Success = result.Success,
                    SuccessCount = result.SuccessCount,
                    ErrorCount = result.ErrorCount,
                    Errors = result.Errors,
                    Message = result.Success ?
                        $"Successfully imported {result.SuccessCount} TLC groups" :
                        "Import completed with errors"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading TLC groups file");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new BulkUploadResponse { Message = "An error occurred during file processing" });
        }
    }

    [HttpPost("teacherleaders")]
    public async Task<ActionResult<BulkUploadResponse>> UploadTeacherLeaders(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new BulkUploadResponse { Message = "No file provided" });

        try
        {
            using (var stream = file.OpenReadStream())
            {
                var result = await _importService.ImportTeacherLeadersAsync(stream, _unitOfWork);
                return Ok(new BulkUploadResponse
                {
                    Success = result.Success,
                    SuccessCount = result.SuccessCount,
                    ErrorCount = result.ErrorCount,
                    Errors = result.Errors,
                    Message = result.Success ?
                        $"Successfully imported {result.SuccessCount} teacher leaders" :
                        "Import completed with errors"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading teacher leaders file");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new BulkUploadResponse { Message = "An error occurred during file processing" });
        }
    }

    [HttpPost("tlcandmasterclass")]
    public async Task<ActionResult<BulkUploadResponse>> UploadTLCAndMasterclass(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new BulkUploadResponse { Message = "No file provided" });

        try
        {
            using (var stream = file.OpenReadStream())
            {
                var result = await _importService.ImportTLCAndMasterclassAsync(stream, _unitOfWork);
                return Ok(new BulkUploadResponse
                {
                    Success = result.Success,
                    SuccessCount = result.SuccessCount,
                    ErrorCount = result.ErrorCount,
                    Errors = result.Errors,
                    Message = result.Success ?
                        $"Successfully imported {result.SuccessCount} records" :
                        "Import completed with errors"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading TLC and masterclass file");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new BulkUploadResponse { Message = "An error occurred during file processing" });
        }
    }
}
