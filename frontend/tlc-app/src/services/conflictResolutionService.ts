import type { TransactionalRecord } from '../db/enhancedDb';

export type ConflictResolutionStrategy = 'clientWins' | 'serverWins' | 'merged' | 'manual';

export interface ConflictDetectionResult {
  hasConflict: boolean;
  clientVersion: number;
  serverVersion: number;
  lastCommonVersion: number;
  conflictType: 'updateConflict' | 'deleteConflict' | 'fieldConflict' | 'none';
}

export interface ResolvedConflict {
  strategy: ConflictResolutionStrategy;
  mergedData: Record<string, unknown>;
  clientWinsFields: string[];
  serverWinsFields: string[];
  requiresManualReview: boolean;
  resolution: string;
}

/**
 * Detect if there's a conflict between client and server versions
 */
export function detectConflict(
  clientRecord: TransactionalRecord,
  serverData: Record<string, unknown> & { version?: number }
): ConflictDetectionResult {
  const clientVersion = clientRecord.clientVersion;
  const serverVersion = serverData.version || clientRecord.serverVersion || 0;

  // No conflict if server hasn't been updated since last client sync
  if (clientRecord.serverVersion && serverVersion <= clientRecord.serverVersion) {
    return {
      hasConflict: false,
      clientVersion,
      serverVersion,
      lastCommonVersion: clientRecord.serverVersion || 0,
      conflictType: 'none',
    };
  }

  // If there's a newer server version and client has also changed
  if (serverVersion > (clientRecord.serverVersion || 0) && clientVersion > (clientRecord.serverVersion || 0)) {
    return {
      hasConflict: true,
      clientVersion,
      serverVersion,
      lastCommonVersion: clientRecord.serverVersion || 0,
      conflictType: 'updateConflict',
    };
  }

  return {
    hasConflict: false,
    clientVersion,
    serverVersion,
    lastCommonVersion: clientRecord.serverVersion || 0,
    conflictType: 'none',
  };
}

/**
 * Resolve conflicts using a multi-strategy approach
 */
export function resolveConflict(
  clientData: Record<string, unknown>,
  serverData: Record<string, unknown>,
  strategy: ConflictResolutionStrategy = 'merged',
  clientLastModified?: number,
  serverLastModified?: number
): ResolvedConflict {
  switch (strategy) {
    case 'clientWins':
      return {
        strategy: 'clientWins',
        mergedData: clientData,
        clientWinsFields: Object.keys(clientData),
        serverWinsFields: [],
        requiresManualReview: false,
        resolution: 'Client data retained; server data discarded.',
      };

    case 'serverWins':
      return {
        strategy: 'serverWins',
        mergedData: serverData,
        clientWinsFields: [],
        serverWinsFields: Object.keys(serverData),
        requiresManualReview: false,
        resolution: 'Server data retained; client changes discarded.',
      };

    case 'merged':
      return mergeData(clientData, serverData, clientLastModified, serverLastModified);

    case 'manual':
      return {
        strategy: 'manual',
        mergedData: clientData, // Default to client until user decides
        clientWinsFields: Object.keys(clientData),
        serverWinsFields: Object.keys(serverData),
        requiresManualReview: true,
        resolution: 'Manual review required. Display both versions to user.',
      };

    default:
      return {
        strategy: 'merged',
        mergedData: clientData,
        clientWinsFields: Object.keys(clientData),
        serverWinsFields: [],
        requiresManualReview: false,
        resolution: 'Default to client.',
      };
  }
}

/**
 * Intelligent merge strategy for conflicting data
 * Prefers field-level conflict resolution over document-level
 */
function mergeData(
  clientData: Record<string, unknown>,
  serverData: Record<string, unknown>,
  clientLastModified?: number,
  serverLastModified?: number
): ResolvedConflict {
  const mergedData: Record<string, unknown> = {};
  const clientWinsFields: string[] = [];
  const serverWinsFields: string[] = [];

  const allKeys = new Set([...Object.keys(clientData), ...Object.keys(serverData)]);

  for (const key of allKeys) {
    const clientValue = clientData[key];
    const serverValue = serverData[key];

    // If values are identical, no conflict
    if (JSON.stringify(clientValue) === JSON.stringify(serverValue)) {
      mergedData[key] = clientValue;
      continue;
    }

    // If only in client, use client
    if (!(key in serverData)) {
      mergedData[key] = clientValue;
      clientWinsFields.push(key);
      continue;
    }

    // If only in server, use server
    if (!(key in clientData)) {
      mergedData[key] = serverValue;
      serverWinsFields.push(key);
      continue;
    }

    // Both have values but they differ - use timestamp if available
    if (clientLastModified && serverLastModified) {
      if (clientLastModified > serverLastModified) {
        mergedData[key] = clientValue;
        clientWinsFields.push(key);
      } else {
        mergedData[key] = serverValue;
        serverWinsFields.push(key);
      }
    } else {
      // Default: prefer client if no timestamp
      mergedData[key] = clientValue;
      clientWinsFields.push(key);
    }
  }

  return {
    strategy: 'merged',
    mergedData,
    clientWinsFields,
    serverWinsFields,
    requiresManualReview: clientWinsFields.length > 0 && serverWinsFields.length > 0,
    resolution: `Merged: ${clientWinsFields.length} fields from client, ${serverWinsFields.length} from server.`,
  };
}

/**
 * Determine the best conflict resolution strategy based on entity type and operation
 */
export function determineStrategy(
  entityType: string,
  _operation: 'create' | 'update' | 'delete',
  conflictAge: number // Time elapsed since last sync (ms)
): ConflictResolutionStrategy {
  // For critical data, use manual review if conflict is recent
  if (conflictAge < 60000) {
    // Less than 1 minute old
    if (entityType === 'attendance' || entityType === 'tlc') {
      return 'manual'; // Require manual review for critical records
    }
  }

  // For master data updates, prefer server wins (authoritative source)
  if (entityType === 'teacher' || entityType === 'tlcGroup') {
    return 'serverWins';
  }

  // For transactional data, try to merge
  return 'merged';
}

/**
 * Generate a human-readable conflict description
 */
export function getConflictDescription(
  clientData: Record<string, unknown>,
  serverData: Record<string, unknown>,
  entityType: string
): string {
  const changes = {
    clientOnly: Object.keys(clientData).filter(k => !(k in serverData)),
    serverOnly: Object.keys(serverData).filter(k => !(k in clientData)),
    modified: Object.keys(clientData).filter(
      k => k in serverData && JSON.stringify(clientData[k]) !== JSON.stringify(serverData[k])
    ),
  };

  const parts: string[] = [];

  if (changes.clientOnly.length > 0) {
    parts.push(`Client added/modified: ${changes.clientOnly.join(', ')}`);
  }

  if (changes.serverOnly.length > 0) {
    parts.push(`Server changed: ${changes.serverOnly.join(', ')}`);
  }

  if (changes.modified.length > 0) {
    parts.push(`Both modified: ${changes.modified.join(', ')}`);
  }

  return parts.length > 0
    ? `Conflict detected in ${entityType}: ${parts.join('; ')}`
    : `Unknown conflict in ${entityType}`;
}
