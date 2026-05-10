using SecureBank.API.Data;

namespace SecureBank.API.Services;

public class DeviceService
{
    private readonly SupabaseContext _context;

    public DeviceService(SupabaseContext context)
    {
        _context = context;
    }
}
