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
    public DbSet<FraudScore> FraudScores { get; set; }
    public DbSet<FraudCase> FraudCases { get; set; }
    public DbSet<CaseTimeline> CaseTimelines { get; set; }
    public DbSet<Beneficiary> Beneficiaries { get; set; }
    public DbSet<DeviceRegistry> DeviceRegistries { get; set; }
    public DbSet<LoginHistory> LoginHistories { get; set; }
    public DbSet<Alert> Alerts { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<UserFraudPreferences> UserFraudPreferences { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Supabase table names are plural snake_case — override the singular defaults
        modelBuilder.Entity<Profile>().ToTable("profiles");
        modelBuilder.Entity<Account>().ToTable("accounts");
        modelBuilder.Entity<Card>().ToTable("cards");
        modelBuilder.Entity<Transaction>().ToTable("transactions");
        modelBuilder.Entity<FraudScore>().ToTable("fraud_scores");
        modelBuilder.Entity<FraudCase>().ToTable("fraud_cases");
        modelBuilder.Entity<CaseTimeline>().ToTable("case_timelines");
        modelBuilder.Entity<Beneficiary>().ToTable("beneficiaries");
        modelBuilder.Entity<DeviceRegistry>().ToTable("device_registry");
        modelBuilder.Entity<LoginHistory>().ToTable("login_history");
        modelBuilder.Entity<Alert>().ToTable("alerts");
        modelBuilder.Entity<AuditLog>().ToTable("audit_logs");
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

        modelBuilder.Entity<Transaction>()
            .Ignore(t => t.MerchantName)
            .Ignore(t => t.MerchantCategory)
            .Ignore(t => t.MerchantMcc)
            .Ignore(t => t.MerchantLogoUrl)
            .Ignore(t => t.LocationCity)
            .Ignore(t => t.LocationCountry)
            .Ignore(t => t.Latitude)
            .Ignore(t => t.Longitude);

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

        modelBuilder.Entity<FraudScore>()
            .HasOne(fs => fs.Transaction)
            .WithOne(t => t.FraudScore)
            .HasForeignKey<FraudScore>(fs => fs.TransactionId);

        modelBuilder.Entity<FraudScore>()
            .HasOne(fs => fs.Account)
            .WithMany(a => a.FraudScores)
            .HasForeignKey(fs => fs.AccountId);

        modelBuilder.Entity<FraudScore>()
            .HasOne(fs => fs.User)
            .WithMany()
            .HasForeignKey(fs => fs.UserId);

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

        modelBuilder.Entity<CaseTimeline>()
            .HasOne(ct => ct.Case)
            .WithMany(fc => fc.Timeline)
            .HasForeignKey(ct => ct.CaseId);

        modelBuilder.Entity<CaseTimeline>()
            .HasOne(ct => ct.Actor)
            .WithMany()
            .HasForeignKey(ct => ct.ActorId)
            .IsRequired(false);

        modelBuilder.Entity<Beneficiary>()
            .HasOne(b => b.User)
            .WithMany(p => p.Beneficiaries)
            .HasForeignKey(b => b.UserId);

        modelBuilder.Entity<DeviceRegistry>()
            .HasOne(d => d.User)
            .WithMany(p => p.Devices)
            .HasForeignKey(d => d.UserId);

        modelBuilder.Entity<LoginHistory>()
            .Ignore(lh => lh.City)
            .Ignore(lh => lh.CountryCode)
            .Ignore(lh => lh.IpAddress)
            .Ignore(lh => lh.UserAgent)
            .Ignore(lh => lh.DeviceId)
            .Ignore(lh => lh.Device);

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

        modelBuilder.Entity<AuditLog>()
            .HasOne(al => al.User)
            .WithMany()
            .HasForeignKey(al => al.UserId)
            .IsRequired(false);

        modelBuilder.Entity<AuditLog>()
            .HasOne(al => al.Actor)
            .WithMany()
            .HasForeignKey(al => al.ActorId)
            .IsRequired(false);

        modelBuilder.Entity<AuditLog>()
            .HasOne(al => al.Device)
            .WithMany()
            .HasForeignKey(al => al.DeviceId)
            .IsRequired(false);

        modelBuilder.Entity<UserFraudPreferences>()
            .HasOne(ufp => ufp.User)
            .WithMany()
            .HasForeignKey(ufp => ufp.UserId);

        modelBuilder.Entity<FraudScore>()
            .Property(fs => fs.RiskScore)
            .HasColumnType("smallint");

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
