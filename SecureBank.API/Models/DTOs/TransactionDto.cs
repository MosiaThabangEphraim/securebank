namespace SecureBank.API.Models.DTOs;

public class TransactionDto
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public Guid UserId { get; set; }
    public Guid? CardId { get; set; }
    public Guid? BeneficiaryId { get; set; }
    public decimal Amount { get; set; }
    public string Direction { get; set; } = "";
    public string CurrencyCode { get; set; } = "ZAR";
    public decimal? RunningBalance { get; set; }
    public string? MerchantName { get; set; }
    public string? MerchantCategory { get; set; }
    public string? MerchantMcc { get; set; }
    public string? MerchantLogoUrl { get; set; }
    public string? LocationCity { get; set; }
    public string? LocationCountry { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public bool IsInternational { get; set; }
    public string Status { get; set; } = "pending";
    public string? ReferenceNumber { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public DateTime InitiatedAt { get; set; }
    public DateTime? PostedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public FraudScoreDto? FraudScore { get; set; }
}
