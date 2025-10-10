import { z } from 'zod';

// Product schemas
export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['active', 'draft', 'archived']),
  handle: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  price: z.number().optional(),
  compareAtPrice: z.number().optional()
});

export const ProductVariantSchema = z.object({
  id: z.string(),
  productId: z.string(),
  title: z.string(),
  sku: z.string().optional(),
  price: z.number(),
  compareAtPrice: z.number().optional(),
  inventoryQuantity: z.number()
});

// Order schemas
export const OrderSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  totalPrice: z.number(),
  financialStatus: z.string(),
  fulfillmentStatus: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Customer schemas
export const CustomerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  ordersCount: z.number(),
  totalSpent: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Agent schemas
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['active', 'inactive', 'error']),
  lastRun: z.string().optional(),
  nextScheduled: z.string().optional(),
  successRate: z.number().min(0).max(1)
});

// Opportunity schemas
export const OpportunitySchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  potentialRevenue: z.number(),
  confidence: z.number().min(0).max(1),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  createdAt: z.string(),
  agentSource: z.string()
});

// System status schemas
export const SystemStatusSchema = z.object({
  timestamp: z.string(),
  agents: z.object({
    total: z.number(),
    active: z.number(),
    idle: z.number(),  
    failed: z.number()
  }),
  services: z.object({
    database: z.enum(['healthy', 'degraded', 'down']),
    redis: z.enum(['healthy', 'degraded', 'down']),
    shopify: z.enum(['healthy', 'degraded', 'down'])
  }),
  circuits: z.record(z.enum(['open', 'closed', 'half_open']))
});

// Export types
export type Product = z.infer<typeof ProductSchema>;
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type Agent = z.infer<typeof AgentSchema>;
export type Opportunity = z.infer<typeof OpportunitySchema>;
export type SystemStatus = z.infer<typeof SystemStatusSchema>;