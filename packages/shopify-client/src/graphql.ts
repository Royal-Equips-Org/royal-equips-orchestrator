import ky from "ky";
import pRetry from "p-retry";

export class ShopifyGraphQL {
  constructor(private endpoint: string, private token: string) {}
  
  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return pRetry(async () => {
      const res = await ky.post(this.endpoint, {
        timeout: 15000,
        headers: { 
          "X-Shopify-Access-Token": this.token, 
          "Content-Type": "application/json" 
        },
        json: { query, variables }
      }).json<any>();
      
      if (res.errors) {
        throw new Error(JSON.stringify(res.errors));
      }
      
      return res.data as T;
    }, { retries: 3 });
  }
}

export const GQL_PRODUCTS = `
  query Products($cursor: String) {
    products(first: 100, after: $cursor) {
      edges { 
        cursor 
        node { 
          id 
          title 
          status 
          handle 
          createdAt 
          updatedAt 
          variants(first: 100) { 
            edges { 
              node { 
                id 
                sku 
                price 
                compareAtPrice 
                inventoryItem { 
                  id 
                } 
              } 
            } 
          } 
        } 
      }
      pageInfo { 
        hasNextPage 
      }
    }
  }`;

export const GQL_ORDERS = `
  query Orders($cursor: String) {
    orders(first: 100, after: $cursor) {
      edges {
        cursor
        node {
          id
          name
          email
          totalPrice
          financialStatus
          fulfillmentStatus
          createdAt
          updatedAt
          customer {
            id
            email
            firstName
            lastName
          }
          lineItems(first: 100) {
            edges {
              node {
                id
                title
                quantity
                price
                product {
                  id
                  title
                }
                variant {
                  id
                  title
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }`;

export const GQL_CUSTOMERS = `
  query Customers($cursor: String) {
    customers(first: 100, after: $cursor) {
      edges {
        cursor
        node {
          id
          email
          firstName
          lastName
          phone
          createdAt
          updatedAt
          ordersCount
          totalSpent
          addresses {
            id
            address1
            address2
            city
            province
            country
            zip
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }`;

// Product mutations
export const GQL_CREATE_PRODUCT = `
  mutation productCreate($product: ProductInput!) {
    productCreate(input: $product) {
      product {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }`;

export const GQL_UPDATE_PRODUCT = `
  mutation productUpdate($product: ProductInput!) {
    productUpdate(input: $product) {
      product {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }`;