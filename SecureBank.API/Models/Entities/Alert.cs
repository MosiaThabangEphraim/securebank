namespace SecureBank.API.Models.Entities;

public class Alert
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? TransactionId { get; set; }
    public Guid? FraudCaseId { get; set; }
    public string AlertType { get; set; } = "";
    public string Title { get; set; } = "";
    public string Message { get; set; } = "";
    public string Status { get; set; } = "unread";
    public bool ActionRequired { get; set; }
    public string? ActionUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }

    public Profile? User { get; set; }
    public Transaction? Transaction { get; set; }
    public FraudCase? FraudCase { get; set; }
}
