using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using TLC.Core.Models;
using TLC.Core.Services;

namespace TLC.Infrastructure.Repositories;

public class Repository<T> : IRepository<T> where T : class
{
    private readonly TLCDbContext _context;
    private readonly DbSet<T> _dbSet;

    public Repository(TLCDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T?> GetById(int id)
    {
        return await _dbSet.FindAsync(id);
    }

    public async Task<IEnumerable<T>> GetAll()
    {
        return await _dbSet.ToListAsync();
    }

    public async Task<IEnumerable<T>> Find(Func<T, bool> predicate)
    {
        return await Task.FromResult(_dbSet.Where(predicate).AsEnumerable());
    }

    public async Task Add(T entity)
    {
        await _dbSet.AddAsync(entity);
    }

    public async Task AddRange(IEnumerable<T> entities)
    {
        await _dbSet.AddRangeAsync(entities);
    }

    public Task Update(T entity)
    {
        _dbSet.Update(entity);
        return Task.CompletedTask;
    }

    public Task Delete(T entity)
    {
        _dbSet.Remove(entity);
        return Task.CompletedTask;
    }

    public Task DeleteRange(IEnumerable<T> entities)
    {
        _dbSet.RemoveRange(entities);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}

public class UnitOfWork : IUnitOfWork
{
    private readonly TLCDbContext _context;
    private IDbContextTransaction? _transaction;

    private IRepository<District>? _districts;
    private IRepository<Block>? _blocks;
    private IRepository<Coach>? _coaches;
    private IRepository<Teacher>? _teachers;
    private IRepository<TLCGroup>? _tlcGroups;
    private IRepository<TeacherLeader>? _teacherLeaders;
    private IRepository<TLCMember>? _tlcMembers;
    private IRepository<TLCAndMasterclass>? _tlcAndMasterclasses;
    private IRepository<TLCAttendance>? _tlcAttendances;
    private IRepository<Role>? _roles;
    private IRepository<User>? _users;
    private IRepository<AuditLog>? _auditLogs;
    private IRepository<UploadLog>? _uploadLogs;

    public UnitOfWork(TLCDbContext context)
    {
        _context = context;
    }

    public IRepository<District> Districts => _districts ??= new Repository<District>(_context);
    public IRepository<Block> Blocks => _blocks ??= new Repository<Block>(_context);
    public IRepository<Coach> Coaches => _coaches ??= new Repository<Coach>(_context);
    public IRepository<Teacher> Teachers => _teachers ??= new Repository<Teacher>(_context);
    public IRepository<TLCGroup> TLCGroups => _tlcGroups ??= new Repository<TLCGroup>(_context);
    public IRepository<TeacherLeader> TeacherLeaders => _teacherLeaders ??= new Repository<TeacherLeader>(_context);
    public IRepository<TLCMember> TLCMembers => _tlcMembers ??= new Repository<TLCMember>(_context);
    public IRepository<TLCAndMasterclass> TLCAndMasterclasses => _tlcAndMasterclasses ??= new Repository<TLCAndMasterclass>(_context);
    public IRepository<TLCAttendance> TLCAttendances => _tlcAttendances ??= new Repository<TLCAttendance>(_context);
    public IRepository<Role> Roles => _roles ??= new Repository<Role>(_context);
    public IRepository<User> Users => _users ??= new Repository<User>(_context);
    public IRepository<AuditLog> AuditLogs => _auditLogs ??= new Repository<AuditLog>(_context);
    public IRepository<UploadLog> UploadLogs => _uploadLogs ??= new Repository<UploadLog>(_context);

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }

    public async Task BeginTransactionAsync()
    {
        _transaction = await _context.Database.BeginTransactionAsync();
    }

    public async Task CommitTransactionAsync()
    {
        try
        {
            await _context.SaveChangesAsync();
            if (_transaction != null)
                await _transaction.CommitAsync();
        }
        catch
        {
            if (_transaction != null)
                await _transaction.RollbackAsync();
            throw;
        }
        finally
        {
            if (_transaction != null)
            {
                await _transaction.DisposeAsync();
                _transaction = null;
            }
        }
    }

    public async Task RollbackTransactionAsync()
    {
        try
        {
            if (_transaction != null)
                await _transaction.RollbackAsync();
        }
        finally
        {
            if (_transaction != null)
            {
                await _transaction.DisposeAsync();
                _transaction = null;
            }
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}
