using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TLC.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPasswordHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PasswordHash",
                table: "Users",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            // Seed a default administrator account for the DB-backed login.
            // Email: admin@tlc.org / Password: Admin@123 (change after first login).
            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "AzureAadId", "Email", "Name", "PasswordHash", "RoleId", "DistrictId", "BlockId", "IsActive", "CreatedAt", "UpdatedAt" },
                values: new object[] { "local:admin@tlc.org", "admin@tlc.org", "System Administrator", "100000.6rym+UocIUZGjacNzcPXyQ==.sGcEW3JJ1euIQon1sKILaLPIiB9hMhArFy+DHMmEkUk=", 1, null, null, true, new DateTime(2026, 6, 14, 0, 0, 0, DateTimeKind.Utc), null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Email",
                keyValue: "admin@tlc.org");

            migrationBuilder.DropColumn(
                name: "PasswordHash",
                table: "Users");
        }
    }
}
