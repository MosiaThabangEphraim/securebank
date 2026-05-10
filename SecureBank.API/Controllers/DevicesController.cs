using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SecureBank.API.Data;

namespace SecureBank.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DevicesController : ControllerBase
{
    private readonly SupabaseContext _context;
    private readonly ILogger<DevicesController> _logger;

    public DevicesController(SupabaseContext context, ILogger<DevicesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetDevices()
    {
        return Ok(new { message = "Get all registered devices" });
    }

    [HttpPatch("{id}/trust")]
    public async Task<IActionResult> TrustDevice(Guid id)
    {
        return Ok(new { message = "Mark device as trusted" });
    }

    [HttpPatch("{id}/block")]
    public async Task<IActionResult> BlockDevice(Guid id)
    {
        return Ok(new { message = "Block device" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> RemoveDevice(Guid id)
    {
        return Ok(new { message = "Remove device" });
    }
}
