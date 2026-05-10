namespace SecureBank.API.Models.DTOs;

public class FraudCaseDto
{
    public Guid Id { get; set; }
    public Guid TransactionId { get; set; }
    public Guid AccountId { get; set; }
    public Guid UserId { get; set; }
    public string? CaseNumber { get; set; }
    public string Status { get; set; } = "open";
    public string? Resolution { get; set; }
    public string? ResolutionNotes { get; set; }
    public Guid? AnalystId { get; set; }
    public DateTime? AssignedAt { get; set; }
    public string? DisputeReason { get; set; }
    public string? DisputeDescription { get; set; }
    public string[]? EvidenceUrls { get; set; }
    public DateTime OpenedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime SlaDeadline { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<CaseTimelineDto>? Timeline { get; set; }
}

public class CaseTimelineDto
{
    public Guid Id { get; set; }
    public Guid CaseId { get; set; }
    public Guid? ActorId { get; set; }
    public string ActorType { get; set; } = "system";
    public string EventType { get; set; } = "";
    public string EventDescription { get; set; } = "";
    public string? Metadata { get; set; }
    public DateTime CreatedAt { get; set; }
}
