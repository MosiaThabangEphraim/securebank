using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using SecureBank.API.Data;
using SecureBank.API.Services;
using SecureBank.API.Middleware;
using SecureBank.API.Models.Entities;
using System.Text;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var connString  = builder.Configuration.GetConnectionString("DefaultConnection");
var jwtSecret   = builder.Configuration["Jwt:Secret"];
var jwtIssuer   = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrEmpty(jwtIssuer))
    throw new InvalidOperationException("Jwt:Issuer not configured");

var dataSourceBuilder = new NpgsqlDataSourceBuilder(connString);
dataSourceBuilder.MapEnum<TransactionDirection>("transaction_direction");
dataSourceBuilder.MapEnum<TransactionStatus>("transaction_status");
var npgsqlDataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<SupabaseContext>(options =>
    options.UseNpgsql(npgsqlDataSource));

// ── JWT signing keys ──────────────────────────────────────────────────────────
// Supabase newer projects use RS256. Fetch the public keys from the JWKS endpoint.
// If JWKS is empty or unreachable, fall back to HS256 with the dashboard secret.
IEnumerable<SecurityKey> signingKeys;
try
{
    using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
    var jwksUri  = $"{jwtIssuer}/.well-known/jwks.json";
    var jwksJson = http.GetStringAsync(jwksUri).GetAwaiter().GetResult();
    var jwks     = new JsonWebKeySet(jwksJson);
    var keys     = jwks.GetSigningKeys().ToList();
    signingKeys  = keys;
    Console.WriteLine($"[Auth] Loaded {keys.Count} RS256 key(s) from JWKS → {jwksUri}");
}
catch (Exception ex)
{
    Console.WriteLine($"[Auth] JWKS fetch failed: {ex.Message}");
    Console.WriteLine("[Auth] Falling back to HS256 symmetric key from appsettings.");
    signingKeys = [new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret ?? ""))];
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys       = signingKeys,
            ValidateIssuer          = true,
            ValidIssuer             = jwtIssuer,
            ValidateAudience        = true,
            ValidAudience           = jwtAudience,
            ValidateLifetime        = true,
            ClockSkew               = TimeSpan.Zero,
            NameClaimType           = "sub",
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<FraudScoringService>();
builder.Services.AddScoped<TransactionService>();
builder.Services.AddScoped<AccountService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<DeviceService>();

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

var app = builder.Build();

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
