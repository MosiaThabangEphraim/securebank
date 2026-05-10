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
public class CardsController : ControllerBase
{
    private readonly SupabaseContext _context;
    private readonly ILogger<CardsController> _logger;

    public CardsController(SupabaseContext context, ILogger<CardsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id : null;

    [HttpPost]
    public async Task<IActionResult> IssueCard([FromBody] IssueCardRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.AccountId && a.UserId == userId);

        if (account == null) return NotFound(new { error = "Account not found." });

        var cardNumber = string.Join("", Enumerable.Range(0, 16).Select(_ => Random.Shared.Next(0, 10)));
        var now = DateTime.UtcNow;

        var card = new Card
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            UserId = userId.Value,
            CardNumber = cardNumber,
            Cvv = Random.Shared.Next(100, 999).ToString(),
            CardHolderName = request.CardHolderName.Trim().ToUpperInvariant(),
            ExpiryMonth = now.Month,
            ExpiryYear = now.Year + 5,
            CardType = request.CardType,
            Status = "active",
            AllowInternational = false,
            AllowOnline = true,
            AllowContactless = true,
            DailyLimit = request.DailyLimit,
            IssuedAt = now,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await _context.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO cards (id, account_id, allow_contactless, allow_international, allow_online,
                card_holder_name, card_number, card_type, created_at, cvv, daily_limit,
                expiry_month, expiry_year, issued_at, last_used_at, status, updated_at, user_id)
            VALUES ({card.Id}, {card.AccountId}, {card.AllowContactless}, {card.AllowInternational}, {card.AllowOnline},
                {card.CardHolderName}, {card.CardNumber}, {card.CardType}, {card.CreatedAt}, {card.Cvv}, {card.DailyLimit},
                {card.ExpiryMonth}, {card.ExpiryYear}, {card.IssuedAt}, {card.LastUsedAt}, {"active"}::card_status, {card.UpdatedAt}, {card.UserId})
            """);

        return Ok(MapCard(card));
    }

    [HttpGet]
    public async Task<IActionResult> GetCards()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var cards = await _context.Cards
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return Ok(cards.Select(MapCard));
    }

    [HttpPatch("{id}/freeze")]
    public async Task<IActionResult> FreezeCard(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var now = DateTime.UtcNow;
        var affected = await _context.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE cards SET status = {"frozen"}::card_status, updated_at = {now} WHERE id = {id} AND user_id = {userId.Value}");

        if (affected == 0) return NotFound(new { error = "Card not found." });

        var card = await _context.Cards.FirstOrDefaultAsync(c => c.Id == id);
        return Ok(MapCard(card!));
    }

    [HttpPatch("{id}/unfreeze")]
    public async Task<IActionResult> UnfreezeCard(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var now = DateTime.UtcNow;
        var affected = await _context.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE cards SET status = {"active"}::card_status, updated_at = {now} WHERE id = {id} AND user_id = {userId.Value}");

        if (affected == 0) return NotFound(new { error = "Card not found." });

        var card = await _context.Cards.FirstOrDefaultAsync(c => c.Id == id);
        return Ok(MapCard(card!));
    }

    [HttpPatch("{id}/controls")]
    public async Task<IActionResult> UpdateCardControls(Guid id, [FromBody] UpdateCardControlsRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var card = await _context.Cards
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

        if (card == null) return NotFound(new { error = "Card not found." });

        if (request.AllowInternational.HasValue) card.AllowInternational = request.AllowInternational.Value;
        if (request.AllowOnline.HasValue)        card.AllowOnline        = request.AllowOnline.Value;
        if (request.AllowContactless.HasValue)   card.AllowContactless   = request.AllowContactless.Value;
        if (request.DailyLimit.HasValue)         card.DailyLimit         = request.DailyLimit.Value;

        card.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapCard(card));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCard(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var card = await _context.Cards
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

        if (card == null) return NotFound(new { error = "Card not found." });

        _context.Cards.Remove(card);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Card deleted." });
    }

    private static object MapCard(Card c) => new
    {
        id = c.Id,
        accountId = c.AccountId,
        userId = c.UserId,
        cardNumber = c.CardNumber,
        cardNumberLast4 = c.CardNumber.Length >= 4 ? c.CardNumber[^4..] : c.CardNumber,
        cvv = c.Cvv,
        cardHolderName = c.CardHolderName,
        expiryMonth = c.ExpiryMonth,
        expiryYear = c.ExpiryYear,
        cardType = c.CardType,
        status = c.Status,
        allowInternational = c.AllowInternational,
        allowOnline = c.AllowOnline,
        allowContactless = c.AllowContactless,
        dailyLimit = c.DailyLimit,
        issuedAt = c.IssuedAt,
        lastUsedAt = c.LastUsedAt,
        createdAt = c.CreatedAt,
        updatedAt = c.UpdatedAt,
    };
}

public class IssueCardRequest
{
    public Guid AccountId { get; set; }
    public string CardType { get; set; } = "visa";
    public string CardHolderName { get; set; } = "";
    public decimal DailyLimit { get; set; } = 5000;
}

public class UpdateCardControlsRequest
{
    public bool? AllowInternational { get; set; }
    public bool? AllowOnline { get; set; }
    public bool? AllowContactless { get; set; }
    public decimal? DailyLimit { get; set; }
}
