using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductService.Domain.Entities;

[Table("Locations")]
public class Location : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Description { get; set; } = default!;
}
