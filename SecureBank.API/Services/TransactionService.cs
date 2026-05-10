using Microsoft.EntityFrameworkCore;
using SecureBank.API.Data;
using SecureBank.API.Models.Entities;
using SecureBank.API.Models.DTOs;

namespace SecureBank.API.Services;

public class TransactionService
{
    private readonly SupabaseContext _context;
    private readonly FraudScoringService _fraud;
    private readonly ILogger<TransactionService> _logger;

    public TransactionService(SupabaseContext context, FraudScoringService fraud, ILogger<TransactionService> logger)
    {
        _context = context;
        _fraud = fraud;
        _logger = logger;
    }

    public async Task<TransactionResult> SubmitAsync(SubmitTransactionRequest request, Guid userId)
    {
        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.AccountId && a.UserId == userId);

        if (account == null)
            return TransactionResult.Fail("Account not found or does not belong to you.", 404);

        if (account.Status != "active")
            return TransactionResult.Fail("Account is not active.", 400);

        if (request.Direction == "debit" && account.AvailableBalance < request.Amount)
            return TransactionResult.Fail("Insufficient funds.", 400);

        var user = await _context.Profiles.FindAsync(userId);
        if (user == null)
            return TransactionResult.Fail("User profile not found.", 404);

        var now = DateTime.UtcNow;
        var transaction = new Transaction
        {
            Id              = Guid.NewGuid(),
            AccountId       = account.Id,
            UserId          = userId,
            BeneficiaryId   = request.BeneficiaryId,
            Amount          = request.Amount,
            Direction       = Enum.Parse<TransactionDirection>(request.Direction, ignoreCase: true),
            CurrencyCode    = account.CurrencyCode,
            Description     = request.Description,
            Notes           = request.Notes,
            ReferenceNumber = request.ReferenceNumber ?? GenerateReference(),
            Status          = TransactionStatus.pending,
            IsInternational = false,
            InitiatedAt     = now,
            CreatedAt       = now,
            UpdatedAt       = now,
        };

        _context.Transactions.Add(transaction);

        // Run server-side fraud scoring — records the score in DB for auditing
        var fraudScore = await _fraud.ScoreTransactionAsync(transaction, account, user);

        // Use the status the user decided on (after seeing the fraud warning in the UI)
        transaction.Status = Enum.Parse<TransactionStatus>(request.Status, ignoreCase: true);

        // Update account balance if the transaction is being posted
        if (transaction.Status == TransactionStatus.posted)
        {
            if (transaction.Direction == TransactionDirection.debit)
            {
                account.Balance          -= transaction.Amount;
                account.AvailableBalance -= transaction.Amount;
            }
            else
            {
                account.Balance          += transaction.Amount;
                account.AvailableBalance += transaction.Amount;
            }
            transaction.RunningBalance = account.Balance;
            transaction.PostedAt       = now;
            account.UpdatedAt          = now;

            // Auto-verify beneficiary on first successful payment
            if (transaction.BeneficiaryId.HasValue)
            {
                var ben = await _context.Beneficiaries
                    .FirstOrDefaultAsync(b => b.Id == transaction.BeneficiaryId && b.UserId == userId && !b.IsVerified);
                if (ben != null) ben.IsVerified = true;
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Transaction {Id} for user {UserId}: status={Status} fraudScore={Score}",
            transaction.Id, userId, transaction.Status, fraudScore.RiskScore);

        return TransactionResult.Ok(MapToDto(transaction, fraudScore));
    }

    private static string GenerateReference() =>
        "SB" + DateTime.UtcNow.ToString("yyyyMMdd") + Random.Shared.Next(100000, 999999);

    private static TransactionDto MapToDto(Transaction t, FraudScoreDto score) => new()
    {
        Id              = t.Id,
        AccountId       = t.AccountId,
        UserId          = t.UserId,
        BeneficiaryId   = t.BeneficiaryId,
        Amount          = t.Amount,
        Direction       = t.Direction.ToString(),
        CurrencyCode    = t.CurrencyCode,
        RunningBalance  = t.RunningBalance,
        Description     = t.Description,
        ReferenceNumber = t.ReferenceNumber,
        Status          = t.Status.ToString(),
        IsInternational = t.IsInternational,
        InitiatedAt     = t.InitiatedAt,
        PostedAt        = t.PostedAt,
        CreatedAt       = t.CreatedAt,
        UpdatedAt       = t.UpdatedAt,
        FraudScore      = score,
    };
}

public class ScoreTransactionRequest
{
    public Guid AccountId { get; set; }
    public Guid? BeneficiaryId { get; set; }
    public decimal Amount { get; set; }
}

public class SubmitTransactionRequest
{
    public Guid AccountId { get; set; }
    public Guid? BeneficiaryId { get; set; }
    public decimal Amount { get; set; }
    public string Direction { get; set; } = "debit";
    public string Status { get; set; } = "posted";
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public string? ReferenceNumber { get; set; }
}

public class TransactionResult
{
    public bool Success { get; private set; }
    public int StatusCode { get; private set; }
    public string? Error { get; private set; }
    public TransactionDto? Data { get; private set; }

    public static TransactionResult Ok(TransactionDto data) =>
        new() { Success = true, StatusCode = 200, Data = data };

    public static TransactionResult Fail(string error, int code) =>
        new() { Success = false, StatusCode = code, Error = error };
}
