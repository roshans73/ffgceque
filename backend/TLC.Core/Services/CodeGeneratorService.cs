using TLC.Core.Models;

namespace TLC.Core.Services;

public interface ICodeGeneratorService
{
    Task<string> GenerateTeacherCodeAsync(int districtId);
    Task<string> GenerateTLCGroupCodeAsync(int districtId, string groupShortForm);
    Task<string> GenerateTLCEventCodeAsync(int tlcGroupId);
    Task<string> GenerateMasterclassCodeAsync();
}

public class CodeGeneratorService : ICodeGeneratorService
{
    private readonly IUnitOfWork _unitOfWork;

    public CodeGeneratorService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Generates Teacher Code in format: Tnnn where nnn is a running serial number
    /// </summary>
    public async Task<string> GenerateTeacherCodeAsync(int districtId)
    {
        var teachers = await _unitOfWork.Teachers.GetAll();
        var maxTeacherId = teachers
            .Select(t =>
            {
                if (string.IsNullOrWhiteSpace(t.TeacherCode) || t.TeacherCode.Length <= 1)
                    return 0;

                return int.TryParse(t.TeacherCode.Substring(1), out var id) ? id : 0;
            })
            .DefaultIfEmpty(0)
            .Max();

        var newTeacherId = maxTeacherId + 1;
        return $"T{newTeacherId:0000}";
    }

    /// <summary>
    /// Generates TLC Group Code in format: XXnn-YY
    /// XX = district 2-letter shortform
    /// nn = running serial number within the district
    /// YY = group 2-letter shortform
    /// </summary>
    public async Task<string> GenerateTLCGroupCodeAsync(int districtId, string groupShortForm)
    {
        var district = await _unitOfWork.Districts.GetById(districtId);
        if (district == null)
            throw new ArgumentException($"District with ID {districtId} not found");

        var tlcGroups = await _unitOfWork.TLCGroups.GetAll();
        var districtsGroups = tlcGroups.Where(g => g.DistrictId == districtId).ToList();
        var maxSerial = districtsGroups
            .Select(g => ExtractSerialFromTLCGroupCode(g.TlcGroupCode))
            .DefaultIfEmpty(0)
            .Max();

        var newSerial = maxSerial + 1;
        return $"{district.ShortForm}{newSerial:00}-{groupShortForm.Substring(0, Math.Min(2, groupShortForm.Length)).ToUpper()}";
    }

    /// <summary>
    /// Generates Masterclass Code in format: MSnnn where nnn is a running serial number
    /// </summary>
    public async Task<string> GenerateTLCEventCodeAsync(int tlcGroupId)
    {
        var group = await _unitOfWork.TLCGroups.GetById(tlcGroupId);
        if (group == null)
            throw new ArgumentException($"TLC Group with ID {tlcGroupId} not found");

        var tlcEvents = await _unitOfWork.TLCAndMasterclasses.GetAll();
        var existingCount = tlcEvents.Count(e => e.Type == "TLC" && e.TlcGroupId == tlcGroupId);
        return $"{group.TlcGroupCode}/{existingCount + 1:00}";
    }

    public async Task<string> GenerateMasterclassCodeAsync()
    {
        var masterclasses = await _unitOfWork.TLCAndMasterclasses.GetAll();
        var masterclassCodes = masterclasses.Where(m => m.Type == "Masterclass").ToList();
        var maxSerial = masterclassCodes
            .Select(m => ExtractSerialFromMasterclassCode(m.Code))
            .DefaultIfEmpty(0)
            .Max();

        var newSerial = maxSerial + 1;
        return $"MS{newSerial:000}";
    }

    private int ExtractSerialFromTLCGroupCode(string code)
    {
        // Format: XXnn-YY, extract nn
        var parts = code.Split('-');
        if (parts.Length < 1) return 0;

        var numberPart = parts[0].Substring(2);
        return int.TryParse(numberPart, out var serial) ? serial : 0;
    }

    private int ExtractSerialFromMasterclassCode(string code)
    {
        // Format: MSnnn, extract nnn
        if (code.StartsWith("MS") && code.Length > 2)
        {
            var numberPart = code.Substring(2);
            return int.TryParse(numberPart, out var serial) ? serial : 0;
        }
        return 0;
    }
}
