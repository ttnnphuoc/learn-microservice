using System.ComponentModel.DataAnnotations;

namespace OrderService.Domain.Entities;

public class Order
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid CustomerId { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public OrderStatus Status { get; set; }
    
    public List<OrderItem> Items { get; set; } = new();
    
    public decimal TotalAmount { get; set; }
    
    public string? Notes { get; set; }
}

public enum OrderStatus
{
    Pending = 0,
    Confirmed = 1,
    Cancelled = 2,
    Shipped = 3,
    Delivered = 4
}