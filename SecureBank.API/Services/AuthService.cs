using SecureBank.API.Data;
using SecureBank.API.Models.Entities;
using Supabase;

namespace SecureBank.API.Services;

public class AuthService
{
    private readonly SupabaseContext _context;
    private readonly Client _supabaseClient;
    private readonly ILogger<AuthService> _logger;

    public AuthService(SupabaseContext context, IConfiguration config, ILogger<AuthService> logger)
    {
        _context = context;
        _logger = logger;
        
        var url = config["Supabase:Url"];
        var serviceRoleKey = config["Supabase:ServiceRoleKey"];
        
        if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(serviceRoleKey))
            throw new InvalidOperationException("Supabase configuration missing");

        var options = new SupabaseOptions
        {
            AutoConnectRealtime = false
        };

        _supabaseClient = new Client(url, serviceRoleKey, options);
    }

    public async Task<(Guid UserId, Profile Profile)> RegisterAsync(
        string email,
        string password,
        string fullName,
        string? phoneNumber = null,
        string? nationalId = null,
        string? dateOfBirth = null,
        string? address = null,
        string? city = null,
        string countryCode = "ZA")
    {
        try
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(fullName))
                throw new ArgumentException("Email, password, and full name are required");

            if (password.Length < 6)
                throw new ArgumentException("Password must be at least 6 characters");

            if (!IsValidEmail(email))
                throw new ArgumentException("Invalid email format");

            _logger.LogInformation("Creating Supabase user for {Email}", email);

            var session = await _supabaseClient.Auth.SignUp(email, password);
            if (session?.User == null)
                throw new InvalidOperationException("Failed to create Supabase user");

            var userId = Guid.Parse(session.User.Id!);

            _logger.LogInformation("Creating profile for user {UserId}", userId);

            DateTime? dob = null;
            if (!string.IsNullOrWhiteSpace(dateOfBirth) && DateTime.TryParse(dateOfBirth, out var parsedDob))
                dob = parsedDob;

            var profile = new Profile
            {
                Id = userId,
                FullName = fullName.Trim(),
                PhoneNumber = phoneNumber?.Trim(),
                NationalId = nationalId?.Trim(),
                DateOfBirth = dob,
                Address = address?.Trim(),
                City = city?.Trim(),
                CountryCode = string.IsNullOrWhiteSpace(countryCode) ? "ZA" : countryCode.Trim().ToUpperInvariant(),
                IsLocked = false,
                FailedLoginCount = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Profiles.Add(profile);
            
            // Create default UserFraudPreferences
            _logger.LogInformation($"Creating default fraud preferences for user {userId}");
            
            var fraudPrefs = new UserFraudPreferences
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                VelocityEnabled = true,
                VelocityMaxTxCount = 5,
                VelocityWindowMinutes = 60,
                AmountCheckEnabled = true,
                AmountMultiplier = 3.0m,
                TimeCheckEnabled = true,
                ActiveHoursStart = 6,
                ActiveHoursEnd = 23,
                DailyLimitEnabled = true,
                DailySpendLimit = 10000.00m,
                BalanceDrainEnabled = true,
                BalanceDrainPercent = 80.00m,
                BalanceDrainWindowMinutes = 60,
                DuplicateCheckEnabled = true,
                DuplicateWindowMinutes = 10,
                DuplicateAmountThreshold = 1.00m,
                InactiveDaysEnabled = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.UserFraudPreferences.Add(fraudPrefs);

            // Create a default account for the user
            _logger.LogInformation($"Creating default account for user {userId}");
            
            var account = new Account
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                AccountNumber = GenerateAccountNumber(),
                AccountType = "cheque",
                AccountName = "My Account",
                Balance = 50000.00m,
                AvailableBalance = 50000.00m,
                CurrencyCode = "ZAR",
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Accounts.Add(account);

            await _context.SaveChangesAsync();
            _logger.LogInformation($"User {userId} registered successfully");

            return (userId, profile);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Registration failed: {ex.Message}");
            throw;
        }
    }

    private bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }

    private string GenerateAccountNumber()
    {
        return "ZA" + Guid.NewGuid().ToString("N").Substring(0, 10).ToUpper();
    }
}
