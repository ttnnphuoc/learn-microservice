namespace ProductService.Domain.UnitOfWork;
public interface IUnitOfWork
{
    Task SaveChange();
}