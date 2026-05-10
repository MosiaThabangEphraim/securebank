namespace SecureBank.API.Models.Entities;

public class Card
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public Guid UserId { get; set; }
    public string CardNumber { get; set; } = "";
    public string CardNumberLast4 { get; set; } = "";
    public string? Cvv { get; set; }
    public string CardHolderName { get; set; } = "";
    public int ExpiryMonth { get; set; }
    public int ExpiryYear { get; set; }
    public string CardType { get; set; } = "Visa";
    public string Status { get; set; } = "active";
    public bool AllowInternational { get; set; } = true;
    public bool AllowOnline { get; set; } = true;
    public bool AllowContactless { get; set; } = true;
    public decimal DailyLimit { get; set; } = 5000;
    public DateTime? IssuedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Account? Account { get; set; }
    public Profile? User { get; set; }
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
