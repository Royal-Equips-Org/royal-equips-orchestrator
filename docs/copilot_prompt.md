## Copilot Instructions: Royal Equips Empire

### Overview

You are tasked with transforming the **Royal Equips** Shopify store into a fully automated,
AI‑driven e‑commerce empire.  The overall mission is to build an orchestrated system of
interconnected agents that can autonomously manage product research, supplier management,
inventory and pricing, marketing automation, order fulfilment, analytics and customer
service with minimal human intervention.  The end goal is to achieve a self‑sustaining,
self‑improving business that generates €100K+ monthly revenue and scales across multiple
markets and brands.

### Existing Infrastructure

1. **Repository Structure** – The `royal‑equips‑orchestrator` repository already
   contains a core `Orchestrator` class and an `AgentBase` class.  The orchestrator
   registers agents and schedules their periodic execution【232259888045586†L21-L64】, while
   `AgentBase` defines `run()` and `health_check()` methods that each agent must
   implement【42107362201483†L24-L74】.  Use these as the foundation for all new agents.
2. **Support Services** – The system is designed to run as containerised services,
   with data stored in Supabase (PostgreSQL) and BigQuery, caching via Redis,
   and communication via WebSockets.  Deployments run on Render with Cloudflare for
   CDN/DDoS protection, and monitoring via Prometheus and Grafana【86286476718980†L8-L17】.
3. **Shopify Store** – The Shopify admin has been streamlined to keep only
   essential apps: AutoDS, Spocket, Flow, Mechanic, Fraud Control, DHL/Printful,
   Smart SEO, Translate & Adapt, and Loox.  Markets are limited to the Netherlands
   (default) and a combined European Union market【265018061116964†screenshot】【236556539311094†screenshot】.  The store’s
   theme needs to be optimized for luxury presentation, performance and SEO.

### Phase 1: MVP Foundation

1. **Repository Clean‑up and Setup**
   - Review the `CONTRIBUTING.md` and follow the commit guidelines.  Use
     feature branches off `develop` for each agent or theme component.
   - Extend the existing CI/CD workflows to include linting, unit tests (aim
     for 80%+ coverage), CodeQL scanning and Docker image builds.
2. **Theme Refactor**
   - Build a custom Online Store 2.0 theme based on Dawn/Refresh.  Include
     bespoke sections: hero banner with high‑resolution image or video and
     clear value proposition, a 3D product viewer using `<model-viewer>`, bundle
     upsell modules, sticky add‑to‑cart, and megamenu navigation.  Optimize
     performance with critical CSS, lazy loading and deferred JS.  Add
     JSON‑LD schema for products and breadcrumbs to boost SEO.
3. **Initial Agents**
   - **ProductResearchAgent** – Connect to AutoDS and Spocket APIs to discover
     trending products, compute potential margin and automatically create new
     products in Shopify via GraphQL.  Maintain a database table of candidate
     products for further analysis.
   - **InventoryPricingAgent** – Monitor inventory and cost data from
     suppliers, adjust retail prices based on demand signals and margin
     targets, and push updates to Shopify.  Use BigQuery for historical
     sales analysis and caching for frequently accessed data.
   - **MarketingAutomationAgent** – Integrate with Omnisend or Klaviyo to
     trigger welcome series, abandon‑cart campaigns, cross‑sell sequences and
     win‑back flows.  Generate segments based on customer behaviour and
     funnel stage.
   - **OrderFulfillmentAgent** – Evaluate orders for risk using Shopify’s
     risk scores and Fraud Control, then pass orders to AutoDS or Printful
     for fulfilment.  Send customers tracking information via email/SMS.
   - **AnalyticsAgent** – Aggregate sales, traffic and engagement metrics and
     write them to BigQuery.  Generate daily dashboards for the admin
     interface and monitor anomalies.
4. **Health Monitoring and Logging**
   - Each agent must implement `health_check()` that returns status,
     last‑run timestamp and any errors.  Register agents with the
     orchestrator and expose a unified `/api/health` endpoint for monitoring
     purposes【623214967122824†L146-L171】.
   - Configure Prometheus exporters to track run counts, execution time and
     failure rates.  Use Grafana dashboards and set up alerts.
5. **Security and Code Quality**
   - Implement authentication and authorization for all API routes.  Use
     HTTPS, encrypt sensitive data at rest and in transit, and integrate
     automatic vulnerability scans.
   - Adhere to PEP 8, type hints and proper documentation.  Provide unit
     tests for every function and maintain at least 80% coverage.

### Phase 2: Extended Agent Suite

1. **CustomerServiceAgent** – Use AI to classify and respond to incoming
   support messages.  Provide canned responses for FAQs, triage to human
   support when needed, and perform sentiment analysis.
2. **LoyaltyAgent** – Manage loyalty programmes, points accrual and redemption,
   and personalised offers.  Integrate with Shopify Plus loyalty APIs.
3. **SupplierManagementAgent** – Automate interactions with suppliers,
   including onboarding, performance scoring, price negotiations and quality
   monitoring.
4. **ContentCreationAgent** – Generate SEO‑optimised product descriptions,
   blog posts, social media captions and marketing emails.  Use AI to
   produce copy, optimize images and create video scripts.
5. **CompetitorAnalysisAgent** – Monitor competitors’ pricing, product
   catalogues and marketing strategies.  Perform review sentiment analysis
   and generate positioning reports.
6. **FraudDetectionAgent** – Evaluate orders in real time using machine
   learning models; track suspicious patterns, block or flag fraudulent
   transactions, and manage blacklists.

### Phase 3: Advanced Intelligence and Expansion

1. **PredictiveAnalyticsAgent** – Build ML models for sales forecasts,
   inventory demand, churn risk and customer lifetime value.  Feed
   predictions back into pricing, marketing and stocking strategies.
2. **FinancialManagementAgent** – Automate bookkeeping, profit/loss
   tracking, tax calculations, cash flow forecasting and ROI analysis per
   product and channel.
3. **QualityControlAgent** – Analyse product quality through review data,
   return rates and supplier performance.  Provide recommendations for
   improvement or product discontinuation.
4. **SEOOptimizationAgent** – Conduct keyword research, track search
   ranking, suggest technical SEO improvements and automate backlink
   outreach.  Manage local SEO for each active market.
5. **SocialMediaAgent** – Automate multi‑platform posting, manage
   engagement and influencer outreach, curate user‑generated content, and
   monitor brand sentiment across channels.

### Technical Standards and Innovation

1. **Scalability** – Design all agents and services to run horizontally;
   ensure database indexing, caching and concurrency patterns can handle
   high traffic and multiple brands.  Plan for multi‑region deployments.
2. **Security** – Use OAuth for integrations, encrypt secrets via
   environment variables, and perform regular audits and penetration tests.
3. **Monitoring** – Log to a central service; instrument code with
   metrics; set up alerting for performance degradation or errors.
4. **Emerging Technologies** – Explore blockchain for product
   authentication, AR/VR for immersive product views, IoT for smart
   inventory, edge computing for faster local response and advanced AI/ML
   algorithms for personalisation.

### Implementation Workflow

1. **Agent Development** – For each new agent:
   - Create a new module under `agents/` with a class inheriting
     `AgentBase`.  Implement `run()` and `health_check()` methods.
   - Include unit tests under `tests/agents/` with fixtures and mocks.
   - Register the agent in the orchestrator by adding a call to
     `self.register_agent()` with the desired interval in seconds.
   - Add configuration options to the repository’s `.env.example` for API
     keys, intervals and thresholds.
2. **Theme Features** – Develop custom Liquid sections in a separate
   `theme_src/` folder, then compile using Shopify CLI and commit the
     resulting `dist/` assets.  Use JSON templates for flexible layout.
3. **CI/CD Integration** – Update `.github/workflows/` to run linting,
   testing and builds on every PR.  Use concurrency locks to prevent
   overlapping deployments.  Set up scheduled jobs (e.g., nightly
   analytics refresh, weekly code scans).
4. **Documentation** – Maintain an `ARCHITECTURE.md` and agent-specific
   READMEs that describe responsibilities, dependencies and how to run
   them locally.  Document API endpoints and data models.
5. **Iteration and Feedback** – Start with a minimum viable product for
   each agent, deploy to staging, gather metrics, refine algorithms and
   iterate.  Record improvements in ADRs and update the backlog.

### Final Goal

Build a self‑sustaining, autonomous commerce platform where over 50 agents
collaborate to manage every aspect of an e‑commerce business.  The system
should require less than 5 % human intervention, and serve as a blueprint
for offering white‑label automation solutions to other merchants in the
future.
