using System.ComponentModel.DataAnnotations;

namespace OrderService.Domain.Entities;

public class OrderItem
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid ProductId { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string ProductName { get; set; } = string.Empty;
    
    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
    public int Quantity { get; set; }
    
    [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0")]
    public decimal Price { get; set; }
    
    public decimal TotalPrice => Quantity * Price;
    
    // Foreign key to Order
    public Guid OrderId { get; set; }
}