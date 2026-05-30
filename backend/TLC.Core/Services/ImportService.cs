using OfficeOpenXml;
using TLC.Core.Models;
using TLC.Core.Services;

namespace TLC.Core.Services;

public interface IImportService
{
    Task<ImportResult> ImportCoachesAsync(Stream fileStream, IUnitOfWork unitOfWork);
    Task<ImportResult> ImportTeachersAsync(Stream fileStream, IUnitOfWork unitOfWork);
    Task<ImportResult> ImportTLCGroupsAsync(Stream fileStream, IUnitOfWork unitOfWork, ICodeGeneratorService codeGenerator);
    Task<ImportResult> ImportTeacherLeadersAsync(Stream fileStream, IUnitOfWork unitOfWork);
    Task<ImportResult> ImportTLCAndMasterclassAsync(Stream fileStream, IUnitOfWork unitOfWork);
}

public class ImportResult
{
    public bool Success { get; set; }
    public int SuccessCount { get; set; }
    public int ErrorCount { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class ImportService : IImportService
{
    public async Task<ImportResult> ImportCoachesAsync(Stream fileStream, IUnitOfWork unitOfWork)
    {
        var result = new ImportResult();

        try
        {
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            using (var package = new ExcelPackage(fileStream))
            {
                var worksheet = package.Workbook.Worksheets[0];
                var coaches = new List<Coach>();

                for (int row = 2; row <= worksheet.Dimension.End.Row; row++)
                {
                    try
                    {
                        var coach = new Coach
                        {
                            DistrictId = int.Parse(worksheet.Cells[row, 1].Value?.ToString() ?? "0"),
                            BlockId = int.Parse(worksheet.Cells[row, 2].Value?.ToString() ?? "0"),
                            EmpNo = worksheet.Cells[row, 3].Value?.ToString() ?? "",
                            Name = worksheet.Cells[row, 4].Value?.ToString() ?? "",
                            CreatedAt = DateTime.UtcNow
                        };

                        if (string.IsNullOrWhiteSpace(coach.EmpNo) || string.IsNullOrWhiteSpace(coach.Name))
                        {
                            result.Errors.Add($"Row {row}: EmpNo and Name are required");
                            result.ErrorCount++;
                            continue;
                        }

                        coaches.Add(coach);
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"Row {row}: {ex.Message}");
                        result.ErrorCount++;
                    }
                }

                if (coaches.Count > 0)
                {
                    await unitOfWork.BeginTransactionAsync();
                    try
                    {
                        await unitOfWork.Coaches.AddRange(coaches);
                        await unitOfWork.CommitTransactionAsync();
                        result.SuccessCount = coaches.Count;
                        result.Success = true;
                    }
                    catch (Exception ex)
                    {
                        await unitOfWork.RollbackTransactionAsync();
                        result.Errors.Add($"Database error: {ex.Message}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            result.Errors.Add($"File processing error: {ex.Message}");
        }

        return result;
    }

    public async Task<ImportResult> ImportTeachersAsync(Stream fileStream, IUnitOfWork unitOfWork)
    {
        var result = new ImportResult();

        try
        {
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            using (var package = new ExcelPackage(fileStream))
            {
                var worksheet = package.Workbook.Worksheets[0];
                var teachers = new List<Teacher>();
                var codeGenerator = new CodeGeneratorService(unitOfWork);

                for (int row = 2; row <= worksheet.Dimension.End.Row; row++)
                {
                    try
                    {
                        var teacher = new Teacher
                        {
                            TeacherCode = await codeGenerator.GenerateTeacherCodeAsync(0),
                            Name = worksheet.Cells[row, 1].Value?.ToString() ?? "",
                            School = worksheet.Cells[row, 2].Value?.ToString() ?? "",
                            DistrictId = int.Parse(worksheet.Cells[row, 3].Value?.ToString() ?? "0"),
                            BlockId = int.Parse(worksheet.Cells[row, 4].Value?.ToString() ?? "0"),
                            Gender = worksheet.Cells[row, 5].Value?.ToString() ?? "",
                            Mobile = worksheet.Cells[row, 6].Value?.ToString() ?? "",
                            Email = worksheet.Cells[row, 7].Value?.ToString() ?? "",
                            IsTipTeacher = worksheet.Cells[row, 8].Value?.ToString()?.ToLower() == "y",
                            YearsInTip = int.TryParse(worksheet.Cells[row, 9].Value?.ToString(), out var years) ? years : null,
                            RegisteredDate = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow
                        };

                        if (string.IsNullOrWhiteSpace(teacher.Name))
                        {
                            result.Errors.Add($"Row {row}: Teacher name is required");
                            result.ErrorCount++;
                            continue;
                        }

                        teachers.Add(teacher);
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"Row {row}: {ex.Message}");
                        result.ErrorCount++;
                    }
                }

                if (teachers.Count > 0)
                {
                    await unitOfWork.BeginTransactionAsync();
                    try
                    {
                        await unitOfWork.Teachers.AddRange(teachers);
                        await unitOfWork.CommitTransactionAsync();
                        result.SuccessCount = teachers.Count;
                        result.Success = true;
                    }
                    catch (Exception ex)
                    {
                        await unitOfWork.RollbackTransactionAsync();
                        result.Errors.Add($"Database error: {ex.Message}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            result.Errors.Add($"File processing error: {ex.Message}");
        }

        return result;
    }

    public async Task<ImportResult> ImportTLCGroupsAsync(Stream fileStream, IUnitOfWork unitOfWork, ICodeGeneratorService codeGenerator)
    {
        var result = new ImportResult();

        try
        {
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            using (var package = new ExcelPackage(fileStream))
            {
                var worksheet = package.Workbook.Worksheets[0];
                var tlcGroups = new List<TLCGroup>();

                for (int row = 2; row <= worksheet.Dimension.End.Row; row++)
                {
                    try
                    {
                        var districtId = int.Parse(worksheet.Cells[row, 1].Value?.ToString() ?? "0");
                        var groupShortForm = worksheet.Cells[row, 5].Value?.ToString() ?? "";

                        var tlcGroup = new TLCGroup
                        {
                            TlcGroupCode = await codeGenerator.GenerateTLCGroupCodeAsync(districtId, groupShortForm),
                            DistrictId = districtId,
                            BlockId = int.Parse(worksheet.Cells[row, 2].Value?.ToString() ?? "0"),
                            Location = worksheet.Cells[row, 3].Value?.ToString() ?? "",
                            DateFormed = DateTime.Parse(worksheet.Cells[row, 4].Value?.ToString() ?? DateTime.Now.ToString()),
                            TeacherLeaderId = int.Parse(worksheet.Cells[row, 6].Value?.ToString() ?? "0"),
                            CreatedAt = DateTime.UtcNow
                        };

                        tlcGroups.Add(tlcGroup);
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"Row {row}: {ex.Message}");
                        result.ErrorCount++;
                    }
                }

                if (tlcGroups.Count > 0)
                {
                    await unitOfWork.BeginTransactionAsync();
                    try
                    {
                        await unitOfWork.TLCGroups.AddRange(tlcGroups);
                        await unitOfWork.CommitTransactionAsync();
                        result.SuccessCount = tlcGroups.Count;
                        result.Success = true;
                    }
                    catch (Exception ex)
                    {
                        await unitOfWork.RollbackTransactionAsync();
                        result.Errors.Add($"Database error: {ex.Message}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            result.Errors.Add($"File processing error: {ex.Message}");
        }

        return result;
    }

    public async Task<ImportResult> ImportTeacherLeadersAsync(Stream fileStream, IUnitOfWork unitOfWork)
    {
        var result = new ImportResult();

        try
        {
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            using (var package = new ExcelPackage(fileStream))
            {
                var worksheet = package.Workbook.Worksheets[0];
                var teacherLeaders = new List<TeacherLeader>();

                for (int row = 2; row <= worksheet.Dimension.End.Row; row++)
                {
                    try
                    {
                        var teacherLeader = new TeacherLeader
                        {
                            TlcGroupId = int.Parse(worksheet.Cells[row, 1].Value?.ToString() ?? "0"),
                            TeacherId = int.Parse(worksheet.Cells[row, 2].Value?.ToString() ?? "0"),
                            CreatedAt = DateTime.UtcNow
                        };

                        teacherLeaders.Add(teacherLeader);
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"Row {row}: {ex.Message}");
                        result.ErrorCount++;
                    }
                }

                if (teacherLeaders.Count > 0)
                {
                    await unitOfWork.BeginTransactionAsync();
                    try
                    {
                        await unitOfWork.TeacherLeaders.AddRange(teacherLeaders);
                        await unitOfWork.CommitTransactionAsync();
                        result.SuccessCount = teacherLeaders.Count;
                        result.Success = true;
                    }
                    catch (Exception ex)
                    {
                        await unitOfWork.RollbackTransactionAsync();
                        result.Errors.Add($"Database error: {ex.Message}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            result.Errors.Add($"File processing error: {ex.Message}");
        }

        return result;
    }

    public async Task<ImportResult> ImportTLCAndMasterclassAsync(Stream fileStream, IUnitOfWork unitOfWork)
    {
        var result = new ImportResult();

        try
        {
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            using (var package = new ExcelPackage(fileStream))
            {
                var worksheet = package.Workbook.Worksheets[0];
                var tlcAndMasterclasses = new List<TLCAndMasterclass>();

                for (int row = 2; row <= worksheet.Dimension.End.Row; row++)
                {
                    try
                    {
                        var item = new TLCAndMasterclass
                        {
                            Type = worksheet.Cells[row, 1].Value?.ToString() ?? "",
                            Status = worksheet.Cells[row, 2].Value?.ToString() ?? "Planned",
                            TlcGroupId = int.TryParse(worksheet.Cells[row, 3].Value?.ToString(), out var groupId) ? groupId : null,
                            DistrictId = int.TryParse(worksheet.Cells[row, 4].Value?.ToString(), out var districtId) ? districtId : null,
                            BlockId = int.TryParse(worksheet.Cells[row, 5].Value?.ToString(), out var blockId) ? blockId : null,
                            Topic = worksheet.Cells[row, 6].Value?.ToString() ?? "",
                            CreatedAt = DateTime.UtcNow
                        };

                        tlcAndMasterclasses.Add(item);
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"Row {row}: {ex.Message}");
                        result.ErrorCount++;
                    }
                }

                if (tlcAndMasterclasses.Count > 0)
                {
                    await unitOfWork.BeginTransactionAsync();
                    try
                    {
                        await unitOfWork.TLCAndMasterclasses.AddRange(tlcAndMasterclasses);
                        await unitOfWork.CommitTransactionAsync();
                        result.SuccessCount = tlcAndMasterclasses.Count;
                        result.Success = true;
                    }
                    catch (Exception ex)
                    {
                        await unitOfWork.RollbackTransactionAsync();
                        result.Errors.Add($"Database error: {ex.Message}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            result.Errors.Add($"File processing error: {ex.Message}");
        }

        return result;
    }
}
