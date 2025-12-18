# Production RabbitMQ Patterns & Best Practices

This guide shows real-world RabbitMQ patterns used in production microservices.

## 🏗️ Standard Architecture Changes

### Key Improvements Made:

1. **Database Per Service** - Each service has its own database (industry standard)
2. **Proper RabbitMQ Exchange/Queue Structure** - Production topology
3. **Additional Production Services** - Notification & Payment services
4. **Observability Stack** - Logging, metrics, tracing
5. **Load Balancing** - Production traffic handling

## 🐰 RabbitMQ Production Patterns

### 1. Exchange Topology (Standard Pattern)

```mermaid
graph TD
    subgraph "RabbitMQ Broker"
        E1[orders.events<br/>Topic Exchange]
        E2[notifications.events<br/>Topic Exchange] 
        E3[payments.events<br/>Topic Exchange]
        
        Q1[product.orders<br/>Queue]
        Q2[customer.orders<br/>Queue]
        Q3[notification.orders<br/>Queue]
        Q4[payment.orders<br/>Queue]
        Q5[inventory.low-stock<br/>Queue]
        Q6[email.welcome<br/>Queue]
        
        E1 -->|order.created| Q1
        E1 -->|order.created| Q2
        E1 -->|order.created| Q3
        E1 -->|order.confirmed| Q4
        
        E2 -->|stock.low| Q5
        E2 -->|customer.registered| Q6
        
        DLQ1[orders.deadletter<br/>DLQ]
        DLQ2[notifications.deadletter<br/>DLQ]
    end
```

### 2. Routing Key Patterns

```
# Domain Events
order.created
order.confirmed  
order.cancelled
order.shipped

# Stock Events  
stock.reserved
stock.released
stock.low

# Customer Events
customer.registered
customer.updated
customer.deleted

# Payment Events
payment.processing
payment.completed
payment.failed
```

### 3. Production RabbitMQ Configuration

#### docker-compose.yml
```yaml
version: '3.8'
services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: rabbitmq-prod
    hostname: rabbitmq-prod
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
      RABBITMQ_DEFAULT_VHOST: /microservices
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
      - ./rabbitmq/rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf
      - ./rabbitmq/definitions.json:/etc/rabbitmq/definitions.json
    networks:
      - microservices-network

volumes:
  rabbitmq_data:

networks:
  microservices-network:
    driver: bridge
```

#### rabbitmq.conf (Production Settings)
```ini
# Memory and disk thresholds
vm_memory_high_watermark.relative = 0.6
disk_free_limit.absolute = 1GB

# Management plugin
management.tcp.port = 15672

# Clustering (for HA)
cluster_formation.peer_discovery_backend = rabbit_peer_discovery_classic_config

# Logging
log.console = true
log.console.level = info

# Queue settings
queue_master_locator = min-masters

# Message TTL (30 days)
message_ttl = 2592000000
```

## 🔧 Production Implementation

### 1. Enhanced RabbitMQ Infrastructure

#### IRabbitMQService.cs (Production Interface)
```csharp
public interface IRabbitMQService
{
    // Publishing
    Task PublishAsync<T>(T message, string routingKey, string exchange = "orders.events") where T : class;
    Task PublishWithConfirmAsync<T>(T message, string routingKey, string exchange = "orders.events") where T : class;
    
    // Consuming
    void Subscribe<T>(string queueName, string routingKey, Func<T, MessageContext, Task<MessageResult>> handler) where T : class;
    void SubscribeWithRetry<T>(string queueName, string routingKey, Func<T, MessageContext, Task<MessageResult>> handler, int maxRetries = 3) where T : class;
    
    // Queue Management
    Task CreateExchangeAsync(string exchangeName, string type = "topic");
    Task CreateQueueAsync(string queueName, string exchangeName, string routingKey);
    Task PurgeQueueAsync(string queueName);
}

public record MessageContext(
    string MessageId,
    DateTime Timestamp,
    string CorrelationId,
    Dictionary<string, object> Headers
);

public enum MessageResult
{
    Ack,        // Success - acknowledge
    Nack,       // Failure - negative acknowledge (retry)
    Reject      // Failure - reject (send to DLQ)
}
```

#### RabbitMQService.cs (Production Implementation)
```csharp
public class RabbitMQService : IRabbitMQService, IDisposable
{
    private readonly IConnection _connection;
    private readonly IModel _channel;
    private readonly ILogger<RabbitMQService> _logger;
    private readonly RabbitMQConfig _config;

    public RabbitMQService(IOptions<RabbitMQConfig> config, ILogger<RabbitMQService> logger)
    {
        _config = config.Value;
        _logger = logger;
        
        var factory = new ConnectionFactory()
        {
            HostName = _config.Host,
            UserName = _config.Username,
            Password = _config.Password,
            VirtualHost = _config.VirtualHost,
            AutomaticRecoveryEnabled = true,
            NetworkRecoveryInterval = TimeSpan.FromSeconds(10),
            RequestedHeartbeat = TimeSpan.FromSeconds(60)
        };

        _connection = factory.CreateConnection($"{Environment.MachineName}-{Environment.ProcessId}");
        _channel = _connection.CreateModel();
        
        // Enable publisher confirms for reliability
        _channel.ConfirmSelect();
        
        // Create dead letter exchange
        CreateDeadLetterInfrastructure();
    }

    public async Task PublishWithConfirmAsync<T>(T message, string routingKey, string exchange = "orders.events") where T : class
    {
        var messageId = Guid.NewGuid().ToString();
        var correlationId = Activity.Current?.Id ?? Guid.NewGuid().ToString();
        
        var properties = _channel.CreateBasicProperties();
        properties.MessageId = messageId;
        properties.CorrelationId = correlationId;
        properties.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        properties.Persistent = true; // Survive broker restart
        properties.Headers = new Dictionary<string, object>
        {
            ["MessageType"] = typeof(T).Name,
            ["Source"] = Environment.MachineName,
            ["Version"] = "1.0"
        };

        var json = JsonSerializer.Serialize(message, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        var body = Encoding.UTF8.GetBytes(json);

        try
        {
            _channel.BasicPublish(exchange, routingKey, properties, body);
            _channel.WaitForConfirmsOrDie(TimeSpan.FromSeconds(5));
            
            _logger.LogInformation("Published message {MessageId} of type {MessageType} with routing key {RoutingKey}",
                messageId, typeof(T).Name, routingKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish message {MessageId}", messageId);
            throw;
        }
    }

    public void SubscribeWithRetry<T>(string queueName, string routingKey, Func<T, MessageContext, Task<MessageResult>> handler, int maxRetries = 3) where T : class
    {
        // Create main queue
        _channel.QueueDeclare(queueName, durable: true, exclusive: false, autoDelete: false, arguments: new Dictionary<string, object>
        {
            ["x-dead-letter-exchange"] = $"{queueName}.dlx",
            ["x-dead-letter-routing-key"] = "failed"
        });
        
        // Create retry queue with TTL
        var retryQueue = $"{queueName}.retry";
        _channel.QueueDeclare(retryQueue, durable: true, exclusive: false, autoDelete: false, arguments: new Dictionary<string, object>
        {
            ["x-message-ttl"] = 30000, // 30 seconds
            ["x-dead-letter-exchange"] = "orders.events",
            ["x-dead-letter-routing-key"] = routingKey
        });

        _channel.QueueBind(queueName, "orders.events", routingKey);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.Received += async (model, ea) =>
        {
            var messageId = ea.BasicProperties.MessageId;
            var correlationId = ea.BasicProperties.CorrelationId;
            var retryCount = GetRetryCount(ea.BasicProperties.Headers);

            try
            {
                var body = ea.Body.ToArray();
                var json = Encoding.UTF8.GetString(body);
                var message = JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                var context = new MessageContext(
                    messageId,
                    DateTimeOffset.FromUnixTimeSeconds(ea.BasicProperties.Timestamp.UnixTime).DateTime,
                    correlationId,
                    ea.BasicProperties.Headers?.ToDictionary(h => h.Key, h => h.Value) ?? new Dictionary<string, object>()
                );

                var result = await handler(message, context);

                switch (result)
                {
                    case MessageResult.Ack:
                        _channel.BasicAck(ea.DeliveryTag, false);
                        _logger.LogDebug("Message {MessageId} processed successfully", messageId);
                        break;
                        
                    case MessageResult.Nack when retryCount < maxRetries:
                        // Send to retry queue
                        var retryProperties = ea.BasicProperties;
                        retryProperties.Headers ??= new Dictionary<string, object>();
                        retryProperties.Headers["x-retry-count"] = retryCount + 1;
                        
                        _channel.BasicPublish("", retryQueue, retryProperties, ea.Body);
                        _channel.BasicAck(ea.DeliveryTag, false);
                        _logger.LogWarning("Message {MessageId} sent to retry queue (attempt {RetryCount})", messageId, retryCount + 1);
                        break;
                        
                    case MessageResult.Nack:
                    case MessageResult.Reject:
                        // Send to DLQ
                        _channel.BasicNack(ea.DeliveryTag, false, false);
                        _logger.LogError("Message {MessageId} sent to dead letter queue after {RetryCount} attempts", messageId, retryCount);
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing message {MessageId}", messageId);
                _channel.BasicNack(ea.DeliveryTag, false, false);
            }
        };

        _channel.BasicConsume(queueName, autoAck: false, consumer);
        _logger.LogInformation("Started consuming from queue {QueueName} with routing key {RoutingKey}", queueName, routingKey);
    }

    private int GetRetryCount(IDictionary<string, object> headers)
    {
        if (headers?.TryGetValue("x-retry-count", out var value) == true)
        {
            return Convert.ToInt32(value);
        }
        return 0;
    }

    private void CreateDeadLetterInfrastructure()
    {
        // Create dead letter exchange
        _channel.ExchangeDeclare("orders.events.dlx", ExchangeType.Direct, durable: true);
        
        // Create dead letter queue
        _channel.QueueDeclare("orders.deadletter", durable: true, exclusive: false, autoDelete: false);
        _channel.QueueBind("orders.deadletter", "orders.events.dlx", "failed");
    }
}

public class RabbitMQConfig
{
    public string Host { get; set; } = "localhost";
    public string Username { get; set; } = "admin";
    public string Password { get; set; }
    public string VirtualHost { get; set; } = "/microservices";
}
```

### 2. Enhanced Event Handlers

#### OrderEventHandler.cs (Production Pattern)
```csharp
public class OrderEventHandler : BackgroundService
{
    private readonly IRabbitMQService _rabbitMQ;
    private readonly IOrderService _orderService;
    private readonly ILogger<OrderEventHandler> _logger;
    private readonly IMetrics _metrics;

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Subscribe with automatic retry and DLQ
        _rabbitMQ.SubscribeWithRetry<StockReserved>(
            "orders.stock.reserved", 
            "stock.reserved", 
            HandleStockReserved, 
            maxRetries: 3);

        _rabbitMQ.SubscribeWithRetry<StockNotAvailable>(
            "orders.stock.notavailable", 
            "stock.notavailable", 
            HandleStockNotAvailable, 
            maxRetries: 3);

        return Task.CompletedTask;
    }

    private async Task<MessageResult> HandleStockReserved(StockReserved @event, MessageContext context)
    {
        using var activity = Activity.StartActivity("OrderEventHandler.HandleStockReserved");
        activity?.SetTag("order.id", @event.OrderId.ToString());
        activity?.SetTag("correlation.id", context.CorrelationId);

        try
        {
            _logger.LogInformation("Processing StockReserved event for order {OrderId}", @event.OrderId);
            
            // Update order status
            await _orderService.ConfirmOrderAsync(@event.OrderId);
            
            // Publish OrderConfirmed event with correlation ID
            var orderConfirmed = new OrderConfirmed(@event.OrderId, @event.CustomerId, DateTime.UtcNow);
            await _rabbitMQ.PublishWithConfirmAsync(orderConfirmed, "order.confirmed");
            
            // Record metrics
            _metrics.Counter("orders_confirmed_total").Inc();
            
            _logger.LogInformation("Order {OrderId} confirmed successfully", @event.OrderId);
            return MessageResult.Ack;
        }
        catch (OrderNotFoundException)
        {
            _logger.LogWarning("Order {OrderId} not found, treating as success", @event.OrderId);
            return MessageResult.Ack; // Don't retry for business rule violations
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process StockReserved event for order {OrderId}", @event.OrderId);
            return MessageResult.Nack; // Retry
        }
    }
}
```

### 3. Configuration & Startup

#### Program.cs
```csharp
// Add RabbitMQ configuration
builder.Services.Configure<RabbitMQConfig>(builder.Configuration.GetSection("RabbitMQ"));
builder.Services.AddSingleton<IRabbitMQService, RabbitMQService>();

// Add hosted services
builder.Services.AddHostedService<OrderEventHandler>();

// Add health checks
builder.Services.AddHealthChecks()
    .AddRabbitMQ(connectionString: builder.Configuration.GetConnectionString("RabbitMQ"));

// Add metrics
builder.Services.AddSingleton<IMetrics, Metrics>();
```

#### appsettings.Production.json
```json
{
  "RabbitMQ": {
    "Host": "rabbitmq-cluster.internal",
    "Username": "microservices-user",
    "Password": "secure-password",
    "VirtualHost": "/production"
  },
  "ConnectionStrings": {
    "RabbitMQ": "amqp://microservices-user:secure-password@rabbitmq-cluster.internal:5672/production"
  }
}
```

## 🔍 Monitoring & Observability

### 1. Message Tracing
```csharp
// Add correlation IDs to all messages
// Use OpenTelemetry for distributed tracing
// Log all message processing activities
```

### 2. Health Checks
```csharp
public class RabbitMQHealthCheck : IHealthCheck
{
    private readonly IRabbitMQService _rabbitMQ;

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken)
    {
        try
        {
            // Check connection health
            // Check queue depths
            // Check exchange existence
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("RabbitMQ is unhealthy", ex);
        }
    }
}
```

### 3. Metrics to Monitor
- Message publish rate
- Message consumption rate  
- Queue depths
- Dead letter queue depths
- Processing latency
- Error rates
- Connection health

## 🎯 Production Best Practices

### 1. Message Design
- ✅ Use versioned message schemas
- ✅ Include correlation IDs
- ✅ Add message timestamps
- ✅ Keep messages small (<1MB)
- ✅ Use meaningful routing keys

### 2. Error Handling
- ✅ Implement retry with exponential backoff
- ✅ Use dead letter queues
- ✅ Log all message processing
- ✅ Monitor DLQ depths
- ✅ Handle poison messages

### 3. Performance
- ✅ Use connection pooling
- ✅ Batch message publishing
- ✅ Set appropriate prefetch counts
- ✅ Monitor queue depths
- ✅ Use lazy queues for large backlogs

### 4. Security
- ✅ Use TLS for connections
- ✅ Implement proper authentication
- ✅ Use VHosts for isolation
- ✅ Limit queue permissions
- ✅ Rotate credentials regularly

This production setup will teach you real-world RabbitMQ patterns used in enterprise systems!