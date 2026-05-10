using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SecureBank.API.Data;
using SecureBank.API.Models.Entities;
using SecureBank.API.Services;
using System.Security.Claims;

namespace SecureBank.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly SupabaseContext _context;
    private readonly TransactionService _transactionService;
    private readonly FraudScoringService _fraudService;
    private readonly ILogger<TransactionsController> _logger;

    public TransactionsController(
        SupabaseContext context,
        TransactionService transactionService,
        FraudScoringService fraudService,
        ILogger<TransactionsController> logger)
    {
        _context            = context;
        _transactionService = transactionService;
        _fraudService       = fraudService;
        _logger             = logger;
    }

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id : null;

    [HttpGet]
    public async Task<IActionResult> GetTransactions([FromQuery] string? status = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var query = _context.Transactions.Where(t => t.UserId == userId);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<TransactionStatus>(status, ignoreCase: true, out var parsedStatus))
            query = query.Where(t => t.Status == parsedStatus);

        var transactions = await query
            .OrderByDescending(t => t.InitiatedAt)
            .ToListAsync();

        return Ok(transactions.Select(MapTransaction));
    }

    [HttpPost("score")]
    public async Task<IActionResult> ScoreTransaction([FromBody] ScoreTransactionRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var result = await _fraudService.CheckOnlyAsync(
            request.AccountId, userId.Value, request.Amount, request.BeneficiaryId);

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTransaction([FromBody] SubmitTransactionRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var result = await _transactionService.SubmitAsync(request, userId.Value);

        if (!result.Success)
        {
            return result.StatusCode switch
            {
                404 => NotFound(new { error = result.Error }),
                _   => BadRequest(new { error = result.Error }),
            };
        }

        return Ok(result.Data);
    }

    [HttpPost("internal-transfer")]
    public async Task<IActionResult> InternalTransfer([FromBody] InternalTransferRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var fromAccount = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.FromAccountId && a.UserId == userId);
        if (fromAccount == null) return NotFound(new { error = "Source account not found." });
        if (fromAccount.Status != "active") return BadRequest(new { error = "Source account is not active." });
        if (fromAccount.AvailableBalance < request.Amount) return BadRequest(new { error = "Insufficient funds." });

        var toAccount = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.ToAccountId && a.UserId == userId);
        if (toAccount == null) return NotFound(new { error = "Destination account not found." });
        if (toAccount.Status != "active") return BadRequest(new { error = "Destination account is not active." });

        var now = DateTime.UtcNow;
        var refDebit  = "SB" + now.ToString("yyyyMMdd") + Random.Shared.Next(100000, 999999);
        var refCredit = "SB" + now.ToString("yyyyMMdd") + Random.Shared.Next(100000, 999999);

        fromAccount.Balance          -= request.Amount;
        fromAccount.AvailableBalance -= request.Amount;
        fromAccount.UpdatedAt         = now;

        toAccount.Balance            += request.Amount;
        toAccount.AvailableBalance   += request.Amount;
        toAccount.UpdatedAt           = now;

        var debit = new Transaction
        {
            Id = Guid.NewGuid(), AccountId = fromAccount.Id, UserId = userId.Value,
            Amount = request.Amount, Direction = TransactionDirection.debit,
            CurrencyCode = fromAccount.CurrencyCode, RunningBalance = fromAccount.Balance,
            Description = request.Description ?? $"Transfer to {toAccount.AccountName}",
            ReferenceNumber = refDebit, Status = TransactionStatus.posted,
            IsInternational = false, InitiatedAt = now, PostedAt = now, CreatedAt = now, UpdatedAt = now,
        };

        var credit = new Transaction
        {
            Id = Guid.NewGuid(), AccountId = toAccount.Id, UserId = userId.Value,
            Amount = request.Amount, Direction = TransactionDirection.credit,
            CurrencyCode = toAccount.CurrencyCode, RunningBalance = toAccount.Balance,
            Description = request.Description ?? $"Transfer from {fromAccount.AccountName}",
            ReferenceNumber = refCredit, Status = TransactionStatus.posted,
            IsInternational = false, InitiatedAt = now, PostedAt = now, CreatedAt = now, UpdatedAt = now,
        };

        _context.Transactions.AddRange(debit, credit);
        await _context.SaveChangesAsync();

        return Ok(new { debitTransactionId = debit.Id, creditTransactionId = credit.Id });
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateTransactionStatus(Guid id, [FromBody] UpdateTransactionStatusRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        if (!Enum.TryParse<TransactionStatus>(request.Status, ignoreCase: true, out var newStatus))
            return BadRequest(new { error = "Invalid status value." });

        var tx = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (tx == null) return NotFound(new { error = "Transaction not found." });

        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == tx.AccountId && a.UserId == userId);

        if (account == null) return NotFound(new { error = "Account not found." });

        var oldStatus = tx.Status;
        tx.Status = newStatus;
        tx.UpdatedAt = DateTime.UtcNow;

        if (oldStatus == TransactionStatus.pending && newStatus == TransactionStatus.posted)
        {
            if (tx.Direction == TransactionDirection.debit)
            {
                account.Balance          -= tx.Amount;
                account.AvailableBalance -= tx.Amount;
            }
            else
            {
                account.Balance          += tx.Amount;
                account.AvailableBalance += tx.Amount;
            }
            tx.RunningBalance  = account.Balance;
            tx.PostedAt        = DateTime.UtcNow;
            account.UpdatedAt  = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(MapTransaction(tx));
    }

    private static object MapTransaction(Transaction t) => new
    {
        id              = t.Id,
        accountId       = t.AccountId,
        userId          = t.UserId,
        cardId          = t.CardId,
        beneficiaryId   = t.BeneficiaryId,
        amount          = t.Amount,
        direction       = t.Direction.ToString(),
        currencyCode    = t.CurrencyCode,
        runningBalance  = t.RunningBalance,
        isInternational = t.IsInternational,
        status          = t.Status.ToString(),
        referenceNumber = t.ReferenceNumber,
        description     = t.Description,
        notes           = t.Notes,
        initiatedAt     = t.InitiatedAt,
        postedAt        = t.PostedAt,
        createdAt       = t.CreatedAt,
        updatedAt       = t.UpdatedAt,
    };
}

public class UpdateTransactionStatusRequest
{
    public string Status { get; set; } = "";
}

public class InternalTransferRequest
{
    public Guid FromAccountId { get; set; }
    public Guid ToAccountId { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
}
