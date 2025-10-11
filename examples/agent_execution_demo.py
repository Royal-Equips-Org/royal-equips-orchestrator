#!/usr/bin/env python3
"""
Demonstration script for the enhanced Product Research Agent execution.

This script shows how to:
1. Execute the product research agent with custom parameters
2. Track execution progress
3. Retrieve and display results
4. Parse product data for business decisions

Usage:
    python examples/agent_execution_demo.py
"""

import sys
import time
import json
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app import create_app


def format_product(product, index=1):
    """Format a product for display."""
    lines = [
        f"\n{'='*70}",
        f"Product #{index}: {product['title']}",
        f"{'='*70}",
        f"📦 Category:        {product['category']}",
        f"💰 Retail Price:    ${product['price']:.2f}",
        f"🏭 Supplier Price:  ${product['supplier_price']:.2f}",
        f"📊 Margin:          ${product['margin']:.2f} ({product['margin_percent']:.1f}%)",
        f"⭐ Empire Score:    {product['empire_score']:.2f}/100",
        f"📈 Trend Score:     {product['trend_score']}/100",
        f"💼 Profit Potential: {product['profit_potential']}",
        f"🎯 Market Viability: {product['market_viability']}",
        f"🚚 Shipping:        {product['shipping_time']}",
        f"🏪 Supplier:        {product['supplier_name']} (⭐ {product['rating']}/5.0)",
        f"🔗 Source:          {product['source']}",
    ]
    return "\n".join(lines)


def execute_product_research():
    """Execute product research agent and display results."""
    print("\n" + "="*70)
    print("🏰 ROYAL EQUIPS - PRODUCT RESEARCH AGENT DEMONSTRATION")
    print("="*70)
    
    # Create Flask app and test client
    app = create_app()
    client = app.test_client()
    
    # Define search parameters
    params = {
        "parameters": {
            "categories": ["electronics", "home"],
            "maxProducts": 15,
            "minMargin": 35
        }
    }
    
    print("\n📋 Execution Parameters:")
    print(f"   Categories: {', '.join(params['parameters']['categories'])}")
    print(f"   Max Products: {params['parameters']['maxProducts']}")
    print(f"   Min Margin: {params['parameters']['minMargin']}%")
    
    # Execute agent
    print("\n🚀 Initiating agent execution...")
    response = client.post(
        '/api/agents/product_research/execute',
        data=json.dumps(params),
        content_type='application/json'
    )
    
    if response.status_code != 200:
        print(f"❌ Execution failed: {response.status_code}")
        print(response.get_json())
        return False
    
    result = response.get_json()
    execution_id = result['executionId']
    
    print(f"✅ Agent execution started")
    print(f"   Execution ID: {execution_id}")
    print(f"   Agent: {result['agentId']}")
    print(f"   Status: {result['status']}")
    
    # Wait for completion with progress updates
    print("\n⏳ Waiting for agent to complete...")
    max_wait = 10
    for i in range(max_wait):
        time.sleep(1)
        
        response = client.get(f'/api/agents/executions/{execution_id}')
        if response.status_code != 200:
            print(f"❌ Status check failed: {response.status_code}")
            return False
        
        status = response.get_json()
        progress = status.get('progress', 0)
        
        # Show progress bar
        bar_length = 30
        filled = int(bar_length * progress / 100)
        bar = '█' * filled + '░' * (bar_length - filled)
        print(f"\r   Progress: [{bar}] {progress}%", end='', flush=True)
        
        if status['status'] == 'completed':
            print()  # New line after progress
            break
        elif status['status'] == 'failed':
            print(f"\n❌ Agent execution failed: {status.get('error', 'Unknown error')}")
            return False
    
    # Retrieve and display results
    print("\n\n📊 EXECUTION RESULTS")
    print("="*70)
    
    result_data = status.get('result', {})
    if not result_data.get('success'):
        print("❌ Agent execution was not successful")
        return False
    
    data = result_data.get('data', {})
    products = data.get('products', [])
    
    print(f"\n✅ Successfully found {len(products)} profitable products!")
    print(f"   Categories searched: {', '.join(data.get('categories', []))}")
    print(f"   Total discoveries: {result_data.get('discoveries_count', 0)}")
    
    if not products:
        print("\n⚠️  No products met the specified criteria")
        return True
    
    # Display top 5 products
    print("\n" + "="*70)
    print("🏆 TOP PRODUCT OPPORTUNITIES")
    print("="*70)
    
    for i, product in enumerate(products[:5], 1):
        print(format_product(product, i))
    
    # Display summary statistics
    print("\n" + "="*70)
    print("📈 SUMMARY STATISTICS")
    print("="*70)
    
    avg_margin = sum(p['margin_percent'] for p in products) / len(products)
    avg_score = sum(p['empire_score'] for p in products) / len(products)
    excellent_products = sum(1 for p in products if p['profit_potential'] == 'EXCELLENT')
    high_viability = sum(1 for p in products if p['market_viability'] == 'HIGH')
    
    print(f"\n   Average Margin:        {avg_margin:.1f}%")
    print(f"   Average Empire Score:  {avg_score:.2f}/100")
    print(f"   Excellent Profit:      {excellent_products}/{len(products)} products")
    print(f"   High Viability:        {high_viability}/{len(products)} products")
    
    # Category breakdown
    categories = {}
    for product in products:
        cat = product['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print(f"\n   Category Breakdown:")
    for cat, count in categories.items():
        print(f"      {cat}: {count} products")
    
    # Recommendations
    print("\n" + "="*70)
    print("💡 RECOMMENDATIONS")
    print("="*70)
    
    top_product = products[0]
    print(f"\n   🥇 Top Opportunity: {top_product['title']}")
    print(f"      - Empire Score: {top_product['empire_score']:.2f}/100")
    print(f"      - Profit Margin: {top_product['margin_percent']:.1f}%")
    print(f"      - Estimated Profit: ${top_product['margin']:.2f} per unit")
    print(f"      - Recommendation: Strong candidate for immediate listing")
    
    if excellent_products >= 3:
        print(f"\n   ✨ {excellent_products} products have EXCELLENT profit potential")
        print(f"      - Recommend adding top 3-5 to your store immediately")
    
    if avg_margin > 60:
        print(f"\n   💰 Average margin ({avg_margin:.1f}%) is excellent")
        print(f"      - Strong profit potential across the board")
    
    print("\n" + "="*70)
    print("✅ Product research completed successfully!")
    print("="*70)
    
    return True


if __name__ == "__main__":
    try:
        success = execute_product_research()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
