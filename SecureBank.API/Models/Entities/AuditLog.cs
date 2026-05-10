namespace SecureBank.API.Models.Entities;

public class AuditLog
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public Guid? ActorId { get; set; }
    public string Action { get; set; } = "";
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? IpAddress { get; set; }
    public Guid? DeviceId { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }

    public Profile? User { get; set; }
    public Profile? Actor { get; set; }
    public DeviceRegistry? Device { get; set; }
}
