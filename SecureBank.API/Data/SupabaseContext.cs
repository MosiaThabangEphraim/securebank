using Microsoft.EntityFrameworkCore;
using SecureBank.API.Models.Entities;

namespace SecureBank.API.Data;

public class SupabaseContext : DbContext
{
    public SupabaseContext(DbContextOptions<SupabaseContext> options) : base(options) { }

    public DbSet<Profile> Profiles { get; set; }
    public DbSet<Account> Accounts { get; set; }
    public DbSet<Card> Cards { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<FraudCase> FraudCases { get; set; }
    public DbSet<Beneficiary> Beneficiaries { get; set; }
    public DbSet<LoginHistory> LoginHistories { get; set; }
    public DbSet<Alert> Alerts { get; set; }
    public DbSet<UserFraudPreferences> UserFraudPreferences { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Profile>().ToTable("profiles");
        modelBuilder.Entity<Account>().ToTable("accounts");
        modelBuilder.Entity<Card>().ToTable("cards");
        modelBuilder.Entity<Transaction>().ToTable("transactions");
        modelBuilder.Entity<FraudCase>().ToTable("fraud_cases");
        modelBuilder.Entity<Beneficiary>().ToTable("beneficiaries");
        modelBuilder.Entity<LoginHistory>().ToTable("login_history");
        modelBuilder.Entity<Alert>().ToTable("alerts");
        modelBuilder.Entity<UserFraudPreferences>().ToTable("user_fraud_preferences");

        modelBuilder.Entity<Account>()
            .HasOne(a => a.User)
            .WithMany(p => p.Accounts)
            .HasForeignKey(a => a.UserId);

        modelBuilder.Entity<Card>()
            .HasOne(c => c.Account)
            .WithMany(a => a.Cards)
            .HasForeignKey(c => c.AccountId);

        modelBuilder.Entity<Card>()
            .HasOne(c => c.User)
            .WithMany(p => p.Cards)
            .HasForeignKey(c => c.UserId);

        modelBuilder.Entity<Card>()
            .Ignore(c => c.CardNumberLast4);

        modelBuilder.HasPostgresEnum<TransactionDirection>(name: "transaction_direction");
        modelBuilder.HasPostgresEnum<TransactionStatus>(name: "transaction_status");

        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Account)
            .WithMany(a => a.Transactions)
            .HasForeignKey(t => t.AccountId);

        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.User)
            .WithMany(p => p.Transactions)
            .HasForeignKey(t => t.UserId);

        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Card)
            .WithMany(c => c.Transactions)
            .HasForeignKey(t => t.CardId)
            .IsRequired(false);

        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Beneficiary)
            .WithMany(b => b.Transactions)
            .HasForeignKey(t => t.BeneficiaryId)
            .IsRequired(false);

        modelBuilder.Entity<FraudCase>()
            .HasOne(fc => fc.Transaction)
            .WithMany()
            .HasForeignKey(fc => fc.TransactionId);

        modelBuilder.Entity<FraudCase>()
            .HasOne(fc => fc.Account)
            .WithMany(a => a.FraudCases)
            .HasForeignKey(fc => fc.AccountId);

        modelBuilder.Entity<FraudCase>()
            .HasOne(fc => fc.User)
            .WithMany(p => p.FraudCases)
            .HasForeignKey(fc => fc.UserId);

        modelBuilder.Entity<FraudCase>()
            .HasOne(fc => fc.Analyst)
            .WithMany()
            .HasForeignKey(fc => fc.AnalystId)
            .IsRequired(false);

        modelBuilder.Entity<Beneficiary>()
            .HasOne(b => b.User)
            .WithMany(p => p.Beneficiaries)
            .HasForeignKey(b => b.UserId);

        modelBuilder.Entity<LoginHistory>()
            .HasOne(lh => lh.User)
            .WithMany(p => p.LoginHistories)
            .HasForeignKey(lh => lh.UserId)
            .IsRequired(false);

        modelBuilder.Entity<Alert>()
            .HasOne(a => a.User)
            .WithMany(p => p.Alerts)
            .HasForeignKey(a => a.UserId);

        modelBuilder.Entity<Alert>()
            .HasOne(a => a.Transaction)
            .WithMany(t => t.Alerts)
            .HasForeignKey(a => a.TransactionId)
            .IsRequired(false);

        modelBuilder.Entity<Alert>()
            .HasOne(a => a.FraudCase)
            .WithMany()
            .HasForeignKey(a => a.FraudCaseId)
            .IsRequired(false);

        modelBuilder.Entity<UserFraudPreferences>()
            .HasOne(ufp => ufp.User)
            .WithMany()
            .HasForeignKey(ufp => ufp.UserId);

        foreach (var entity in modelBuilder.Model.GetEntityTypes())
            foreach (var property in entity.GetProperties())
                property.SetColumnName(ToSnakeCase(property.Name));
    }

    private static string ToSnakeCase(string name)
    {
        var sb = new System.Text.StringBuilder();
        for (int i = 0; i < name.Length; i++)
        {
            if (char.IsUpper(name[i]) && i > 0)
                sb.Append('_');
            sb.Append(char.ToLower(name[i]));
        }
        return sb.ToString();
    }
}
