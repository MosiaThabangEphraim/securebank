namespace SecureBank.API.Models.Entities;

public class LoginHistory
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string? EmailAttempted { get; set; }
    public bool Success { get; set; }
    public string? FailureReason { get; set; }
    public DateTime AttemptedAt { get; set; }

    public Profile? User { get; set; }
}
