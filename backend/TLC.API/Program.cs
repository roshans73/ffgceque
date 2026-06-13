using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;
using TLC.API.Authentication;
using TLC.API.Middleware;
using TLC.Core.Services;
using TLC.Infrastructure;
using TLC.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=tlc_management.db";
builder.Services.AddDbContext<TLCDbContext>(options =>
    options.UseSqlite(connectionString));

// Add Repository and Unit of Work
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<ICodeGeneratorService, CodeGeneratorService>();
builder.Services.AddScoped<IImportService, ImportService>();

// Add Authentication
var useAzureAd = !string.IsNullOrWhiteSpace(builder.Configuration["AzureAd:ClientId"]) &&
                 builder.Configuration["AzureAd:ClientId"] != "your-client-id" &&
                 !string.IsNullOrWhiteSpace(builder.Configuration["AzureAd:TenantId"]);

if (useAzureAd)
{
    builder.Services.AddMicrosoftIdentityWebApiAuthentication(builder.Configuration, "AzureAd");
}
else
{
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = "Development";
        options.DefaultChallengeScheme = "Development";
        options.DefaultScheme = "Development";
    }).AddScheme<AuthenticationSchemeOptions, DevelopmentAuthenticationHandler>("Development", options => { });
}

builder.Services.AddAuthorization();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("CorsOrigins").Get<string[]>() ??
            new[] { "http://localhost:3000", "http://localhost:5173" })
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");

if (app.Environment.IsDevelopment())
{
    app.Use(async (context, next) =>
    {
        if (context.User?.Identity?.IsAuthenticated != true)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.Name, "dev-user"),
                new Claim(ClaimTypes.Role, "TechMETeam"),
                new Claim(ClaimTypes.Role, "TLCManager"),
                new Claim(ClaimTypes.Role, "SustainabilityLead")
            };
            context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Development"));
        }

        await next();
    });
}

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<ErrorHandlingMiddleware>();

app.MapControllers();

// Apply pending database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TLCDbContext>();
    db.Database.Migrate();
}

app.Run();
