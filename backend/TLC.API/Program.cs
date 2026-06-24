using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;
using Microsoft.IdentityModel.Tokens;
using TLC.API.Middleware;
using TLC.API.Services;
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
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();

// Add JWT authentication for the local DB-backed login (api/auth/login)
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"]!;
var jwtIssuer = jwtSection["Issuer"]!;
var jwtAudience = jwtSection["Audience"]!;

void ConfigureLocalJwtBearer(JwtBearerOptions options)
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(2)
    };
}

if (!builder.Environment.IsDevelopment())
{
    const string LocalJwtScheme = "LocalJwt";

    builder.Services.AddAuthentication(options =>
        {
            options.DefaultScheme = "AzureAdOrLocalJwt";
            options.DefaultChallengeScheme = "AzureAdOrLocalJwt";
        })
        .AddPolicyScheme("AzureAdOrLocalJwt", "Azure AD or Local JWT", options =>
        {
            options.ForwardDefaultSelector = context =>
            {
                var authHeader = context.Request.Headers.Authorization.ToString();
                if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    var token = authHeader["Bearer ".Length..].Trim();
                    try
                    {
                        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
                        if (jwt.Issuer == jwtIssuer)
                            return LocalJwtScheme;
                    }
                    catch (ArgumentException)
                    {
                        // Not a well-formed JWT - fall through to Azure AD scheme.
                    }
                }
                return JwtBearerDefaults.AuthenticationScheme;
            };
        })
        .AddJwtBearer(LocalJwtScheme, ConfigureLocalJwtBearer)
        .AddMicrosoftIdentityWebApi(builder.Configuration);

    builder.Services.AddAuthorization();
}
else
{
    // Development: accept the local JWT issued by /api/auth/login.
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(ConfigureLocalJwtBearer);

    builder.Services.AddAuthorization();
}

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
