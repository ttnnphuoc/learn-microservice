# Realistic Implementation Plan

Based on your current codebase, here's a practical step-by-step plan to build a working order system with RabbitMQ.

## 📊 Current Status

✅ **Working:**
- ProductService (complete with DB, entities, controllers)
- API Gateway (Ocelot routing)
- Frontend (React with product display)

❌ **Need to Build:**
- OrderService (just template code)
- CustomerService (just template code)
- RabbitMQ integration

## 🚀 Phase-by-Phase Implementation

### Phase 1: Build Basic OrderService (No RabbitMQ Yet)

Start with a simple order service that works with your existing ProductService.

#### Step 1.1: Create Order Domain Model

```csharp
// OrderService/Domain/Entities/Order.cs
public class Order
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public DateTime CreatedAt { get; set; }
    public OrderStatus Status { get; set; }
    public List<OrderItem> Items { get; set; } = new();
    public decimal TotalAmount { get; set; }
}

public class OrderItem  
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal TotalPrice => Quantity * Price;
}

public enum OrderStatus
{
    Pending,
    Confirmed,
    Cancelled,
    Shipped
}
```

#### Step 1.2: Add Database Context

```csharp
// OrderService/Infrastructure/OrderDbContext.cs
public class OrderDbContext : DbContext
{
    public OrderDbContext(DbContextOptions<OrderDbContext> options) : base(options) { }

    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(o => o.Id);
            entity.Property(o => o.TotalAmount).HasColumnType("decimal(18,2)");
            
            entity.HasMany(o => o.Items)
                  .WithOne()
                  .HasForeignKey("OrderId");
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(oi => oi.Id);
            entity.Property(oi => oi.Price).HasColumnType("decimal(18,2)");
        });
    }
}
```

#### Step 1.3: Create OrderController

```csharp
// OrderService/Controllers/OrdersController.cs
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
    public async Task<ActionResult<Guid>> CreateOrder([FromBody] CreateOrderRequest request)
    {
        // Simple validation
        if (request.Items == null || !request.Items.Any())
            return BadRequest("Order must have at least one item");

        var order = new Order
        {
            Id = Guid.NewGuid(),
            CustomerId = request.CustomerId,
            CreatedAt = DateTime.UtcNow,
            Status = OrderStatus.Pending,
            Items = request.Items.Select(item => new OrderItem
            {
                Id = Guid.NewGuid(),
                ProductId = item.ProductId,
                ProductName = item.ProductName,
                Quantity = item.Quantity,
                Price = item.Price
            }).ToList()
        };

        order.TotalAmount = order.Items.Sum(item => item.TotalPrice);

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Order {OrderId} created for customer {CustomerId}", 
            order.Id, order.CustomerId);

        return Ok(order.Id);
    }

    [HttpGet("{orderId}")]
    public async Task<ActionResult<Order>> GetOrder(Guid orderId)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
            return NotFound();

        return Ok(order);
    }

    [HttpGet("customer/{customerId}")]
    public async Task<ActionResult<List<Order>>> GetCustomerOrders(Guid customerId)
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.CustomerId == customerId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return Ok(orders);
    }
}

// DTOs
public record CreateOrderRequest(
    Guid CustomerId,
    List<CreateOrderItemRequest> Items
);

public record CreateOrderItemRequest(
    Guid ProductId,
    string ProductName,
    int Quantity,
    decimal Price
);
```

#### Step 1.4: Configure OrderService

```csharp
// OrderService/Program.cs - REPLACE the entire file
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Add database
builder.Services.AddDbContext<OrderDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowApiGateway", policy =>
    {
        policy.WithOrigins("http://localhost:5108")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowApiGateway");
app.UseHttpsRedirection();
app.MapControllers();

// Create database
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<OrderDbContext>();
    context.Database.EnsureCreated();
}

app.Run();
```

#### Step 1.5: Add Connection String

```json
// OrderService/appsettings.Development.json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=OrderDB;Username=postgres;Password=your_password"
  }
}
```

### Phase 2: Test Basic Order System

Now you can test creating orders without RabbitMQ:

```bash
# Start OrderService
cd OrderService
dotnet run

# Create an order
curl -X POST http://localhost:5108/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {
        "productId": "550e8400-e29b-41d4-a716-446655440001",
        "productName": "Test Product",
        "quantity": 2,
        "price": 10.50
      }
    ]
  }'
```

### Phase 3: Add Simple RabbitMQ Integration

Only after the basic order system works, add RabbitMQ:

#### Step 3.1: Add RabbitMQ Package

```bash
cd OrderService
dotnet add package RabbitMQ.Client
```

#### Step 3.2: Create Simple Message Publisher

```csharp
// OrderService/Services/IMessagePublisher.cs
public interface IMessagePublisher
{
    Task PublishOrderCreatedAsync(Order order);
}

// OrderService/Services/RabbitMQPublisher.cs
public class RabbitMQPublisher : IMessagePublisher
{
    private readonly ILogger<RabbitMQPublisher> _logger;
    private readonly IConnection _connection;
    private readonly IModel _channel;

    public RabbitMQPublisher(IConfiguration configuration, ILogger<RabbitMQPublisher> logger)
    {
        _logger = logger;
        
        var factory = new ConnectionFactory()
        {
            HostName = configuration.GetValue<string>("RabbitMQ:Host") ?? "localhost"
        };

        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();
        
        // Declare exchange and queue
        _channel.ExchangeDeclare("orders", ExchangeType.Fanout, durable: true);
        _channel.QueueDeclare("product.orders", durable: true, exclusive: false, autoDelete: false);
        _channel.QueueBind("product.orders", "orders", "");
    }

    public async Task PublishOrderCreatedAsync(Order order)
    {
        var message = new
        {
            OrderId = order.Id,
            CustomerId = order.CustomerId,
            Items = order.Items.Select(i => new { i.ProductId, i.Quantity }),
            CreatedAt = order.CreatedAt
        };

        var json = JsonSerializer.Serialize(message);
        var body = Encoding.UTF8.GetBytes(json);

        _channel.BasicPublish("orders", "", null, body);
        
        _logger.LogInformation("Published OrderCreated event for order {OrderId}", order.Id);
    }
}
```

#### Step 3.3: Update OrderController to Publish Events

```csharp
// In OrdersController.CreateOrder method, add after saving to database:
await _messagePublisher.PublishOrderCreatedAsync(order);
```

### Phase 4: Add ProductService Event Consumer

Add a simple consumer to ProductService to log received order events:

```csharp
// ProductService/Services/OrderEventConsumer.cs
public class OrderEventConsumer : BackgroundService
{
    private readonly ILogger<OrderEventConsumer> _logger;

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var factory = new ConnectionFactory() { HostName = "localhost" };
        using var connection = factory.CreateConnection();
        using var channel = connection.CreateModel();

        var consumer = new EventingBasicConsumer(channel);
        consumer.Received += (model, ea) =>
        {
            var body = ea.Body.ToArray();
            var message = Encoding.UTF8.GetString(body);
            
            _logger.LogInformation("Received order event: {Message}", message);
            
            // Here you would process the order (check stock, etc.)
            
            channel.BasicAck(ea.DeliveryTag, false);
        };

        channel.BasicConsume("product.orders", false, consumer);
        
        return Task.Delay(Timeout.Infinite, stoppingToken);
    }
}
```

## 🎯 Why This Approach Works

1. **Start Simple**: Get basic order creation working first
2. **Add Complexity Gradually**: Add RabbitMQ only after basic flow works
3. **Test Each Phase**: Verify each step before moving to next
4. **Learn Progressively**: Understand each concept before adding more

## 📝 Next Steps After Basic Implementation

1. Add stock validation in ProductService
2. Add CustomerService for order history
3. Add error handling and retry logic
4. Add monitoring and logging
5. Add authentication

This realistic plan matches your current codebase and builds up gradually!