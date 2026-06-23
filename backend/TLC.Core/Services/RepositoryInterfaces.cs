using TLC.Core.Models;

namespace TLC.Core.Services;

public interface IRepository<T> where T : class
{
    Task<T?> GetById(int id);
    Task<IEnumerable<T>> GetAll();
    Task<IEnumerable<T>> Find(Func<T, bool> predicate);
    Task Add(T entity);
    Task AddRange(IEnumerable<T> entities);
    Task Update(T entity);
    Task Delete(T entity);
    Task DeleteRange(IEnumerable<T> entities);
    Task SaveChangesAsync();
}

public interface IUnitOfWork
{
    IRepository<District> Districts { get; }
    IRepository<Block> Blocks { get; }
    IRepository<Coach> Coaches { get; }
    IRepository<Teacher> Teachers { get; }
    IRepository<TLCGroup> TLCGroups { get; }
    IRepository<TeacherLeader> TeacherLeaders { get; }
    IRepository<TLCMember> TLCMembers { get; }
    IRepository<TLCAndMasterclass> TLCAndMasterclasses { get; }
    IRepository<TLCAttendance> TLCAttendances { get; }
    IRepository<Role> Roles { get; }
    IRepository<User> Users { get; }
    IRepository<AuditLog> AuditLogs { get; }
    IRepository<UploadLog> UploadLogs { get; }
    Task SaveChangesAsync();
    Task BeginTransactionAsync();
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}
