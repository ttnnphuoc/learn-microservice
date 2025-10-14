using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductService.Infrastructure.Entity;

public class Warehouse: BaseEntity
{
    public Guid LocationId { get; set; }
    [ForeignKey("LocationId")]
    public Location Location { get; set; } = default!;
    public string Name { get; set; } = default!;
}
