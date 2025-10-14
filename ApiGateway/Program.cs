using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add Ocelot config
builder.Configuration.AddJsonFile("ocelot.json");
// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Your frontend URL
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
// Add Ocelot DI
builder.Services.AddOcelot();

var app = builder.Build();

// Add this line - Use CORS before Ocelot
app.UseCors();

// Ocelot middleware
await app.UseOcelot();

app.Run();