using Microsoft.AspNetCore.Mvc;
using ProductService.Application.DTOs;
using ProductService.Application.IServices;

namespace ProductService.Api.Controllers;
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }
    [HttpGet("all")]
    public async Task<IEnumerable<ProductDto>> GetAllProducts()
    {
        return await _productService.GetAllProductsAsync();
    }
}