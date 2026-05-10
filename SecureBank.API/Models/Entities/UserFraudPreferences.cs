namespace SecureBank.API.Models.Entities;

public class UserFraudPreferences
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public bool VelocityEnabled { get; set; } = true;
    public int VelocityMaxTxCount { get; set; } = 5;
    public int VelocityWindowMinutes { get; set; } = 60;
    public bool AmountCheckEnabled { get; set; } = true;
    public decimal AmountMultiplier { get; set; } = 3.0m;
    public bool TimeCheckEnabled { get; set; } = true;
    public int ActiveHoursStart { get; set; } = 6;
    public int ActiveHoursEnd { get; set; } = 23;
    public bool DailyLimitEnabled { get; set; } = true;
    public decimal DailySpendLimit { get; set; } = 10000.00m;
    public bool BalanceDrainEnabled { get; set; } = true;
    public decimal BalanceDrainPercent { get; set; } = 80.00m;
    public int BalanceDrainWindowMinutes { get; set; } = 60;
    public bool DuplicateCheckEnabled { get; set; } = true;
    public int DuplicateWindowMinutes { get; set; } = 10;
    public decimal DuplicateAmountThreshold { get; set; } = 1.00m;
    public bool InactiveDaysEnabled { get; set; }
    public int[]? InactiveDays { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Profile? User { get; set; }
}
