using SecureBank.API.Data;
using SecureBank.API.Models.Entities;
using SecureBank.API.Models.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Globalization;

namespace SecureBank.API.Services;

public class FraudScoringService
{
    private readonly SupabaseContext _context;
    private readonly ILogger<FraudScoringService> _logger;

    public FraudScoringService(SupabaseContext context, ILogger<FraudScoringService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ── Check only (no DB writes) ─────────────────────────────────────────────
    public async Task<FraudCheckResultDto> CheckOnlyAsync(
        Guid accountId, Guid userId, decimal amount, Guid? beneficiaryId)
    {
        var account = await _context.Accounts.FindAsync(accountId);
        var user    = await _context.Profiles.FindAsync(userId);
        if (account == null || user == null)
            return new FraudCheckResultDto { Flagged = false, RiskScore = 0, RiskLevel = "low" };

        var prefs = await GetOrCreatePreferencesAsync(userId);
        var stub = new Transaction
        {
            Id = Guid.Empty, AccountId = accountId, UserId = userId,
            BeneficiaryId = beneficiaryId, Amount = amount,
            Direction = TransactionDirection.debit, InitiatedAt = DateTime.UtcNow,
        };

        var rules  = new List<RuleDto>();
        int total  = 0;

        if (prefs.VelocityEnabled)      { var (s, r) = await CheckVelocityAsync(stub, prefs);           if (s > 0) { total += s; rules.Add(r); } }
        if (prefs.AmountCheckEnabled)   { var (s, r) = await CheckUnusualAmountAsync(stub, user, prefs); if (s > 0) { total += s; rules.Add(r); } }
        if (prefs.TimeCheckEnabled)     { var (s, r) = CheckTimeAsync(stub, prefs);                      if (s > 0) { total += s; rules.Add(r); } }
        if (prefs.DailyLimitEnabled)    { var (s, r) = await CheckDailyLimitAsync(stub, account, prefs); if (s > 0) { total += s; rules.Add(r); } }
        if (prefs.BalanceDrainEnabled)  { var (s, r) = await CheckBalanceDrainAsync(stub, account, prefs); if (s > 0) { total += s; rules.Add(r); } }
        if (prefs.DuplicateCheckEnabled){ var (s, r) = await CheckDuplicateAsync(stub, prefs);           if (s > 0) { total += s; rules.Add(r); } }
        if (prefs.InactiveDaysEnabled)  { var (s, r) = CheckInactiveDayAsync(stub, prefs);               if (s > 0) { total += s; rules.Add(r); } }

        total = Math.Min(total, 100);
        return new FraudCheckResultDto
        {
            Flagged   = rules.Count > 0,
            RiskScore = total,
            RiskLevel = GetRiskLevel(total),
            Reasons   = rules,
        };
    }

    public async Task<FraudScoreDto> ScoreTransactionAsync(
        Transaction transaction,
        Account account,
        Profile user)
    {
        var prefs = await GetOrCreatePreferencesAsync(user.Id);
        var rules = new List<RuleDto>();
        int totalScore = 0;

        if (prefs.VelocityEnabled)
        {
            var (score, rule) = await CheckVelocityAsync(transaction, prefs);
            if (score > 0)
            {
                totalScore += score;
                rules.Add(rule);
            }
        }

        if (prefs.AmountCheckEnabled)
        {
            var (score, rule) = await CheckUnusualAmountAsync(transaction, user, prefs);
            if (score > 0)
            {
                totalScore += score;
                rules.Add(rule);
            }
        }

        if (prefs.TimeCheckEnabled)
        {
            var (score, rule) = CheckTimeAsync(transaction, prefs);
            if (score > 0)
            {
                totalScore += score;
                rules.Add(rule);
            }
        }

        if (prefs.DailyLimitEnabled)
        {
            var (score, rule) = await CheckDailyLimitAsync(transaction, account, prefs);
            if (score > 0)
            {
                totalScore += score;
                rules.Add(rule);
            }
        }

        if (prefs.BalanceDrainEnabled)
        {
            var (score, rule) = await CheckBalanceDrainAsync(transaction, account, prefs);
            if (score > 0)
            {
                totalScore += score;
                rules.Add(rule);
            }
        }

        if (prefs.DuplicateCheckEnabled)
        {
            var (score, rule) = await CheckDuplicateAsync(transaction, prefs);
            if (score > 0)
            {
                totalScore += score;
                rules.Add(rule);
            }
        }

        if (prefs.InactiveDaysEnabled)
        {
            var (score, rule) = CheckInactiveDayAsync(transaction, prefs);
            if (score > 0)
            {
                totalScore += score;
                rules.Add(rule);
            }
        }

        totalScore = Math.Min(totalScore, 100);

        var riskLevel = GetRiskLevel(totalScore);
        var (status, autoApproved, stepUpRequired, blocked) = GetTransactionStatus(totalScore);

        var fraudScore = new FraudScore
        {
            Id = Guid.NewGuid(),
            TransactionId = transaction.Id,
            AccountId = account.Id,
            UserId = user.Id,
            RiskScore = totalScore,
            RiskLevel = riskLevel,
            TriggeredRules = JsonSerializer.Serialize(rules),
            AutoApproved = autoApproved,
            StepUpRequired = stepUpRequired,
            Blocked = blocked,
            ScoredAt = DateTime.UtcNow
        };

        transaction.Status = status;

        return MapToDto(fraudScore, rules);
    }

    private async Task<UserFraudPreferences> GetOrCreatePreferencesAsync(Guid userId)
    {
        var prefs = await _context.UserFraudPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (prefs != null) return prefs;

        prefs = new UserFraudPreferences
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.UserFraudPreferences.Add(prefs);
        await _context.SaveChangesAsync();
        return prefs;
    }

    private async Task<(int score, RuleDto rule)> CheckVelocityAsync(
        Transaction transaction,
        UserFraudPreferences prefs)
    {
        var windowStart = DateTime.UtcNow.AddMinutes(-prefs.VelocityWindowMinutes);
        var count = await _context.Transactions
            .Where(t => t.AccountId == transaction.AccountId &&
                   t.InitiatedAt >= windowStart &&
                   t.Id != transaction.Id)
            .CountAsync();

        if (count > prefs.VelocityMaxTxCount)
        {
            return (30, new RuleDto
            {
                Rule = "velocity_check",
                Score = 30,
                Detail = $"{count + 1} transactions in last {prefs.VelocityWindowMinutes} minutes"
            });
        }

        return (0, null!);
    }

    private async Task<(int score, RuleDto rule)> CheckUnusualAmountAsync(
        Transaction transaction,
        Profile user,
        UserFraudPreferences prefs)
    {
        var ninetyDaysAgo = DateTime.UtcNow.AddDays(-90);
        var avgAmount = await _context.Transactions
            .Where(t => t.UserId == user.Id && t.InitiatedAt >= ninetyDaysAgo && t.Status == TransactionStatus.posted)
            .AverageAsync(t => (decimal?)t.Amount) ?? 0;

        if (avgAmount == 0) return (0, null!);

        var threshold = avgAmount * (decimal)prefs.AmountMultiplier;
        if (transaction.Amount > threshold)
        {
            return (25, new RuleDto
            {
                Rule = "unusual_amount",
                Score = 25,
                Detail = $"{prefs.AmountMultiplier}x above your 90-day average of R{avgAmount:F2}"
            });
        }

        return (0, null!);
    }

    private (int score, RuleDto rule) CheckTimeAsync(
        Transaction transaction,
        UserFraudPreferences prefs)
    {
        var hour = DateTime.Now.Hour;
        if (hour < prefs.ActiveHoursStart || hour > prefs.ActiveHoursEnd)
        {
            return (20, new RuleDto
            {
                Rule = "unusual_time",
                Score = 20,
                Detail = $"Transaction at {hour:D2}:{DateTime.Now.Minute:D2}, outside your active hours {prefs.ActiveHoursStart}:00–{prefs.ActiveHoursEnd}:00"
            });
        }

        return (0, null!);
    }

    private async Task<(int score, RuleDto rule)> CheckDailyLimitAsync(
        Transaction transaction,
        Account account,
        UserFraudPreferences prefs)
    {
        var today = DateTime.UtcNow.Date;
        var todayTotal = await _context.Transactions
            .Where(t => t.AccountId == account.Id &&
                   t.Direction == TransactionDirection.debit &&
                   t.InitiatedAt.Date == today &&
                   t.Status == TransactionStatus.posted)
            .SumAsync(t => t.Amount);

        if ((todayTotal + transaction.Amount) > prefs.DailySpendLimit)
        {
            return (30, new RuleDto
            {
                Rule = "daily_limit",
                Score = 30,
                Detail = $"Exceeds your daily limit of R{prefs.DailySpendLimit:F2}. Spent R{todayTotal:F2} today."
            });
        }

        return (0, null!);
    }

    private async Task<(int score, RuleDto rule)> CheckBalanceDrainAsync(
        Transaction transaction,
        Account account,
        UserFraudPreferences prefs)
    {
        if (account.Balance <= 0) return (0, null!);

        var windowStart = DateTime.UtcNow.AddMinutes(-prefs.BalanceDrainWindowMinutes);
        var recentDebits = await _context.Transactions
            .Where(t => t.AccountId == account.Id &&
                   t.Direction == TransactionDirection.debit &&
                   t.InitiatedAt >= windowStart &&
                   t.Status == TransactionStatus.posted)
            .SumAsync(t => t.Amount);

        var drainPercent = ((recentDebits + transaction.Amount) / account.Balance) * 100;
        if (drainPercent > (decimal)prefs.BalanceDrainPercent)
        {
            return (40, new RuleDto
            {
                Rule = "balance_drain",
                Score = 40,
                Detail = $"{drainPercent:F1}% of your balance withdrawn in last {prefs.BalanceDrainWindowMinutes} minutes"
            });
        }

        return (0, null!);
    }

    private async Task<(int score, RuleDto rule)> CheckDuplicateAsync(
        Transaction transaction,
        UserFraudPreferences prefs)
    {
        if (transaction.Amount < prefs.DuplicateAmountThreshold)
            return (0, null!);

        var windowStart = DateTime.UtcNow.AddMinutes(-prefs.DuplicateWindowMinutes);
        var duplicateCount = await _context.Transactions
            .Where(t => t.AccountId == transaction.AccountId &&
                   t.Amount == transaction.Amount &&
                   t.BeneficiaryId == transaction.BeneficiaryId &&
                   t.InitiatedAt >= windowStart &&
                   t.Id != transaction.Id)
            .CountAsync();

        if (duplicateCount >= 1)
        {
            return (35, new RuleDto
            {
                Rule = "duplicate_transaction",
                Score = 35,
                Detail = $"Identical payment of R{transaction.Amount:F2} to the same recipient already processed recently"
            });
        }

        return (0, null!);
    }

    private (int score, RuleDto rule) CheckInactiveDayAsync(
        Transaction transaction,
        UserFraudPreferences prefs)
    {
        if (prefs.InactiveDays == null || prefs.InactiveDays.Length == 0)
            return (0, null!);

        var dayOfWeek = (int)DateTime.Now.DayOfWeek;
        if (prefs.InactiveDays.Contains(dayOfWeek))
        {
            var dayName = Enum.GetName(typeof(DayOfWeek), dayOfWeek) ?? "Unknown";
            return (25, new RuleDto
            {
                Rule = "inactive_day",
                Score = 25,
                Detail = $"Transactions on {dayName} are outside your normal activity pattern"
            });
        }

        return (0, null!);
    }

    private string GetRiskLevel(int score)
    {
        return score switch
        {
            <= 30 => "low",
            <= 60 => "medium",
            <= 80 => "high",
            _ => "critical"
        };
    }

    private (TransactionStatus status, bool autoApproved, bool stepUpRequired, bool blocked) GetTransactionStatus(int score)
    {
        return score switch
        {
            <= 30 => (TransactionStatus.posted, true, false, false),
            <= 60 => (TransactionStatus.posted, false, false, false),
            <= 80 => (TransactionStatus.quarantined, false, true, false),
            _ => (TransactionStatus.blocked, false, false, true)
        };
    }

    private FraudScoreDto MapToDto(FraudScore fraudScore, List<RuleDto> rules)
    {
        return new FraudScoreDto
        {
            Id = fraudScore.Id,
            TransactionId = fraudScore.TransactionId,
            AccountId = fraudScore.AccountId,
            UserId = fraudScore.UserId,
            RiskScore = fraudScore.RiskScore,
            RiskLevel = fraudScore.RiskLevel,
            TriggeredRules = rules,
            AutoApproved = fraudScore.AutoApproved,
            StepUpRequired = fraudScore.StepUpRequired,
            Blocked = fraudScore.Blocked,
            AnalystReviewed = fraudScore.AnalystReviewed,
            EngineVersion = fraudScore.EngineVersion,
            ScoredAt = fraudScore.ScoredAt
        };
    }
}
