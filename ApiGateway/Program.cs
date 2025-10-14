using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add Ocelot config
builder.Configuration.AddJsonFile("ocelot.json");

// Add Ocelot DI
builder.Services.AddOcelot();

var app = builder.Build();

// Sử dụng Ocelot middleware
await app.UseOcelot();

app.Run();