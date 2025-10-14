using ProductService.Application.DTOs;
using ProductService.Application.IServices;

namespace ProductService.Api.Controllers;
public class ProductsController
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }
    public async Task<IEnumerable<ProductDto>> GetAllProducts()
    {
        return await _productService.GetAllProductsAsync();
    }
}