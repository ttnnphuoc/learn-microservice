using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductService.Domain.Entities;

[Table("Categories")]
public class Category : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Description { get; set; } = default!;
}
