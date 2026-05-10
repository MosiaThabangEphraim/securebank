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
public class FraudController : ControllerBase
{
    private readonly SupabaseContext _context;
    private readonly ILogger<FraudController> _logger;

    public FraudController(SupabaseContext context, ILogger<FraudController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id : null;

    [HttpGet("cases")]
    public async Task<IActionResult> GetFraudCases()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var cases = await _context.FraudCases
            .Where(fc => fc.UserId == userId)
            .OrderByDescending(fc => fc.OpenedAt)
            .ToListAsync();

        return Ok(cases.Select(MapFraudCase));
    }

    [HttpGet("cases/{id}")]
    public async Task<IActionResult> GetFraudCaseDetail(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var fraudCase = await _context.FraudCases
            .FirstOrDefaultAsync(fc => fc.Id == id && fc.UserId == userId);

        if (fraudCase == null) return NotFound(new { error = "Fraud case not found." });
        return Ok(MapFraudCase(fraudCase));
    }

    [HttpPost("cases")]
    public async Task<IActionResult> OpenFraudCase([FromBody] OpenFraudCaseRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == request.TransactionId && t.UserId == userId);

        if (transaction == null) return NotFound(new { error = "Transaction not found." });

        var now = DateTime.UtcNow;
        var fraudCase = new FraudCase
        {
            Id = Guid.NewGuid(),
            TransactionId = request.TransactionId,
            AccountId = transaction.AccountId,
            UserId = userId.Value,
            CaseNumber = "FC" + now.ToString("yyyyMMdd") + Random.Shared.Next(10000, 99999),
            Status = "open",
            DisputeReason = request.Reason,
            DisputeDescription = request.Description,
            EvidenceUrls = request.EvidenceUrls?.ToArray(),
            OpenedAt = now,
            SlaDeadline = now.AddDays(5),
            CreatedAt = now,
            UpdatedAt = now,
        };

        await _context.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO fraud_cases (id, transaction_id, account_id, user_id, case_number, status,
                dispute_reason, dispute_description, evidence_urls, opened_at, sla_deadline, created_at, updated_at)
            VALUES ({fraudCase.Id}, {fraudCase.TransactionId}, {fraudCase.AccountId}, {fraudCase.UserId},
                {fraudCase.CaseNumber}, {"open"}::case_status,
                {fraudCase.DisputeReason}, {fraudCase.DisputeDescription}, {fraudCase.EvidenceUrls},
                {fraudCase.OpenedAt}, {fraudCase.SlaDeadline}, {fraudCase.CreatedAt}, {fraudCase.UpdatedAt})
            """);

        return Ok(MapFraudCase(fraudCase));
    }

    [HttpGet("scores/{transactionId}")]
    public async Task<IActionResult> GetFraudScore(Guid transactionId)
    {
        return NotFound(new { error = "Fraud score not available." });
    }

    private static object MapFraudCase(FraudCase fc) => new
    {
        id = fc.Id,
        transactionId = fc.TransactionId,
        accountId = fc.AccountId,
        userId = fc.UserId,
        caseNumber = fc.CaseNumber,
        status = fc.Status,
        resolution = fc.Resolution,
        resolutionNotes = fc.ResolutionNotes,
        analystId = fc.AnalystId,
        assignedAt = fc.AssignedAt,
        disputeReason = fc.DisputeReason,
        disputeDescription = fc.DisputeDescription,
        evidenceUrls = fc.EvidenceUrls,
        openedAt = fc.OpenedAt,
        resolvedAt = fc.ResolvedAt,
        slaDeadline = fc.SlaDeadline,
        createdAt = fc.CreatedAt,
        updatedAt = fc.UpdatedAt,
    };
}

public class OpenFraudCaseRequest
{
    public Guid TransactionId { get; set; }
    public string Reason { get; set; } = "";
    public string Description { get; set; } = "";
    public List<string>? EvidenceUrls { get; set; }
}
