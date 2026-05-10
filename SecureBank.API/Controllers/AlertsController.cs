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
public class AlertsController : ControllerBase
{
    private readonly SupabaseContext _context;
    private readonly ILogger<AlertsController> _logger;

    public AlertsController(SupabaseContext context, ILogger<AlertsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id : null;

    [HttpPost]
    public async Task<IActionResult> CreateAlert([FromBody] CreateAlertRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var now = DateTime.UtcNow;
        var id = Guid.NewGuid();

        await _context.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO alerts (id, user_id, transaction_id, fraud_case_id, alert_type, title, message,
                status, action_required, action_url, created_at)
            VALUES ({id}, {userId.Value}, {request.TransactionId}, {request.FraudCaseId},
                {request.AlertType}::alert_type, {request.Title}, {request.Message},
                {"unread"}::alert_status, {request.ActionRequired}, {request.ActionUrl}, {now})
            """);

        var alert = await _context.Alerts.FirstOrDefaultAsync(a => a.Id == id);
        return Ok(MapAlert(alert!));
    }

    [HttpGet]
    public async Task<IActionResult> GetAlerts([FromQuery] string? status = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var query = _context.Alerts.Where(a => a.UserId == userId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(a => a.Status == status);

        var alerts = await query
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(alerts.Select(MapAlert));
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkAlertAsRead(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var now = DateTime.UtcNow;
        var affected = await _context.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE alerts SET status = {"read"}::alert_status, read_at = {now} WHERE id = {id} AND user_id = {userId.Value}");

        if (affected == 0) return NotFound(new { error = "Alert not found." });

        var alert = await _context.Alerts.FirstOrDefaultAsync(a => a.Id == id);
        return Ok(MapAlert(alert!));
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAlertsAsRead()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var now = DateTime.UtcNow;
        var updated = await _context.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE alerts SET status = {"read"}::alert_status, read_at = {now} WHERE user_id = {userId.Value} AND status = {"unread"}::alert_status");

        return Ok(new { updated });
    }

    private static object MapAlert(Alert a) => new
    {
        id = a.Id,
        userId = a.UserId,
        transactionId = a.TransactionId,
        fraudCaseId = a.FraudCaseId,
        alertType = a.AlertType,
        title = a.Title,
        message = a.Message,
        status = a.Status,
        actionRequired = a.ActionRequired,
        actionUrl = a.ActionUrl,
        createdAt = a.CreatedAt,
        readAt = a.ReadAt,
    };
}

public class CreateAlertRequest
{
    public Guid? TransactionId { get; set; }
    public Guid? FraudCaseId { get; set; }
    public string AlertType { get; set; } = "";
    public string Title { get; set; } = "";
    public string Message { get; set; } = "";
    public bool ActionRequired { get; set; }
    public string? ActionUrl { get; set; }
}
