using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SecureBank.API.Data;
using SecureBank.API.Models.Entities;
using System.Security.Claims;

namespace SecureBank.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PreferencesController : ControllerBase
{
    private readonly SupabaseContext _context;
    private readonly ILogger<PreferencesController> _logger;

    public PreferencesController(SupabaseContext context, ILogger<PreferencesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id : null;

    [HttpGet]
    public async Task<IActionResult> GetPreferences()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var prefs = await _context.UserFraudPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (prefs == null)
        {
            prefs = new UserFraudPreferences
            {
                Id = Guid.NewGuid(),
                UserId = userId.Value,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _context.UserFraudPreferences.Add(prefs);
            await _context.SaveChangesAsync();
        }

        return Ok(MapPrefs(prefs));
    }

    [HttpPatch]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var prefs = await _context.UserFraudPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (prefs == null)
        {
            prefs = new UserFraudPreferences
            {
                Id = Guid.NewGuid(),
                UserId = userId.Value,
                CreatedAt = DateTime.UtcNow,
            };
            _context.UserFraudPreferences.Add(prefs);
        }

        if (request.VelocityEnabled.HasValue)           prefs.VelocityEnabled            = request.VelocityEnabled.Value;
        if (request.VelocityMaxTxCount.HasValue)        prefs.VelocityMaxTxCount         = request.VelocityMaxTxCount.Value;
        if (request.VelocityWindowMinutes.HasValue)     prefs.VelocityWindowMinutes      = request.VelocityWindowMinutes.Value;
        if (request.AmountCheckEnabled.HasValue)        prefs.AmountCheckEnabled         = request.AmountCheckEnabled.Value;
        if (request.AmountMultiplier.HasValue)          prefs.AmountMultiplier           = request.AmountMultiplier.Value;
        if (request.TimeCheckEnabled.HasValue)          prefs.TimeCheckEnabled           = request.TimeCheckEnabled.Value;
        if (request.ActiveHoursStart.HasValue)          prefs.ActiveHoursStart           = request.ActiveHoursStart.Value;
        if (request.ActiveHoursEnd.HasValue)            prefs.ActiveHoursEnd             = request.ActiveHoursEnd.Value;
        if (request.DailyLimitEnabled.HasValue)         prefs.DailyLimitEnabled          = request.DailyLimitEnabled.Value;
        if (request.DailySpendLimit.HasValue)           prefs.DailySpendLimit            = request.DailySpendLimit.Value;
        if (request.BalanceDrainEnabled.HasValue)       prefs.BalanceDrainEnabled        = request.BalanceDrainEnabled.Value;
        if (request.BalanceDrainPercent.HasValue)       prefs.BalanceDrainPercent        = request.BalanceDrainPercent.Value;
        if (request.BalanceDrainWindowMinutes.HasValue) prefs.BalanceDrainWindowMinutes  = request.BalanceDrainWindowMinutes.Value;
        if (request.DuplicateCheckEnabled.HasValue)     prefs.DuplicateCheckEnabled      = request.DuplicateCheckEnabled.Value;
        if (request.DuplicateWindowMinutes.HasValue)    prefs.DuplicateWindowMinutes     = request.DuplicateWindowMinutes.Value;
        if (request.DuplicateAmountThreshold.HasValue)  prefs.DuplicateAmountThreshold   = request.DuplicateAmountThreshold.Value;
        if (request.InactiveDaysEnabled.HasValue)       prefs.InactiveDaysEnabled        = request.InactiveDaysEnabled.Value;
        if (request.InactiveDays != null)               prefs.InactiveDays               = request.InactiveDays;

        prefs.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapPrefs(prefs));
    }

    private static object MapPrefs(UserFraudPreferences p) => new
    {
        id = p.Id,
        userId = p.UserId,
        velocityEnabled = p.VelocityEnabled,
        velocityMaxTxCount = p.VelocityMaxTxCount,
        velocityWindowMinutes = p.VelocityWindowMinutes,
        amountCheckEnabled = p.AmountCheckEnabled,
        amountMultiplier = p.AmountMultiplier,
        timeCheckEnabled = p.TimeCheckEnabled,
        activeHoursStart = p.ActiveHoursStart,
        activeHoursEnd = p.ActiveHoursEnd,
        dailyLimitEnabled = p.DailyLimitEnabled,
        dailySpendLimit = p.DailySpendLimit,
        balanceDrainEnabled = p.BalanceDrainEnabled,
        balanceDrainPercent = p.BalanceDrainPercent,
        balanceDrainWindowMinutes = p.BalanceDrainWindowMinutes,
        duplicateCheckEnabled = p.DuplicateCheckEnabled,
        duplicateWindowMinutes = p.DuplicateWindowMinutes,
        duplicateAmountThreshold = p.DuplicateAmountThreshold,
        inactiveDaysEnabled = p.InactiveDaysEnabled,
        inactiveDays = p.InactiveDays,
        createdAt = p.CreatedAt,
        updatedAt = p.UpdatedAt,
    };
}

public class UpdatePreferencesRequest
{
    public bool? VelocityEnabled { get; set; }
    public int? VelocityMaxTxCount { get; set; }
    public int? VelocityWindowMinutes { get; set; }
    public bool? AmountCheckEnabled { get; set; }
    public decimal? AmountMultiplier { get; set; }
    public bool? TimeCheckEnabled { get; set; }
    public int? ActiveHoursStart { get; set; }
    public int? ActiveHoursEnd { get; set; }
    public bool? DailyLimitEnabled { get; set; }
    public decimal? DailySpendLimit { get; set; }
    public bool? BalanceDrainEnabled { get; set; }
    public decimal? BalanceDrainPercent { get; set; }
    public int? BalanceDrainWindowMinutes { get; set; }
    public bool? DuplicateCheckEnabled { get; set; }
    public int? DuplicateWindowMinutes { get; set; }
    public decimal? DuplicateAmountThreshold { get; set; }
    public bool? InactiveDaysEnabled { get; set; }
    public int[]? InactiveDays { get; set; }
}
