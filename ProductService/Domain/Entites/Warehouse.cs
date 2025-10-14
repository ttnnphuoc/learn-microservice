using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductService.Domain.Entities;

[Table("Warehouses")]
public class Warehouse : BaseEntity
{
    public Guid LocationId { get; set; }
    [ForeignKey("LocationId")]
    public Location Location { get; set; } = default!;
    public string Name { get; set; } = default!;
}
