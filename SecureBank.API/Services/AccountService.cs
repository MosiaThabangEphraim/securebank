using SecureBank.API.Data;

namespace SecureBank.API.Services;

public class AccountService
{
    private readonly SupabaseContext _context;

    public AccountService(SupabaseContext context)
    {
        _context = context;
    }
}
