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
public class AccountsController : ControllerBase
{
    private readonly SupabaseContext _context;
    private readonly ILogger<AccountsController> _logger;

    public AccountsController(SupabaseContext context, ILogger<AccountsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id : null;

    [HttpGet]
    public async Task<IActionResult> GetAllAccounts()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var accounts = await _context.Accounts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(accounts.Select(MapAccount));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAccount(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (account == null) return NotFound(new { error = "Account not found." });
        return Ok(MapAccount(account));
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateAccount(Guid id, [FromBody] UpdateAccountRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (account == null) return NotFound(new { error = "Account not found." });

        if (request.Status == "closed")
        {
            if (account.Balance > 1 || account.AvailableBalance > 1)
                return BadRequest(new { error = "Cannot close an account with a balance above R1. Please withdraw remaining funds first." });
            if (account.Balance < 0 || account.AvailableBalance < 0)
                return BadRequest(new { error = "Cannot close an account with a negative balance. Please clear the outstanding amount first." });
        }

        if (request.Status != null)
        {
            var now = DateTime.UtcNow;
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE accounts SET status = {request.Status}::account_status, updated_at = {now} WHERE id = {id} AND user_id = {userId.Value}");
        }

        account = await _context.Accounts.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        return Ok(MapAccount(account!));
    }

    private static object MapAccount(Account a) => new
    {
        id = a.Id,
        userId = a.UserId,
        accountNumber = a.AccountNumber,
        accountType = a.AccountType,
        accountName = a.AccountName,
        balance = a.Balance,
        availableBalance = a.AvailableBalance,
        currencyCode = a.CurrencyCode,
        status = a.Status,
        interestRate = a.InterestRate,
        creditLimit = a.CreditLimit,
        createdAt = a.CreatedAt,
        updatedAt = a.UpdatedAt,
    };
}

public class UpdateAccountRequest
{
    public string? Status { get; set; }
}
