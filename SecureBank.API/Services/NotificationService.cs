using SecureBank.API.Data;

namespace SecureBank.API.Services;

public class NotificationService
{
    private readonly SupabaseContext _context;

    public NotificationService(SupabaseContext context)
    {
        _context = context;
    }
}
