using ProductService.Application.DTOs;

namespace ProductService.Application.IServices;
public interface IProductService
{
    Task<IEnumerable<ProductDto>> GetAllProductsAsync();
}