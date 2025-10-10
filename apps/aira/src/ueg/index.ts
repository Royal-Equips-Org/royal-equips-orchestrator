/**
 * AIRA Unified Empire Graph (UEG) - Omniscient Context Management
 * 
 * Maintains comprehensive empire state including:
 * - Codebase structure and API schemas
 * - Entities and relationships
 * - Infrastructure topology
 * - Data flows and dependencies
 */

export interface UEGEntity {
  id: string;
  type: 'repo' | 'service' | 'workflow' | 'dataset' | 'table' | 'secret' | 'env' | 'endpoint' | 'dashboard' | 'campaign' | 'product' | 'order' | 'customer' | 'incident';
  name: string;
  metadata: Record<string, unknown>;
  relationships: UEGRelationship[];
  lastUpdated: string;
}

export interface UEGRelationship {
  type: 'produces' | 'consumes' | 'deploys_to' | 'protects' | 'depends_on' | 'alerts_to';
  targetId: string;
  metadata?: Record<string, unknown>;
}

export interface UEGSnapshot {
  timestamp: string;
  entities: UEGEntity[];
  metrics: {
    totalEntities: number;
    entityTypes: Record<string, number>;
    relationshipTypes: Record<string, number>;
  };
  version: string;
}

/**
 * Create a snapshot of the current Unified Empire Graph
 * 
 * In production, this would query:
 * - Supabase for schema and runtime data
 * - GitHub for repository structure
 * - GCP for infrastructure topology
 * - BigQuery for historical data
 */
export async function snapshotUEG(): Promise<UEGSnapshot> {
  const timestamp = new Date().toISOString();
  
  // For MVP, return a basic snapshot with example entities
  const entities: UEGEntity[] = [
    {
      id: 'repo_royal_equips_orchestrator',
      type: 'repo',
      name: 'royal-equips-orchestrator',
      metadata: {
        url: 'https://github.com/Royal-Equips-Org/royal-equips-orchestrator',
        language: 'TypeScript',
        framework: 'Node.js',
        status: 'active'
      },
      relationships: [
        { type: 'produces', targetId: 'service_aira' },
        { type: 'produces', targetId: 'service_command_center' }
      ],
      lastUpdated: timestamp
    },
    {
      id: 'service_aira',
      type: 'service',
      name: 'AIRA Main Empire Agent',
      metadata: {
        port: 10000,
        status: 'running',
        version: '1.0.0',
        framework: 'Fastify'
      },
      relationships: [
        { type: 'depends_on', targetId: 'repo_royal_equips_orchestrator' },
        { type: 'consumes', targetId: 'database_supabase' }
      ],
      lastUpdated: timestamp
    },
    {
      id: 'service_command_center',
      type: 'service',
      name: 'Command Center UI',
      metadata: {
        port: 3000,
        status: 'development',
        framework: 'Next.js'
      },
      relationships: [
        { type: 'depends_on', targetId: 'repo_royal_equips_orchestrator' },
        { type: 'consumes', targetId: 'service_aira' }
      ],
      lastUpdated: timestamp
    },
    {
      id: 'database_supabase',
      type: 'dataset',
      name: 'Supabase Database',
      metadata: {
        type: 'PostgreSQL',
        status: 'operational',
        tables: ['agents', 'executions', 'approvals']
      },
      relationships: [
        { type: 'produces', targetId: 'service_aira' }
      ],
      lastUpdated: timestamp
    }
  ];
  
  // Calculate metrics
  const entityTypes: Record<string, number> = {};
  const relationshipTypes: Record<string, number> = {};
  
  for (const entity of entities) {
    entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;
    
    for (const rel of entity.relationships) {
      relationshipTypes[rel.type] = (relationshipTypes[rel.type] || 0) + 1;
    }
  }
  
  return {
    timestamp,
    entities,
    metrics: {
      totalEntities: entities.length,
      entityTypes,
      relationshipTypes
    },
    version: '1.0.0'
  };
}

/**
 * Query UEG for entities matching criteria
 */
export async function queryUEG(
  snapshot: UEGSnapshot,
  criteria: {
    type?: string;
    name?: string;
    relationshipType?: string;
    targetId?: string;
  }
): Promise<UEGEntity[]> {
  let results = snapshot.entities;
  
  if (criteria.type) {
    results = results.filter(entity => entity.type === criteria.type);
  }
  
  if (criteria.name) {
    results = results.filter(entity => 
      entity.name.toLowerCase().includes(criteria.name!.toLowerCase())
    );
  }
  
  if (criteria.relationshipType) {
    results = results.filter(entity =>
      entity.relationships.some(rel => rel.type === criteria.relationshipType)
    );
  }
  
  if (criteria.targetId) {
    results = results.filter(entity =>
      entity.relationships.some(rel => rel.targetId === criteria.targetId)
    );
  }
  
  return results;
}

/**
 * Get entity dependencies (what this entity depends on)
 */
export async function getEntityDependencies(
  snapshot: UEGSnapshot,
  entityId: string
): Promise<UEGEntity[]> {
  const entity = snapshot.entities.find(e => e.id === entityId);
  if (!entity) {
    return [];
  }
  
  const dependencyIds = entity.relationships
    .filter(rel => rel.type === 'depends_on')
    .map(rel => rel.targetId);
  
  return snapshot.entities.filter(e => dependencyIds.includes(e.id));
}

/**
 * Get entity dependents (what depends on this entity)
 */
export async function getEntityDependents(
  snapshot: UEGSnapshot,
  entityId: string
): Promise<UEGEntity[]> {
  return snapshot.entities.filter(entity =>
    entity.relationships.some(rel => 
      rel.type === 'depends_on' && rel.targetId === entityId
    )
  );
}