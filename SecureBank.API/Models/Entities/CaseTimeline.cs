namespace SecureBank.API.Models.Entities;

public class CaseTimeline
{
    public Guid Id { get; set; }
    public Guid CaseId { get; set; }
    public Guid? ActorId { get; set; }
    public string ActorType { get; set; } = "system";
    public string EventType { get; set; } = "";
    public string EventDescription { get; set; } = "";
    public string? Metadata { get; set; }
    public DateTime CreatedAt { get; set; }

    public FraudCase? Case { get; set; }
    public Profile? Actor { get; set; }
}
