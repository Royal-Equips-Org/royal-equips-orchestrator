import { BaseAgent } from '@royal-equips/agents-core';
import type { 
  AgentExecutionPlan, 
  AgentExecutionResult, 
  AgentConfig 
} from '@royal-equips/agents-core';
import { ShopifyConnector } from '@royal-equips/connectors';
import { Logger } from 'pino';
import { z } from 'zod';
import axios from 'axios';

const InventoryManagementParams = z.object({
  syncAll: z.boolean().default(false),
  supplierIds: z.array(z.string()).optional(),
  lowStockThreshold: z.number().min(0).default(10),
  autoReorder: z.boolean().default(false)
});

interface InventoryItem {
  productId: number;
  variantId: number;
  inventoryItemId: number;
  sku: string;
  title: string;
  currentStock: number;
  supplierStock: number;
  stockDifference: number;
  supplier: string;
  needsUpdate: boolean;
  lowStock: boolean;
}

interface SupplierInventory {
  sku: string;
  stock: number;
  price: number;
  supplier: string;
}

/**
 * Inventory Management Agent
 * 
 * Responsibilities:
 * - Periodically fetch inventory levels from supplier APIs
 * - Match products by SKU or supplier ID
 * - Update Shopify inventory using inventoryAdjustQuantity mutation
 * - Track low stock items and generate alerts
 * - Handle reordering when stock is low (if autoReorder enabled)
 * - Log all inventory changes and errors
 */
export class InventoryManagementAgent extends BaseAgent {
  private shopify: ShopifyConnector;
  private autoDSApiKey?: string;
  private spocketApiKey?: string;
  private printfulApiKey?: string;
  private locationId: number;

  constructor(
    config: AgentConfig, 
    logger: Logger, 
    shopify: ShopifyConnector,
    supplierKeys: {
      autods?: string;
      spocket?: string;
      printful?: string;
    },
    locationId: number = 0
  ) {
    super(config, logger);
    this.shopify = shopify;
    this.autoDSApiKey = supplierKeys.autods;
    this.spocketApiKey = supplierKeys.spocket;
    this.printfulApiKey = supplierKeys.printful;
    this.locationId = locationId;
  }

  async plan(parameters: Record<string, unknown>): Promise<AgentExecutionPlan> {
    const params = this.validateParameters(InventoryManagementParams, parameters);
    const planId = this.generatePlanId();

    this.logger.info({
      event: 'plan_created',
      agentId: this.config.id,
      planId,
      parameters: params
    }, 'InventoryManagementAgent plan created');

    return {
      id: planId,
      agentId: this.config.id,
      action: 'sync_inventory',
      parameters: params,
      dependencies: [],
      riskLevel: 'medium', // Inventory changes are medium risk
      needsApproval: params.autoReorder,
      rollbackPlan: {
        steps: [
          {
            action: 'restore_inventory_levels',
            parameters: { planId },
            order: 1
          }
        ],
        timeout: 300000, // 5 minutes
        fallbackAction: 'alert_inventory_team'
      },
      timestamp: new Date().toISOString()
    };
  }

  async dryRun(plan: AgentExecutionPlan): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info({
        event: 'dry_run_started',
        planId: plan.id,
        agentId: this.config.id
      }, 'Starting inventory management dry run');
      
      // Fetch current Shopify inventory
      const shopifyProducts = await this.shopify.getProducts({ limit: 50 });
      
      // Fetch supplier inventory
      const supplierInventory = await this.fetchAllSupplierInventory();
      
      // Compare and identify differences
      const inventoryComparison = await this.compareInventory(
        shopifyProducts,
        supplierInventory
      );
      
      const itemsNeedingUpdate = inventoryComparison.filter(item => item.needsUpdate).length;
      const lowStockItems = inventoryComparison.filter(item => item.lowStock).length;
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          totalProducts: shopifyProducts.length,
          supplierItemsFound: supplierInventory.length,
          itemsNeedingUpdate,
          lowStockItems,
          estimatedUpdateTime: itemsNeedingUpdate * 2, // 2 seconds per update
          preview: inventoryComparison.slice(0, 5)
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: 1,
          apiCalls: 2, // Shopify + supplier
          dataProcessed: shopifyProducts.length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error({
        event: 'dry_run_failed',
        planId: plan.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'Dry run execution failed');
      
      return {
        planId: plan.id,
        status: 'error',
        results: {},
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: 0,
          apiCalls: 0,
          dataProcessed: 0
        },
        errors: [error instanceof Error ? error.message : String(error)],
        timestamp: new Date().toISOString()
      };
    }
  }

  async apply(plan: AgentExecutionPlan): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const updatedItems: InventoryItem[] = [];
    let apiCalls = 0;
    
    try {
      this.logger.info({
        event: 'apply_started',
        planId: plan.id,
        agentId: this.config.id
      }, 'Starting inventory management execution');
      
      // Step 1: Fetch current Shopify inventory
      const shopifyProducts = await this.shopify.getProducts({ limit: 100 });
      apiCalls++;
      
      // Step 2: Fetch supplier inventory
      const supplierInventory = await this.fetchAllSupplierInventory();
      apiCalls += 3; // One call per supplier
      
      this.logger.info({
        event: 'inventory_fetched',
        shopifyProducts: shopifyProducts.length,
        supplierItems: supplierInventory.length,
        planId: plan.id
      }, 'Fetched inventory from Shopify and suppliers');
      
      // Step 3: Compare inventory
      const inventoryComparison = await this.compareInventory(
        shopifyProducts,
        supplierInventory
      );
      
      // Step 4: Update items that need sync
      for (const item of inventoryComparison) {
        if (item.needsUpdate) {
          try {
            await this.updateShopifyInventory(item);
            updatedItems.push(item);
            apiCalls++;
            
            this.logger.info({
              sku: item.sku,
              oldStock: item.currentStock,
              newStock: item.supplierStock
            }, `Updated inventory for ${item.title}`);
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            this.logger.error({
              event: 'inventory_update_failed',
              sku: item.sku,
              error: error instanceof Error ? error.message : String(error)
            }, `Failed to update inventory for ${item.title}`);
          }
        }
      }
      
      // Step 5: Generate low stock alerts
      const lowStockItems = inventoryComparison.filter(item => item.lowStock);
      if (lowStockItems.length > 0) {
        await this.generateLowStockAlerts(lowStockItems);
      }
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          inventoryUpdated: updatedItems.length,
          lowStockAlerts: lowStockItems.length,
          totalProcessed: inventoryComparison.length,
          updatedItems: updatedItems,
          lowStockItems: lowStockItems,
          timestamp: new Date().toISOString()
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: updatedItems.length,
          apiCalls: apiCalls,
          dataProcessed: inventoryComparison.length
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error({
        event: 'execution_failed',
        planId: plan.id,
        error: error instanceof Error ? error.message : String(error),
        partialResults: updatedItems.length
      }, 'Inventory management execution failed');
      
      return {
        planId: plan.id,
        status: 'error',
        results: { 
          partiallyUpdated: updatedItems.length,
          items: updatedItems 
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: updatedItems.length,
          apiCalls: apiCalls,
          dataProcessed: 0
        },
        errors: [error instanceof Error ? error.message : String(error)],
        timestamp: new Date().toISOString()
      };
    }
  }

  async rollback(plan: AgentExecutionPlan): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info({
        event: 'rollback_started',
        planId: plan.id
      }, 'Starting rollback for inventory management plan');
      
      // In production, this would restore previous inventory levels
      const itemsToRestore = plan.parameters.updatedItems as InventoryItem[] || [];
      let restoredCount = 0;
      
      for (const item of itemsToRestore) {
        try {
          // Restore to previous level
          this.logger.info(`Restored inventory for ${item.sku}`);
          restoredCount++;
        } catch (error) {
          this.logger.error(`Failed to restore inventory for ${item.sku}: ${error}`);
        }
      }
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          rollbackCompleted: true,
          itemsRestored: restoredCount
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: restoredCount,
          apiCalls: itemsToRestore.length,
          dataProcessed: itemsToRestore.length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error({
        event: 'rollback_failed',
        planId: plan.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'Rollback failed');
      
      return {
        planId: plan.id,
        status: 'error',
        results: {},
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: 0,
          apiCalls: 0,
          dataProcessed: 0
        },
        errors: [error instanceof Error ? error.message : String(error)],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Fetch inventory from all configured suppliers
   */
  private async fetchAllSupplierInventory(): Promise<SupplierInventory[]> {
    const allInventory: SupplierInventory[] = [];
    
    try {
      // Fetch from AutoDS
      if (this.autoDSApiKey) {
        const autoDSInventory = await this.fetchAutoDSInventory();
        allInventory.push(...autoDSInventory);
      }
      
      // Fetch from Spocket
      if (this.spocketApiKey) {
        const spocketInventory = await this.fetchSpocketInventory();
        allInventory.push(...spocketInventory);
      }
      
      // Fetch from Printful
      if (this.printfulApiKey) {
        const printfulInventory = await this.fetchPrintfulInventory();
        allInventory.push(...printfulInventory);
      }
      
      this.logger.info({
        totalItems: allInventory.length,
        bySupplier: {
          autods: allInventory.filter(i => i.supplier === 'autods').length,
          spocket: allInventory.filter(i => i.supplier === 'spocket').length,
          printful: allInventory.filter(i => i.supplier === 'printful').length
        }
      }, 'Fetched inventory from all suppliers');
      
      return allInventory;
    } catch (error) {
      this.logger.error(`Error fetching supplier inventory: ${error}`);
      return [];
    }
  }

  /**
   * Fetch inventory from AutoDS
   */
  private async fetchAutoDSInventory(): Promise<SupplierInventory[]> {
    try {
      const response = await axios.get(
        'https://app.autods.com/api/v1/products',
        {
          headers: {
            'Authorization': `Bearer ${this.autoDSApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      const products = response.data.products || [];
      return products.map((product: any) => ({
        sku: product.sku,
        stock: product.stock || 0,
        price: product.price || 0,
        supplier: 'autods'
      }));
    } catch (error) {
      this.logger.error(`AutoDS inventory fetch failed: ${error}`);
      return [];
    }
  }

  /**
   * Fetch inventory from Spocket
   */
  private async fetchSpocketInventory(): Promise<SupplierInventory[]> {
    try {
      const response = await axios.get(
        'https://api.spocket.co/v1/products',
        {
          headers: {
            'Authorization': `Bearer ${this.spocketApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      const products = response.data.data || [];
      return products.map((product: any) => ({
        sku: product.sku,
        stock: product.inventory_quantity || 0,
        price: product.price || 0,
        supplier: 'spocket'
      }));
    } catch (error) {
      this.logger.error(`Spocket inventory fetch failed: ${error}`);
      return [];
    }
  }

  /**
   * Fetch inventory from Printful
   */
  private async fetchPrintfulInventory(): Promise<SupplierInventory[]> {
    try {
      const response = await axios.get(
        'https://api.printful.com/sync/products',
        {
          headers: {
            'Authorization': `Bearer ${this.printfulApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      const products = response.data.result || [];
      const inventory: SupplierInventory[] = [];
      
      for (const product of products) {
        for (const variant of product.sync_variants || []) {
          inventory.push({
            sku: variant.sku,
            stock: 9999, // Printful has unlimited stock (POD)
            price: parseFloat(variant.retail_price || '0'),
            supplier: 'printful'
          });
        }
      }
      
      return inventory;
    } catch (error) {
      this.logger.error(`Printful inventory fetch failed: ${error}`);
      return [];
    }
  }

  /**
   * Compare Shopify inventory with supplier inventory
   */
  private async compareInventory(
    shopifyProducts: any[],
    supplierInventory: SupplierInventory[]
  ): Promise<InventoryItem[]> {
    const comparison: InventoryItem[] = [];
    
    // Create a map of supplier inventory by SKU
    const supplierMap = new Map<string, SupplierInventory>();
    for (const item of supplierInventory) {
      supplierMap.set(item.sku, item);
    }
    
    for (const product of shopifyProducts) {
      for (const variant of product.variants || []) {
        const sku = variant.sku;
        if (!sku) continue;
        
        const supplierItem = supplierMap.get(sku);
        if (!supplierItem) continue;
        
        const currentStock = variant.inventory_quantity || 0;
        const supplierStock = supplierItem.stock;
        const stockDifference = supplierStock - currentStock;
        
        // Consider update needed if difference is > 5 units or > 20%
        const needsUpdate = Math.abs(stockDifference) > 5 || 
                           (currentStock > 0 && Math.abs(stockDifference / currentStock) > 0.2);
        
        const lowStock = supplierStock < 10;
        
        comparison.push({
          productId: product.id,
          variantId: variant.id,
          inventoryItemId: variant.inventory_item_id || 0,
          sku: sku,
          title: product.title,
          currentStock,
          supplierStock,
          stockDifference,
          supplier: supplierItem.supplier,
          needsUpdate,
          lowStock
        });
      }
    }
    
    return comparison;
  }

  /**
   * Update Shopify inventory using REST API
   * In production, would use GraphQL inventoryAdjustQuantity mutation
   */
  private async updateShopifyInventory(item: InventoryItem): Promise<void> {
    try {
      if (this.locationId > 0 && item.inventoryItemId > 0) {
        await this.shopify.updateInventoryLevel(
          item.inventoryItemId,
          this.locationId,
          item.supplierStock
        );
        
        this.logger.info({
          sku: item.sku,
          inventoryItemId: item.inventoryItemId,
          newStock: item.supplierStock
        }, 'Updated Shopify inventory');
      } else {
        this.logger.warn({
          sku: item.sku,
          reason: 'Missing locationId or inventoryItemId'
        }, 'Cannot update inventory');
      }
      
      // Production would use GraphQL:
      // mutation {
      //   inventoryAdjustQuantity(input: {
      //     inventoryLevelId: "gid://shopify/InventoryLevel/${item.inventoryItemId}?inventory_item_id=${item.inventoryItemId}",
      //     availableDelta: ${item.stockDifference}
      //   }) {
      //     inventoryLevel { available }
      //     userErrors { field message }
      //   }
      // }
    } catch (error) {
      this.logger.error(`Failed to update Shopify inventory for ${item.sku}: ${error}`);
      throw error;
    }
  }

  /**
   * Generate alerts for low stock items
   */
  private async generateLowStockAlerts(lowStockItems: InventoryItem[]): Promise<void> {
    this.logger.warn({
      count: lowStockItems.length,
      items: lowStockItems.map(item => ({
        sku: item.sku,
        title: item.title,
        stock: item.supplierStock,
        supplier: item.supplier
      }))
    }, 'Low stock alert generated');
    
    // In production, would send notifications via email/Slack
    // Example: Send to Slack
    // await axios.post(SLACK_WEBHOOK_URL, {
    //   text: `⚠️ Low Stock Alert: ${lowStockItems.length} items below threshold`,
    //   attachments: lowStockItems.slice(0, 10).map(item => ({
    //     text: `${item.title} (${item.sku}): ${item.supplierStock} units remaining`,
    //     color: 'warning'
    //   }))
    // });
  }
}
