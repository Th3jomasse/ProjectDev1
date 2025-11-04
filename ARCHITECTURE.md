# Architecture Technique du Système POS

## 📐 Vue d'Ensemble de l'Architecture

### Architecture Microservices Event-Driven

Notre système POS utilise une architecture microservices avec communication event-driven pour garantir la scalabilité, la résilience et la maintenabilité.

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
├─────────────┬─────────────┬─────────────┬────────────┬─────────┤
│  POS Client │  Dashboard  │ Mobile App  │  KDS       │ Kiosk   │
│  (Electron) │  (Web)      │  (RN)       │  (Web)     │ (Web)   │
└──────┬──────┴──────┬──────┴──────┬──────┴─────┬──────┴────┬────┘
       │             │             │            │           │
       └─────────────┴─────────────┴────────────┴───────────┘
                              │
                    ┌─────────▼─────────┐
                    │   API Gateway     │
                    │   (Kong/NGINX)    │
                    │   + Auth Service  │
                    └─────────┬─────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
┌──────▼──────┐      ┌────────▼────────┐    ┌───────▼────────┐
│   GraphQL   │      │   REST APIs     │    │   WebSocket    │
│   Gateway   │      │                 │    │   Server       │
└──────┬──────┘      └────────┬────────┘    └───────┬────────┘
       │                      │                     │
       └──────────────────────┼─────────────────────┘
                              │
              ┌───────────────┴────────────────┐
              │      Message Broker            │
              │      (RabbitMQ/Kafka)          │
              └───────────────┬────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
┌───▼────────┐    ┌──────────▼──────────┐    ┌────────▼─────┐
│   Core     │    │    Business         │    │   Support    │
│  Services  │    │    Modules          │    │   Services   │
└────────────┘    └─────────────────────┘    └──────────────┘
```

---

## 🎯 Services Principaux

### 1. API Gateway & Authentication

#### Responsabilités
- Routage des requêtes
- Load balancing
- Rate limiting
- Authentication JWT
- Authorization (RBAC)
- Request/Response transformation
- SSL termination

#### Technologies
- **Kong** ou **NGINX** avec modules Lua
- **Redis** pour sessions et rate limiting
- **Auth0** ou implémentation custom JWT

#### Endpoints Principaux
```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
POST   /auth/register
```

---

### 2. Core Services

#### 2.1 Order Service

**Responsabilités**
- Gestion du cycle de vie des commandes
- Gestion des tables et plans de salle
- Split bills
- Modifications de commandes
- Historique

**Base de données** : PostgreSQL

**Schema Principal**
```sql
orders
- id (UUID)
- restaurant_id
- table_id
- order_number
- status (pending, confirmed, preparing, ready, delivered, paid, cancelled)
- type (dine_in, takeout, delivery)
- subtotal
- tax
- total
- created_by (employee_id)
- created_at
- updated_at

order_items
- id (UUID)
- order_id
- product_id
- quantity
- unit_price
- modifications (JSONB)
- notes
- status
- sent_to_kitchen_at

tables
- id (UUID)
- restaurant_id
- table_number
- capacity
- section
- position_x
- position_y
- status (available, occupied, reserved, dirty)
```

**Events Published**
```
order.created
order.updated
order.item.added
order.item.modified
order.confirmed
order.paid
order.cancelled
```

**APIs**
```graphql
type Order {
  id: ID!
  orderNumber: String!
  table: Table
  items: [OrderItem!]!
  status: OrderStatus!
  subtotal: Float!
  tax: Float!
  total: Float!
  createdAt: DateTime!
  createdBy: Employee!
}

type Mutation {
  createOrder(input: CreateOrderInput!): Order!
  addItemToOrder(orderId: ID!, item: OrderItemInput!): Order!
  updateOrderItem(id: ID!, updates: OrderItemUpdateInput!): OrderItem!
  confirmOrder(orderId: ID!): Order!
  cancelOrder(orderId: ID!, reason: String): Order!
}

type Query {
  order(id: ID!): Order
  orders(filters: OrderFilters): [Order!]!
  activeOrders: [Order!]!
}
```

---

#### 2.2 Payment Service

**Responsabilités**
- Traitement des paiements
- Intégration avec processeurs (Stripe, Square)
- Split payments
- Remboursements
- Génération de reçus
- Conformité PCI-DSS

**Base de données** : PostgreSQL + Vault (pour tokens sensibles)

**Schema Principal**
```sql
payments
- id (UUID)
- order_id
- amount
- currency
- method (cash, card, mobile, other)
- status (pending, processing, completed, failed, refunded)
- processor (stripe, square)
- processor_payment_id
- metadata (JSONB)
- created_at
- completed_at

payment_splits
- id (UUID)
- payment_id
- amount
- method
- status

refunds
- id (UUID)
- payment_id
- amount
- reason
- status
- created_by
- created_at
```

**Events Published**
```
payment.initiated
payment.completed
payment.failed
payment.refunded
```

**APIs**
```typescript
interface PaymentService {
  processPayment(params: ProcessPaymentParams): Promise<Payment>
  refundPayment(paymentId: string, amount: number): Promise<Refund>
  splitPayment(orderId: string, splits: PaymentSplit[]): Promise<Payment[]>
  getPaymentMethods(restaurantId: string): Promise<PaymentMethod[]>
}
```

---

#### 2.3 Product Service

**Responsabilités**
- Catalogue de produits
- Gestion des menus
- Catégories
- Modificateurs
- Disponibilité
- Prix et variations

**Base de données** : PostgreSQL

**Schema Principal**
```sql
products
- id (UUID)
- restaurant_id
- name
- description
- category_id
- base_price
- cost_price
- image_url
- is_available
- preparation_time (minutes)
- tags (ARRAY)
- allergens (ARRAY)
- created_at
- updated_at

categories
- id (UUID)
- restaurant_id
- name
- parent_id (pour sous-catégories)
- display_order
- is_active

modifiers
- id (UUID)
- name
- type (single, multiple)
- required
- min_selections
- max_selections

modifier_options
- id (UUID)
- modifier_id
- name
- price_adjustment
- is_default

product_modifiers
- product_id
- modifier_id

menus
- id (UUID)
- restaurant_id
- name
- type (breakfast, lunch, dinner, allday)
- active_days (ARRAY)
- active_hours_start
- active_hours_end

menu_products
- menu_id
- product_id
- price_override
- display_order
```

**Events Published**
```
product.created
product.updated
product.availability.changed
menu.activated
menu.deactivated
```

---

#### 2.4 Customer Service

**Responsabilités**
- Profils clients
- Programme de fidélité
- Historique de commandes
- Préférences

**Base de données** : PostgreSQL

**Schema Principal**
```sql
customers
- id (UUID)
- restaurant_id
- first_name
- last_name
- email
- phone
- date_of_birth
- loyalty_points
- total_spent
- visit_count
- last_visit_at
- preferences (JSONB)
- created_at

loyalty_transactions
- id (UUID)
- customer_id
- points_change
- reason
- order_id
- created_at

customer_preferences
- customer_id
- dietary_restrictions (ARRAY)
- favorite_products (ARRAY)
- allergies (ARRAY)
```

---

### 3. Business Modules

#### 3.1 Employee Management Service

**Responsabilités**
- Gestion des employés
- Rôles et permissions
- Profils et documents

**Base de données** : PostgreSQL

**Schema Principal**
```sql
employees
- id (UUID)
- restaurant_id
- first_name
- last_name
- email
- phone
- role_id
- employment_type (full_time, part_time, contract)
- hourly_rate
- hire_date
- status (active, inactive, terminated)
- pin_code (hashed)
- created_at

roles
- id (UUID)
- name
- permissions (JSONB)
- level (1-10)

employee_documents
- id (UUID)
- employee_id
- type (contract, certification, id)
- file_url
- expiry_date
- uploaded_at
```

**Permissions (RBAC)**
```json
{
  "permissions": {
    "orders": ["create", "read", "update", "delete"],
    "payments": ["process", "refund"],
    "products": ["read", "update"],
    "reports": ["view_own", "view_all"],
    "employees": ["read", "create", "update"],
    "settings": ["read", "update"]
  }
}
```

---

#### 3.2 Schedule Service

**Responsabilités**
- Planification des horaires
- Gestion des shifts
- Disponibilités
- Demandes de congés

**Base de données** : PostgreSQL

**Schema Principal**
```sql
schedules
- id (UUID)
- restaurant_id
- week_start_date
- status (draft, published, archived)
- created_by
- created_at
- published_at

shifts
- id (UUID)
- schedule_id
- employee_id
- date
- start_time
- end_time
- role
- break_minutes
- notes
- status (scheduled, confirmed, completed, cancelled)

employee_availability
- id (UUID)
- employee_id
- day_of_week (0-6)
- start_time
- end_time
- is_available

time_off_requests
- id (UUID)
- employee_id
- start_date
- end_date
- reason
- status (pending, approved, denied)
- reviewed_by
- reviewed_at
```

---

#### 3.3 Timesheet Service

**Responsabilités**
- Clock in/out
- Suivi des heures
- Pauses
- Calculs de paie

**Base de données** : PostgreSQL

**Schema Principal**
```sql
timesheets
- id (UUID)
- employee_id
- date
- clock_in
- clock_out
- break_start
- break_end
- total_hours
- overtime_hours
- status (draft, submitted, approved)
- approved_by
- approved_at

clock_events
- id (UUID)
- employee_id
- event_type (clock_in, clock_out, break_start, break_end)
- timestamp
- location (optional GPS)
- terminal_id
```

---

#### 3.4 Inventory Service

**Responsabilités**
- Gestion du stock
- Mouvements d'inventaire
- Alertes de stock bas
- Valorisation

**Base de données** : PostgreSQL

**Schema Principal**
```sql
inventory_items
- id (UUID)
- restaurant_id
- name
- sku
- category
- unit_of_measure
- current_quantity
- min_quantity
- max_quantity
- reorder_point
- unit_cost
- last_restocked_at

inventory_movements
- id (UUID)
- item_id
- movement_type (purchase, sale, waste, adjustment)
- quantity_change
- unit_cost
- reason
- reference_id (order_id, purchase_order_id)
- created_by
- created_at

stock_alerts
- id (UUID)
- item_id
- alert_type (low_stock, out_of_stock, expiring_soon)
- threshold
- status (active, acknowledged, resolved)
- created_at
```

---

#### 3.5 Recipe Management Service

**Responsabilités**
- Recettes et ingrédients
- Calcul des coûts
- Marges
- Déduction automatique du stock

**Base de données** : PostgreSQL

**Schema Principal**
```sql
recipes
- id (UUID)
- product_id
- name
- version
- yield_quantity
- yield_unit
- preparation_time
- cooking_time
- instructions (TEXT)
- created_at

recipe_ingredients
- id (UUID)
- recipe_id
- inventory_item_id
- quantity
- unit
- preparation_note

recipe_costs
- recipe_id
- calculated_at
- total_cost
- cost_per_serving
- ingredient_breakdown (JSONB)
```

**Calcul automatique**
```typescript
interface CostCalculation {
  ingredientCost: number
  laborCost: number
  overheadCost: number
  totalCost: number
  sellingPrice: number
  margin: number
  marginPercent: number
}
```

---

#### 3.6 Supplier & Purchase Order Service

**Responsabilités**
- Gestion des fournisseurs
- Bons de commande
- Réception de marchandises
- Historique des prix

**Base de données** : PostgreSQL

**Schema Principal**
```sql
suppliers
- id (UUID)
- name
- contact_name
- email
- phone
- address (JSONB)
- payment_terms
- lead_time_days
- min_order_amount
- is_active

supplier_products
- id (UUID)
- supplier_id
- inventory_item_id
- supplier_sku
- unit_price
- unit_of_measure
- last_price_update

purchase_orders
- id (UUID)
- restaurant_id
- supplier_id
- po_number
- order_date
- expected_delivery_date
- status (draft, sent, confirmed, partial, received, cancelled)
- subtotal
- tax
- shipping
- total
- created_by

purchase_order_items
- id (UUID)
- po_id
- inventory_item_id
- quantity_ordered
- quantity_received
- unit_price
- total

goods_receipts
- id (UUID)
- po_id
- received_date
- received_by
- notes
- invoice_number
- invoice_amount
```

---

### 4. AI Services

#### 4.1 Demand Forecasting Service

**Responsabilités**
- Prédiction de l'achalandage
- Analyse des tendances
- Facteurs externes (météo, événements)

**Technologies**
- **Python** avec FastAPI
- **TensorFlow/PyTorch** pour ML
- **Pandas** pour data processing
- **PostgreSQL** pour données historiques
- **TimescaleDB** pour time-series

**Modèle ML**
```python
Features:
- Historique de ventes (1-2 ans)
- Jour de la semaine
- Heure
- Mois / Saison
- Jours fériés
- Événements locaux
- Météo (température, précipitations)
- Promotions actives
- Tendances YoY

Target:
- Nombre de clients prévu
- Volume de ventes prévu
- Items populaires prévus
```

**APIs**
```python
@app.post("/forecast/daily")
async def forecast_daily(
    restaurant_id: str,
    date: datetime,
    confidence_level: float = 0.95
) -> DailyForecast:
    """Prédiction pour une journée"""
    pass

@app.post("/forecast/hourly")
async def forecast_hourly(
    restaurant_id: str,
    date: datetime
) -> List[HourlyForecast]:
    """Prédictions horaires pour une journée"""
    pass
```

---

#### 4.2 Smart Ordering Service

**Responsabilités**
- Suggestions de commandes fournisseurs
- Optimisation des quantités
- Minimisation du gaspillage
- Optimisation des coûts

**Algorithme**
```python
def calculate_optimal_order(
    item: InventoryItem,
    forecast: DemandForecast,
    current_stock: float,
    lead_time: int,
    shelf_life: int
) -> OrderSuggestion:
    """
    Calcule la quantité optimale à commander

    Facteurs:
    - Demande prévue
    - Stock actuel
    - Délai de livraison
    - Durée de conservation
    - Prix unitaires et remises volume
    - Coût de stockage
    - Coût de rupture de stock
    """
    pass
```

---

#### 4.3 Staff Optimization Service

**Responsabilités**
- Recommandations de staffing
- Optimisation des coûts de main-d'œuvre
- Analyse de performance

**Algorithme**
```python
def optimize_staffing(
    forecast: DemandForecast,
    available_staff: List[Employee],
    labor_budget: float,
    service_level_target: float
) -> StaffingPlan:
    """
    Optimise la composition de l'équipe

    Contraintes:
    - Budget de main-d'œuvre
    - Niveau de service cible
    - Disponibilités des employés
    - Compétences requises
    - Règles de main-d'œuvre (breaks, max hours)
    """
    pass
```

---

#### 4.4 Menu Analytics Service

**Responsabilités**
- Analyse de rentabilité
- Engineering du menu
- Suggestions de prix
- Détection d'items sous-performants

**Analyse**
```python
class MenuEngineering:
    """
    Matrix 2x2:
    - Popularité (high/low)
    - Rentabilité (high/low)

    Catégories:
    - Stars: High popularity, High profit
    - Plowhorses: High popularity, Low profit
    - Puzzles: Low popularity, High profit
    - Dogs: Low popularity, Low profit
    """

    def categorize_items(
        self,
        sales_data: DataFrame,
        cost_data: DataFrame
    ) -> MenuAnalysis:
        pass

    def suggest_pricing(
        self,
        item: Product,
        target_margin: float
    ) -> PricingSuggestion:
        pass
```

---

### 5. Support Services

#### 5.1 Notification Service

**Responsabilités**
- Push notifications
- SMS
- Emails
- In-app notifications

**Technologies**
- **Firebase Cloud Messaging** (mobile push)
- **Twilio** (SMS)
- **SendGrid** (email)
- **WebSocket** (in-app)

**Event Handlers**
```typescript
// Écoute les events et envoie notifications
eventBus.on('order.created', async (order) => {
  await notificationService.send({
    to: order.server,
    type: 'NEW_ORDER',
    channel: 'push',
    data: { orderId: order.id }
  })
})

eventBus.on('inventory.low_stock', async (alert) => {
  await notificationService.send({
    to: managers,
    type: 'LOW_STOCK_ALERT',
    channel: 'email',
    data: { item: alert.item }
  })
})
```

---

#### 5.2 Reporting Service

**Responsabilités**
- Génération de rapports
- Exports (PDF, Excel)
- Rapports programmés
- Dashboards temps réel

**Technologies**
- **TimescaleDB** pour time-series data
- **Metabase** ou custom dashboards
- **Puppeteer** pour PDF generation
- **ExcelJS** pour Excel exports

**Rapports Standards**
```typescript
interface ReportService {
  // Financiers
  dailySalesReport(date: Date): Promise<Report>
  weeklySalesReport(weekStart: Date): Promise<Report>
  monthlySalesReport(month: string): Promise<Report>

  // Opérationnels
  menuPerformanceReport(period: Period): Promise<Report>
  employeePerformanceReport(employeeId: string): Promise<Report>
  inventoryValuationReport(): Promise<Report>

  // Custom
  customReport(query: ReportQuery): Promise<Report>
}
```

---

#### 5.3 Audit & Logging Service

**Responsabilités**
- Logs d'audit
- Traçabilité
- Forensics
- Compliance

**Technologies**
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Loki** alternative légère

**Logs Tracked**
```typescript
interface AuditLog {
  id: string
  timestamp: Date
  actor: {
    type: 'user' | 'system' | 'api'
    id: string
    ip: string
  }
  action: string
  resource: {
    type: string
    id: string
  }
  changes?: {
    before: object
    after: object
  }
  metadata: object
}

// Exemples d'events loggés
- User login/logout
- Payment transactions
- Order modifications
- Refunds
- Price changes
- Employee changes
- Permission changes
- Data exports
```

---

## 🔄 Communication Inter-Services

### Event-Driven Architecture

**Message Broker** : RabbitMQ ou Apache Kafka

**Pattern** : Event Sourcing + CQRS (pour certains services)

**Exemple de Flow**
```
1. User crée une commande via POS Client
2. Order Service reçoit la requête
3. Order Service persiste la commande
4. Order Service publie event "order.created"
5. Multiple services réagissent:
   - Inventory Service: Décrémente stock (si recipe exists)
   - Notification Service: Notifie la cuisine
   - Analytics Service: Update metrics
   - Customer Service: Update customer history
```

**Event Schema**
```typescript
interface DomainEvent {
  id: string
  type: string
  aggregateId: string
  aggregateType: string
  version: number
  timestamp: Date
  actor: {
    id: string
    type: string
  }
  payload: object
  metadata: {
    correlationId: string
    causationId?: string
    traceId: string
  }
}
```

---

## 💾 Stratégie de Données

### Databases par Service

Chaque service a sa propre base de données (Database per Service pattern)

```
Order Service      → PostgreSQL (orders_db)
Payment Service    → PostgreSQL (payments_db) + Vault
Product Service    → PostgreSQL (products_db)
Employee Service   → PostgreSQL (employees_db)
Inventory Service  → PostgreSQL (inventory_db)
Analytics Service  → TimescaleDB (analytics_db)
```

### Caching Strategy

```
L1: Application Cache (in-memory)
  - Product catalog
  - Menu configurations
  - User sessions

L2: Redis Cache
  - Frequently accessed data
  - Rate limiting counters
  - Real-time metrics
  - Session store

L3: CDN (Cloudflare)
  - Static assets
  - Images
  - Frontend bundles
```

### Backup Strategy

```
Production Databases:
  - Continuous WAL archiving
  - Daily full backups (retained 30 days)
  - Hourly incremental backups (retained 7 days)
  - Point-in-time recovery capability
  - Cross-region replication

Event Store:
  - Append-only, never delete
  - Backup to S3/GCS
  - Retained indefinitely (compliance)
```

---

## 🔐 Sécurité en Profondeur

### Layers de Sécurité

```
1. Network Layer
   - VPC isolation
   - Security groups
   - WAF (Web Application Firewall)

2. Application Layer
   - Input validation
   - CSRF protection
   - XSS prevention
   - SQL injection prevention (ORM)

3. Authentication Layer
   - JWT tokens (short-lived)
   - Refresh tokens (secure storage)
   - MFA pour admins
   - Password policies

4. Authorization Layer
   - RBAC (Role-Based Access Control)
   - Resource-level permissions
   - API key management

5. Data Layer
   - Encryption at rest (AES-256)
   - Encryption in transit (TLS 1.3)
   - PCI-DSS compliance
   - PII data masking
```

### Secrets Management

```
Development: .env files (not committed)
Staging/Production: HashiCorp Vault ou AWS Secrets Manager

Secrets rotés:
- Database passwords: 90 days
- API keys: 180 days
- JWT signing keys: 365 days
```

---

## 📈 Monitoring & Observability

### Three Pillars

#### 1. Metrics (Prometheus + Grafana)
```
System Metrics:
- CPU, Memory, Disk usage
- Network I/O
- Database connections

Application Metrics:
- Request rate
- Error rate
- Response time (P50, P95, P99)
- Active orders
- Transactions/second

Business Metrics:
- Revenue (real-time)
- Orders/hour
- Average ticket
- Menu item popularity
```

#### 2. Logs (ELK Stack)
```
Structured logging (JSON):
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "service": "order-service",
  "traceId": "abc123",
  "message": "Order created",
  "context": {
    "orderId": "ord_123",
    "restaurantId": "res_456",
    "total": 45.99
  }
}
```

#### 3. Traces (Jaeger ou Zipkin)
```
Distributed tracing pour suivre requêtes à travers services
- Latency analysis
- Dependency mapping
- Bottleneck detection
```

### Alerting

```yaml
Alerts:
  Critical (PagerDuty):
    - Service down
    - Database connection failures
    - Payment processing errors
    - Error rate > 5%

  Warning (Slack):
    - High response time (>1s)
    - Low stock alerts
    - Unusual traffic patterns

  Info (Email):
    - Daily summary
    - Weekly reports
```

---

## 🚀 Deployment Strategy

### Environments

```
1. Development
   - Local Docker Compose
   - Mock external services
   - Hot reload enabled

2. Staging
   - Kubernetes cluster
   - Mirrors production
   - Integration tests
   - Performance tests

3. Production
   - Kubernetes (multi-zone)
   - Auto-scaling enabled
   - Blue-green deployments
   - Canary releases for critical services
```

### CI/CD Pipeline

```yaml
Pipeline:
  1. Code Push
  2. Linting & Type checking
  3. Unit Tests
  4. Build Docker images
  5. Integration Tests
  6. Security scanning (Snyk, Trivy)
  7. Deploy to Staging
  8. E2E Tests
  9. Manual approval
  10. Deploy to Production (rolling update)
  11. Smoke tests
  12. Monitor metrics
```

### Zero-Downtime Deployments

```
Strategy: Rolling updates avec health checks

1. Deploy new version (v2) alongside old (v1)
2. Wait for v2 health checks to pass
3. Gradually route traffic to v2 (10%, 25%, 50%, 100%)
4. Monitor error rates at each stage
5. Auto-rollback si error rate > threshold
6. Terminate v1 pods after successful migration
```

---

## 🔄 Data Synchronization

### Offline-First POS Clients

```typescript
class SyncEngine {
  // Queue operations while offline
  private pendingQueue: Operation[] = []

  // Sync when connection restored
  async sync() {
    const conflicts = await this.detectConflicts()
    const resolved = await this.resolveConflicts(conflicts)
    await this.applyRemoteChanges()
    await this.pushLocalChanges()
  }

  // Conflict resolution strategies
  private resolveConflicts(conflicts: Conflict[]) {
    // Last-write-wins for most entities
    // Custom logic for critical entities (e.g., inventory)
    // Manual resolution for complex conflicts
  }
}
```

### Multi-Terminal Consistency

```
Real-time sync via WebSocket:
- Order updates
- Table status changes
- Inventory changes
- Menu availability

Eventually consistent:
- Reports and analytics
- Historical data
```

---

## 📱 Mobile & Offline Strategy

### Progressive Web App (PWA)

```typescript
// Service Worker pour offline functionality
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})

// Cache strategy
Cache-First: Static assets, product images
Network-First: Dynamic data (orders, inventory)
Stale-While-Revalidate: Menu data, prices
```

---

## ✅ Conclusion Architecture

Cette architecture fournit:
- **Scalabilité** : Microservices indépendants scalables horizontalement
- **Résilience** : Isolation des pannes, circuit breakers, retries
- **Performance** : Caching multi-niveaux, async processing
- **Sécurité** : Defense in depth, compliance PCI-DSS
- **Maintenabilité** : Services découplés, code clean, documentation
- **Observabilité** : Metrics, logs, traces complètes

**Prêt pour production à grande échelle** : 1000+ restaurants, 10K+ terminaux POS
