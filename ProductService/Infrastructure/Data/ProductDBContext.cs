using System;
using Microsoft.EntityFrameworkCore;
using ProductService.Infrastructure.Entity;
namespace ProductService.Infrastructure.Data;
        
public class ProductDBContext(DbContextOptions<ProductDBContext> options) : DbContext(options)
{
    public DbSet<Product> Products { get; set; } = default!;
    public DbSet<Category> Categories { get; set; } = default!;
}