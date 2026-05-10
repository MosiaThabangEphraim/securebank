namespace SecureBank.API.Models.DTOs;

public class AccountDto
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
}

public class AccountSummaryDto
{
    public AccountDto Account { get; set; } = new();
    public List<TransactionDto> RecentTransactions { get; set; } = new();
    public int UnreadAlertsCount { get; set; }
}
