using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureBank.API.Data;
using SecureBank.API.Models.Entities;
using System.Security.Claims;

namespace SecureBank.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly SupabaseContext _context;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(SupabaseContext context, ILogger<AnalyticsController> logger)
    {
        _context = context;
        _logger  = logger;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User.FindFirstValue("sub");

        if (userIdStr == null || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(new { error = "Invalid or missing user token." });

        try
        {
            var accountIds = await _context.Accounts
                .Where(a => a.UserId == userId)
                .Select(a => a.Id)
                .ToListAsync();

            // Early-exit for users with no accounts
            if (accountIds.Count == 0)
                return Ok(EmptySummary());

            // Project only the fields we need — avoids mapping failures on nullable columns
            var allTx = await _context.Transactions
                .Where(t => accountIds.Contains(t.AccountId))
                .Select(t => new
                {
                    t.Status,
                    t.Direction,
                    t.Amount,
                    t.InitiatedAt,
                })
                .ToListAsync();

            var fraudCaseCount = await _context.FraudCases
                .CountAsync(fc => fc.UserId == userId);

            var totalSent     = allTx.Where(t => t.Status == TransactionStatus.posted && t.Direction == TransactionDirection.debit).Sum(t => t.Amount);
            var totalReceived = allTx.Where(t => t.Status == TransactionStatus.posted && t.Direction == TransactionDirection.credit).Sum(t => t.Amount);
            var pendingCount  = allTx.Count(t => t.Status == TransactionStatus.pending);
            var blockedCount  = allTx.Count(t => t.Status == TransactionStatus.blocked);
            var postedCount   = allTx.Count(t => t.Status == TransactionStatus.posted);

            // Last 6 months, oldest first
            var months = Enumerable.Range(0, 6)
                .Select(i => DateTime.UtcNow.AddMonths(-i))
                .OrderBy(d => d)
                .Select(d => new { Label = d.ToString("MMM yy"), d.Year, d.Month })
                .ToList();

            var monthlyFlow = months.Select(m =>
            {
                var bucket = allTx.Where(t =>
                    t.Status == TransactionStatus.posted &&
                    t.InitiatedAt.Year  == m.Year &&
                    t.InitiatedAt.Month == m.Month);

                return new
                {
                    month    = m.Label,
                    sent     = bucket.Where(t => t.Direction == TransactionDirection.debit).Sum(t => t.Amount),
                    received = bucket.Where(t => t.Direction == TransactionDirection.credit).Sum(t => t.Amount),
                };
            }).ToList();

            var statusBreakdown = allTx
                .GroupBy(t => t.Status)
                .Select(g => new { status = g.Key.ToString(), count = g.Count() })
                .OrderByDescending(x => x.count)
                .ToList();

            return Ok(new
            {
                totalTransactions = allTx.Count,
                totalSent,
                totalReceived,
                pendingCount,
                blockedCount,
                postedCount,
                fraudCaseCount,
                monthlyFlow,
                statusBreakdown,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Analytics summary failed for user {UserId}", userId);
            return StatusCode(500, new { error = "Failed to compute analytics: " + ex.Message });
        }
    }

    private static object EmptySummary() => new
    {
        totalTransactions = 0,
        totalSent         = 0m,
        totalReceived     = 0m,
        pendingCount      = 0,
        blockedCount      = 0,
        postedCount       = 0,
        fraudCaseCount    = 0,
        monthlyFlow       = Array.Empty<object>(),
        statusBreakdown   = Array.Empty<object>(),
    };
}
