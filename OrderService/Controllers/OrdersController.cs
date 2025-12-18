using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderService.Domain.Entities;
using OrderService.Infrastructure;

namespace OrderService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly OrderDbContext _context;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(OrderDbContext context, ILogger<OrdersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<CreateOrderResponse>> CreateOrder([FromBody] CreateOrderRequest request)
    {
        // Validate request
        if (request.Items == null || !request.Items.Any())
        {
            return BadRequest("Order must have at least one item");
        }

        try
        {
            var order = new Order
            {
                Id = Guid.NewGuid(),
                CustomerId = request.CustomerId,
                CreatedAt = DateTime.UtcNow,
                Status = OrderStatus.Pending,
                Notes = request.Notes,
                Items = request.Items.Select(item => new OrderItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = item.ProductId,
                    ProductName = item.ProductName,
                    Quantity = item.Quantity,
                    Price = item.Price
                }).ToList()
            };

            // Calculate total amount
            order.TotalAmount = order.Items.Sum(item => item.Quantity * item.Price);

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Order {OrderId} created for customer {CustomerId} with total amount {TotalAmount}", 
                order.Id, order.CustomerId, order.TotalAmount);

            return Ok(new CreateOrderResponse
            {
                OrderId = order.Id,
                Status = order.Status.ToString(),
                TotalAmount = order.TotalAmount,
                CreatedAt = order.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating order for customer {CustomerId}", request.CustomerId);
            return StatusCode(500, "An error occurred while creating the order");
        }
    }

    [HttpGet("{orderId}")]
    public async Task<ActionResult<OrderDetailsResponse>> GetOrder(Guid orderId)
    {
        try
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                return NotFound($"Order with ID {orderId} not found");
            }

            return Ok(new OrderDetailsResponse
            {
                OrderId = order.Id,
                CustomerId = order.CustomerId,
                Status = order.Status.ToString(),
                CreatedAt = order.CreatedAt,
                TotalAmount = order.TotalAmount,
                Notes = order.Notes,
                Items = order.Items.Select(item => new OrderItemResponse
                {
                    ProductId = item.ProductId,
                    ProductName = item.ProductName,
                    Quantity = item.Quantity,
                    Price = item.Price,
                    TotalPrice = item.TotalPrice
                }).ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving order {OrderId}", orderId);
            return StatusCode(500, "An error occurred while retrieving the order");
        }
    }

    [HttpGet("customer/{customerId}")]
    public async Task<ActionResult<List<OrderSummaryResponse>>> GetCustomerOrders(Guid customerId)
    {
        try
        {
            var orders = await _context.Orders
                .Include(o => o.Items)
                .Where(o => o.CustomerId == customerId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            var response = orders.Select(order => new OrderSummaryResponse
            {
                OrderId = order.Id,
                Status = order.Status.ToString(),
                CreatedAt = order.CreatedAt,
                TotalAmount = order.TotalAmount,
                ItemCount = order.Items.Count
            }).ToList();

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving orders for customer {CustomerId}", customerId);
            return StatusCode(500, "An error occurred while retrieving customer orders");
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<OrderSummaryResponse>>> GetAllOrders()
    {
        try
        {
            var orders = await _context.Orders
                .Include(o => o.Items)
                .OrderByDescending(o => o.CreatedAt)
                .Take(100) // Limit to last 100 orders
                .ToListAsync();

            var response = orders.Select(order => new OrderSummaryResponse
            {
                OrderId = order.Id,
                Status = order.Status.ToString(),
                CreatedAt = order.CreatedAt,
                TotalAmount = order.TotalAmount,
                ItemCount = order.Items.Count
            }).ToList();

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all orders");
            return StatusCode(500, "An error occurred while retrieving orders");
        }
    }
}

// Request DTOs
public record CreateOrderRequest(
    Guid CustomerId,
    List<CreateOrderItemRequest> Items,
    string? Notes = null
);

public record CreateOrderItemRequest(
    Guid ProductId,
    string ProductName,
    int Quantity,
    decimal Price
);

// Response DTOs
public record CreateOrderResponse
{
    public Guid OrderId { get; init; }
    public string Status { get; init; } = string.Empty;
    public decimal TotalAmount { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record OrderDetailsResponse
{
    public Guid OrderId { get; init; }
    public Guid CustomerId { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public decimal TotalAmount { get; init; }
    public string? Notes { get; init; }
    public List<OrderItemResponse> Items { get; init; } = new();
}

public record OrderItemResponse
{
    public Guid ProductId { get; init; }
    public string ProductName { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal Price { get; init; }
    public decimal TotalPrice { get; init; }
}

public record OrderSummaryResponse
{
    public Guid OrderId { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public decimal TotalAmount { get; init; }
    public int ItemCount { get; init; }
}