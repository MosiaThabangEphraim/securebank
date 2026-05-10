using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SecureBank.API.Data;

namespace SecureBank.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly SupabaseContext _context;
    private readonly ILogger<AuthController> _logger;

    public AuthController(SupabaseContext context, ILogger<AuthController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpPost("check")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckAvailability([FromBody] CheckAvailabilityRequest request)
    {
        bool phoneTaken = false, nationalIdTaken = false, emailTaken = false;

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            phoneTaken = await _context.Profiles
                .AnyAsync(p => p.PhoneNumber == request.PhoneNumber.Trim());

        if (!string.IsNullOrWhiteSpace(request.NationalId))
            nationalIdTaken = await _context.Profiles
                .AnyAsync(p => p.NationalId == request.NationalId.Trim());

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var email = request.Email.Trim().ToLower();
            try
            {
                var results = await _context.Database
                    .SqlQuery<bool>($"SELECT EXISTS(SELECT 1 FROM auth.users WHERE LOWER(email) = {email})")
                    .ToListAsync();
                emailTaken = results.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Email availability check failed: {Message}", ex.Message);
            }
        }

        return Ok(new { phoneTaken, nationalIdTaken, emailTaken });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public IActionResult Login() =>
        Ok(new { message = "Login is handled by Supabase Auth" });

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout() =>
        Ok(new { message = "Logout is handled by Supabase Auth" });
}

public class CheckAvailabilityRequest
{
    public string? PhoneNumber { get; set; }
    public string? NationalId { get; set; }
    public string? Email { get; set; }
}
