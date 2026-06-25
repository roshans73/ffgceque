using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;
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

// Add Azure AD Authentication
builder.Services.AddMicrosoftIdentityWebApiAuthentication(builder.Configuration);

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("CorsOrigins").Get<string[]>() ??
            new[] { "http://localhost:3000", "http://localhost:5173","http://localhost:5000","*" })
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
//app.UseAuthentication();
//app.UseAuthorization();
app.UseMiddleware<ErrorHandlingMiddleware>();

app.MapControllers();

// Apply pending database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TLCDbContext>();
    db.Database.Migrate();
}

app.Run();
