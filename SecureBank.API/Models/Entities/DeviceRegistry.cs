namespace SecureBank.API.Models.Entities;

public class DeviceRegistry
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FingerprintHash { get; set; } = "";
    public string? UserAgent { get; set; }
    public string? Browser { get; set; }
    public string? Os { get; set; }
    public string? DeviceType { get; set; }
    public string? IpAddress { get; set; }
    public string? Isp { get; set; }
    public bool VpnDetected { get; set; }
    public string? City { get; set; }
    public string? CountryCode { get; set; }
    public string TrustStatus { get; set; } = "unknown";
    public DateTime? TrustGrantedAt { get; set; }
    public DateTime? TrustRevokedAt { get; set; }
    public DateTime FirstSeenAt { get; set; }
    public DateTime LastSeenAt { get; set; }
    public int SessionCount { get; set; } = 1;
    public DateTime CreatedAt { get; set; }

    public Profile? User { get; set; }
    public ICollection<LoginHistory> LoginHistories { get; set; } = new List<LoginHistory>();
}
