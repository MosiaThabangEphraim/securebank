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
public class BeneficiariesController : ControllerBase
{
    private readonly SupabaseContext _context;
    private readonly ILogger<BeneficiariesController> _logger;

    public BeneficiariesController(SupabaseContext context, ILogger<BeneficiariesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id : null;

    [HttpGet]
    public async Task<IActionResult> GetBeneficiaries()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var beneficiaries = await _context.Beneficiaries
            .Where(b => b.UserId == userId)
            .OrderBy(b => b.FullName)
            .ToListAsync();

        return Ok(beneficiaries.Select(MapBeneficiary));
    }

    [HttpPost]
    public async Task<IActionResult> AddBeneficiary([FromBody] AddBeneficiaryRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var beneficiary = new Beneficiary
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            FullName = request.FullName,
            AccountNumber = request.AccountNumber,
            BankName = request.BankName,
            BranchCode = request.BranchCode,
            Reference = request.Reference,
            IsVerified = false,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Beneficiaries.Add(beneficiary);
        await _context.SaveChangesAsync();

        return Ok(MapBeneficiary(beneficiary));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> RemoveBeneficiary(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var beneficiary = await _context.Beneficiaries
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

        if (beneficiary == null) return NotFound(new { error = "Beneficiary not found." });

        _context.Beneficiaries.Remove(beneficiary);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Beneficiary removed." });
    }

    [HttpPatch("{id}/block")]
    public async Task<IActionResult> BlockBeneficiary(Guid id, [FromBody] BlockBeneficiaryRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid or missing user token." });

        var beneficiary = await _context.Beneficiaries
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

        if (beneficiary == null) return NotFound(new { error = "Beneficiary not found." });

        beneficiary.IsBlocked = request.Block;
        await _context.SaveChangesAsync();

        return Ok(MapBeneficiary(beneficiary));
    }

    private static object MapBeneficiary(Beneficiary b) => new
    {
        id = b.Id,
        userId = b.UserId,
        fullName = b.FullName,
        accountNumber = b.AccountNumber,
        bankName = b.BankName,
        branchCode = b.BranchCode,
        reference = b.Reference,
        isVerified = b.IsVerified,
        isBlocked = b.IsBlocked,
        createdAt = b.CreatedAt,
    };
}

public class AddBeneficiaryRequest
{
    public string FullName { get; set; } = "";
    public string AccountNumber { get; set; } = "";
    public string BankName { get; set; } = "";
    public string? BranchCode { get; set; }
    public string? Reference { get; set; }
}

public class BlockBeneficiaryRequest
{
    public bool Block { get; set; }
}
