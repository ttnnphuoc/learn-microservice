using Microsoft.EntityFrameworkCore;
using OrderService.Domain.Entities;

namespace OrderService.Infrastructure;

public class OrderDbContext : DbContext
{
    public OrderDbContext(DbContextOptions<OrderDbContext> options) : base(options)
    {
    }

    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Order entity
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(o => o.Id);
            
            entity.Property(o => o.CustomerId)
                  .IsRequired();
            
            entity.Property(o => o.CreatedAt)
                  .IsRequired();
            
            entity.Property(o => o.TotalAmount)
                  .HasColumnType("decimal(18,2)")
                  .IsRequired();
            
            entity.Property(o => o.Notes)
                  .HasMaxLength(500);
            
            // Configure relationship with OrderItems
            entity.HasMany(o => o.Items)
                  .WithOne()
                  .HasForeignKey(oi => oi.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure OrderItem entity
        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(oi => oi.Id);
            
            entity.Property(oi => oi.ProductId)
                  .IsRequired();
            
            entity.Property(oi => oi.ProductName)
                  .IsRequired()
                  .HasMaxLength(200);
            
            entity.Property(oi => oi.Quantity)
                  .IsRequired();
            
            entity.Property(oi => oi.Price)
                  .HasColumnType("decimal(18,2)")
                  .IsRequired();
            
            entity.Property(oi => oi.OrderId)
                  .IsRequired();
                  
            // Computed column for TotalPrice (read-only)
            entity.Ignore(oi => oi.TotalPrice);
        });
    }
}