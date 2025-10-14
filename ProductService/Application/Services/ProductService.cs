using ProductService.Application.DTOs;
using ProductService.Application.IServices;
using ProductService.Domain.Repositories;
using ProductService.Domain.UnitOfWork;

namespace ProductService.Application.Services;
public class ProductServices : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ProductServices(IProductRepository productRepository, IUnitOfWork unitOfWork)
    {
        _productRepository = productRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<ProductDto>> GetAllProductsAsync()
    {
        var products = await _productRepository.GetAllAsync();
        return products.Select(p => new ProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description
        });
    }
}