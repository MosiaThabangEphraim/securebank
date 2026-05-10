namespace SecureBank.API.Models.Entities;

public class Profile
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = "";
    public string? PhoneNumber { get; set; }
    public string? NationalId { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string CountryCode { get; set; } = "ZA";
    public string? ProfilePictureUrl { get; set; }
    public bool IsLocked { get; set; }
    public int FailedLoginCount { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Account> Accounts { get; set; } = new List<Account>();
    public ICollection<Card> Cards { get; set; } = new List<Card>();
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public ICollection<Beneficiary> Beneficiaries { get; set; } = new List<Beneficiary>();
    public ICollection<DeviceRegistry> Devices { get; set; } = new List<DeviceRegistry>();
    public ICollection<LoginHistory> LoginHistories { get; set; } = new List<LoginHistory>();
    public ICollection<Alert> Alerts { get; set; } = new List<Alert>();
    public ICollection<FraudCase> FraudCases { get; set; } = new List<FraudCase>();
}
