export interface ShopifyProduct {
  id: string;
  title: string;
  status: 'active' | 'draft' | 'archived';
  handle: string;
  createdAt: string;
  updatedAt: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        sku: string;
        price: string;
        compareAtPrice?: string;
        inventoryItem: {
          id: string;
        };
      };
    }>;
  };
}

export interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  totalPrice: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  lineItems: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        quantity: number;
        price: string;
        product: {
          id: string;
          title: string;
        };
        variant: {
          id: string;
          title: string;
        };
      };
    }>;
  };
}

export interface ShopifyCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  ordersCount: number;
  totalSpent: string;
  addresses: Array<{
    id: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  }>;
}

export interface PageInfo {
  hasNextPage: boolean;
}

export interface ProductsResponse {
  products: {
    edges: Array<{
      cursor: string;
      node: ShopifyProduct;
    }>;
    pageInfo: PageInfo;
  };
}

export interface OrdersResponse {
  orders: {
    edges: Array<{
      cursor: string;
      node: ShopifyOrder;
    }>;
    pageInfo: PageInfo;
  };
}

export interface CustomersResponse {
  customers: {
    edges: Array<{
      cursor: string;
      node: ShopifyCustomer;
    }>;
    pageInfo: PageInfo;
  };
}