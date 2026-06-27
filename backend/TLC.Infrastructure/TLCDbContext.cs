using Microsoft.EntityFrameworkCore;
using TLC.Core.Models;

namespace TLC.Infrastructure;

public class TLCDbContext : DbContext
{
    public TLCDbContext(DbContextOptions<TLCDbContext> options) : base(options)
    {
    }

    public DbSet<District> Districts => Set<District>();
    public DbSet<Block> Blocks => Set<Block>();
    public DbSet<Coach> Coaches => Set<Coach>();
    public DbSet<Teacher> Teachers => Set<Teacher>();
    public DbSet<TLCGroup> TLCGroups => Set<TLCGroup>();
    public DbSet<TeacherLeader> TeacherLeaders => Set<TeacherLeader>();
    public DbSet<TLCMember> TLCMembers => Set<TLCMember>();
    public DbSet<TLCAndMasterclass> TLCAndMasterclasses => Set<TLCAndMasterclass>();
    public DbSet<TLCAttendance> TLCAttendances => Set<TLCAttendance>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<UploadLog> UploadLogs => Set<UploadLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Seed initial roles
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "CEO", Description = "CEO or Senior Management" },
            new Role { Id = 2, Name = "SustainabilityLead", Description = "Sustainability Lead" },
            new Role { Id = 3, Name = "TechMETeam", Description = "Technology & M&E Team" },
            new Role { Id = 4, Name = "TLCManager", Description = "TLC Manager" }
        );

        // Configure relationships
        modelBuilder.Entity<Block>()
            .HasOne(b => b.District)
            .WithMany()
            .HasForeignKey(b => b.DistrictId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Coach>()
            .HasOne(c => c.District)
            .WithMany()
            .HasForeignKey(c => c.DistrictId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Coach>()
            .HasOne(c => c.Block)
            .WithMany()
            .HasForeignKey(c => c.BlockId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Teacher>()
            .HasOne(t => t.District)
            .WithMany()
            .HasForeignKey(t => t.DistrictId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Teacher>()
            .HasOne(t => t.Block)
            .WithMany()
            .HasForeignKey(t => t.BlockId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Teacher>()
            .HasOne(t => t.Coach)
            .WithMany()
            .HasForeignKey(t => t.CoachId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TLCGroup>()
            .HasOne(tg => tg.District)
            .WithMany()
            .HasForeignKey(tg => tg.DistrictId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TLCGroup>()
            .HasOne(tg => tg.Block)
            .WithMany()
            .HasForeignKey(tg => tg.BlockId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TLCGroup>()
            .HasOne(tg => tg.TeacherLeader)
            .WithMany()
            .HasForeignKey(tg => tg.TeacherLeaderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TeacherLeader>()
            .HasOne(tl => tl.TLCGroup)
            .WithMany()
            .HasForeignKey(tl => tl.TlcGroupId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TeacherLeader>()
            .HasOne(tl => tl.Teacher)
            .WithMany()
            .HasForeignKey(tl => tl.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TLCMember>()
            .HasOne(tm => tm.TLCGroup)
            .WithMany(tg => tg.Members)
            .HasForeignKey(tm => tm.TlcGroupId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TLCMember>()
            .HasOne(tm => tm.Teacher)
            .WithMany()
            .HasForeignKey(tm => tm.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TLCAndMasterclass>()
            .HasOne(tm => tm.TLCGroup)
            .WithMany(tg => tg.TLCs)
            .HasForeignKey(tm => tm.TlcGroupId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TLCAndMasterclass>()
            .HasOne(tm => tm.District)
            .WithMany()
            .HasForeignKey(tm => tm.DistrictId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TLCAndMasterclass>()
            .HasOne(tm => tm.Block)
            .WithMany()
            .HasForeignKey(tm => tm.BlockId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TLCAndMasterclass>()
            .HasOne(tm => tm.LeadByTeacher)
            .WithMany()
            .HasForeignKey(tm => tm.LedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TLCAttendance>()
            .HasOne(ta => ta.TLCOrMasterclass)
            .WithMany(tm => tm.AttendanceRecords)
            .HasForeignKey(ta => ta.TlcOrMasterclassId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TLCAttendance>()
            .HasOne(ta => ta.Teacher)
            .WithMany()
            .HasForeignKey(ta => ta.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<User>()
            .HasOne(u => u.Role)
            .WithMany()
            .HasForeignKey(u => u.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<User>()
            .HasOne(u => u.District)
            .WithMany()
            .HasForeignKey(u => u.DistrictId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<User>()
            .HasOne(u => u.Block)
            .WithMany()
            .HasForeignKey(u => u.BlockId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<AuditLog>()
            .HasOne(al => al.User)
            .WithMany()
            .HasForeignKey(al => al.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<UploadLog>()
            .HasOne(ul => ul.User)
            .WithMany()
            .HasForeignKey(ul => ul.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes for performance
        modelBuilder.Entity<Teacher>().HasIndex(t => t.TeacherCode).IsUnique();
        modelBuilder.Entity<TLCGroup>().HasIndex(tg => tg.TlcGroupCode).IsUnique();
        modelBuilder.Entity<TLCAndMasterclass>().HasIndex(tm => tm.Code).IsUnique();
        modelBuilder.Entity<Teacher>().HasIndex(t => new { t.DistrictId, t.BlockId, t.Name });
        modelBuilder.Entity<Coach>().HasIndex(c => c.EmpNo).IsUnique();
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<User>().HasIndex(u => u.AzureAadId).IsUnique();
    }
}
