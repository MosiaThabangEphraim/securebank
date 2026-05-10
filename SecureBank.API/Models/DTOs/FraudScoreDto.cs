namespace SecureBank.API.Models.DTOs;

public class FraudScoreDto
{
    public Guid Id { get; set; }
    public Guid TransactionId { get; set; }
    public Guid AccountId { get; set; }
    public Guid UserId { get; set; }
    public int RiskScore { get; set; }
    public string RiskLevel { get; set; } = "low";
    public List<RuleDto>? TriggeredRules { get; set; }
    public bool AutoApproved { get; set; }
    public bool StepUpRequired { get; set; }
    public bool Blocked { get; set; }
    public bool AnalystReviewed { get; set; }
    public string EngineVersion { get; set; } = "1.0.0";
    public DateTime ScoredAt { get; set; }
}

public class RuleDto
{
    public string Rule { get; set; } = "";
    public int Score { get; set; }
    public string Detail { get; set; } = "";
}

public class FraudCheckResultDto
{
    public bool Flagged { get; set; }
    public int RiskScore { get; set; }
    public string RiskLevel { get; set; } = "low";
    public List<RuleDto> Reasons { get; set; } = [];
}
