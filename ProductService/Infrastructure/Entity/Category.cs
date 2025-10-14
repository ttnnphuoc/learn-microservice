using System;

namespace ProductService.Infrastructure.Entity;

public class Category: BaseEntity
{
    public string Name { get; set; } = default!;
    public string Description { get; set; } = default!;
}
