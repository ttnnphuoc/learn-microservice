using ProductService.Domain.UnitOfWork;

namespace ProductService.Infrastructure.UnitOfWork;
public class UnitOfWork : IUnitOfWork
{
    private readonly ProductDBContext _context;
    public UnitOfWork(ProductDBContext context)
    {
        _context = context;
    }
    public async Task SaveChange()
    {
        await _context.SaveChangesAsync();
    }
}