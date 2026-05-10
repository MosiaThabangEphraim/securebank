namespace SecureBank.API.Models.Entities;

public class FraudScore
{
    public Guid Id { get; set; }
    public Guid TransactionId { get; set; }
    public Guid AccountId { get; set; }
    public Guid UserId { get; set; }
    public int RiskScore { get; set; }
    public string RiskLevel { get; set; } = "low";
    public string? TriggeredRules { get; set; }
    public bool AutoApproved { get; set; }
    public bool StepUpRequired { get; set; }
    public bool Blocked { get; set; }
    public bool AnalystReviewed { get; set; }
    public string EngineVersion { get; set; } = "1.0.0";
    public DateTime ScoredAt { get; set; }

    public Transaction? Transaction { get; set; }
    public Account? Account { get; set; }
    public Profile? User { get; set; }
}
