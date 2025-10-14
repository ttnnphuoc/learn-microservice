using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductService.Domain.Entities;

[Table("Products")]
public class Product : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Description { get; set; } = default!;
    public decimal Price { get; set; }
    public Guid CategoryId { get; set; }
    [ForeignKey("CategoryId")]
    public Category Category { get; set; } = default!;
}
