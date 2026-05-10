namespace SecureBank.API.Models.Entities;

public class Account
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string AccountNumber { get; set; } = "";
    public string AccountType { get; set; } = "cheque";
    public string AccountName { get; set; } = "My Account";
    public decimal Balance { get; set; }
    public decimal AvailableBalance { get; set; }
    public string CurrencyCode { get; set; } = "ZAR";
    public string Status { get; set; } = "active";
    public decimal? InterestRate { get; set; }
    public decimal? CreditLimit { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Profile? User { get; set; }
    public ICollection<Card> Cards { get; set; } = new List<Card>();
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public ICollection<FraudScore> FraudScores { get; set; } = new List<FraudScore>();
    public ICollection<FraudCase> FraudCases { get; set; } = new List<FraudCase>();
}
