using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductService.Infrastructure.Entity;

public class Stock: BaseEntity
{
    public int QuantityAvailable { get; set; }
    public int QuantityReserved { get; set; }
    public int QuantityDamaged { get; set; }
    public Guid ProductId { get; set; }
    [ForeignKey("ProductId")]
    public Product Product { get; set; } = default!;
    public Guid WarehouseId { get; set; }
    [ForeignKey("WarehouseId")]
    public Warehouse Warehouse { get; set; } = default!;
}
