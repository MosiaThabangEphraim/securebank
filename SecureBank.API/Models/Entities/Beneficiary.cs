namespace SecureBank.API.Models.Entities;

public class Beneficiary
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FullName { get; set; } = "";
    public string AccountNumber { get; set; } = "";
    public string BankName { get; set; } = "";
    public string? BranchCode { get; set; }
    public string? Reference { get; set; }
    public bool IsVerified { get; set; }
    public bool IsBlocked { get; set; }
    public DateTime CreatedAt { get; set; }

    public Profile? User { get; set; }
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
