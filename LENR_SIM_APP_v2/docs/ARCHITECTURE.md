# LENR Simulation App - Architecture Documentation

**Version:** 0.2.1-beta  
**Last Updated:** January 2026

---

## System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        WordPress[WordPress Site<br/>conscious.energy]
    end

    subgraph "Frontend Layer - Cloudflare Pages"
        React[React Frontend<br/>Port 3000]
        Viz[3D Visualizations<br/>Three.js/WebGL]
        Controls[Parameter Controls<br/>MUI Components]
    end

    subgraph "CDN & Storage - Cloudflare"
        Pages[Cloudflare Pages<br/>Static Hosting]
        R2[Cloudflare R2<br/>Asset Storage]
        DNS[Cloudflare DNS<br/>conscious.energy]
    end

    subgraph "Backend Layer - Hostinger VPS"
        Traefik[Traefik<br/>Reverse Proxy<br/>:80/:443<br/>Auto-SSL]
        FastAPI[FastAPI Backend<br/>Port 8000<br/>x2 Replicas]
        Postgres[(PostgreSQL 16<br/>Persistent Volume)]
    end

    subgraph "Physics Engine Layer"
        Unified[Unified LENR Model<br/>Main Orchestrator]
        Bubble[Bubble Lattice<br/>Interaction]
        Hydrogen[Hydrogen Flux<br/>Model]
        Quantum[Quantum Effects<br/>Solver]
    end

    subgraph "Core Physics Layer"
        Constants[Core Constants<br/>CODATA 2018]
        Tunneling[WKB Tunneling]
        Screening[Electron Screening]
        Phonon[Phonon Interactions]
        Casimir[Casimir Forces]
        Reactions[Reaction Rates]
    end

    subgraph "Multi-Physics Coupling"
        Manager[Physics Domain<br/>Manager]
        Coupler[Domain Coupler]
        StateRepo[State Repository]
        Nuclear[Nuclear Domain]
        Thermal[Thermal Domain]
        EM[EM Domain]
        Mechanical[Mechanical Domain]
    end

    Browser -->|HTTPS| DNS
    WordPress -->|iframe| Pages
    DNS -->|Routes| Pages
    Pages --> React
    React --> Viz
    React --> Controls
    Pages --> R2
    
    DNS -->|api.conscious.energy| Traefik
    Traefik -->|Load Balance| FastAPI
    FastAPI --> Postgres
    
    FastAPI --> Unified
    Unified --> Bubble
    Unified --> Hydrogen
    Unified --> Quantum
    
    Bubble --> Constants
    Hydrogen --> Constants
    Quantum --> Constants
    Bubble --> Tunneling
    Bubble --> Screening
    Quantum --> Phonon
    Quantum --> Casimir
    Unified --> Reactions
    
    Unified --> Manager
    Manager --> Coupler
    Manager --> StateRepo
    Coupler --> Nuclear
    Coupler --> Thermal
    Coupler --> EM
    Coupler --> Mechanical
    StateRepo --> Nuclear
    StateRepo --> Thermal
    StateRepo --> EM
    StateRepo --> Mechanical

    style Browser fill:#e1f5ff
    style WordPress fill:#e1f5ff
    style React fill:#c8e6c9
    style Pages fill:#fff9c4
    style R2 fill:#fff9c4
    style DNS fill:#fff9c4
    style Traefik fill:#ffccbc
    style FastAPI fill:#ffccbc
    style Postgres fill:#ffccbc
    style Unified fill:#f3e5f5
    style Manager fill:#f3e5f5
    style Constants fill:#e8f5e9
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Internet"
        Users[Users]
        WordPress[WordPress Site]
    end

    subgraph "Cloudflare Services"
        CF_DNS[Cloudflare DNS<br/>conscious.energy]
        CF_Pages[Cloudflare Pages<br/>Frontend Hosting<br/>Free Tier]
        CF_R2[Cloudflare R2<br/>Asset Storage<br/>~$0.50/mo]
        CF_WAF[Cloudflare WAF<br/>Security Rules]
    end

    subgraph "Hostinger VPS - Ubuntu 24.04"
        subgraph "Docker Swarm Cluster"
            Traefik[Traefik<br/>Reverse Proxy<br/>Auto-SSL via Let's Encrypt]
            
            subgraph "Backend Services"
                API1[FastAPI Backend<br/>Replica 1]
                API2[FastAPI Backend<br/>Replica 2]
            end
            
            subgraph "Data Services"
                Postgres[(PostgreSQL 16<br/>Persistent Volume)]
            end
        end
        
        subgraph "System Services"
            UFW[UFW Firewall<br/>Ports 22, 80, 443]
            Fail2ban[Fail2ban<br/>SSH Protection]
            Cron[Backup Cron Job<br/>Daily 3 AM]
        end
    end

    Users -->|HTTPS| CF_DNS
    WordPress -->|iframe| CF_Pages
    CF_DNS -->|Routes| CF_Pages
    CF_DNS -->|api.conscious.energy| Traefik
    CF_Pages --> CF_R2
    
    CF_WAF -->|Filters| Traefik
    Traefik -->|Load Balance| API1
    Traefik -->|Load Balance| API2
    API1 -->|Connection| Postgres
    API2 -->|Connection| Postgres
    
    UFW -->|Protects| Traefik
    Fail2ban -->|Protects| UFW
    Cron -->|Backups| Postgres

    style Users fill:#e1f5ff
    style WordPress fill:#e1f5ff
    style CF_DNS fill:#fff9c4
    style CF_Pages fill:#fff9c4
    style CF_R2 fill:#fff9c4
    style CF_WAF fill:#fff9c4
    style Traefik fill:#ffccbc
    style API1 fill:#c8e6c9
    style API2 fill:#c8e6c9
    style Postgres fill:#ffccbc
    style UFW fill:#f3e5f5
    style Fail2ban fill:#f3e5f5
    style Cron fill:#f3e5f5
```

---

## Physics Module Architecture

```mermaid
graph TB
    subgraph "API Layer"
        PhysicsRouter[physics_simulation_router.py]
        UnifiedRouter[unified_simulation.py]
        BubbleRouter[bubble_simulation.py]
    end

    subgraph "Physics Engine Layer"
        UnifiedModel[unified_lenr_model.py<br/>Main Orchestrator]
        BubbleLattice[bubble_lattice_interaction.py]
        HydrogenFlux[hydrogen_flux_model.py]
        QuantumSolver[quantum_effects_solver.py]
    end

    subgraph "Core Physics Layer"
        CoreConstants[core_constants.py<br/>CODATA 2018 Constants]
        WKBTunneling[wkb_tunneling.py<br/>WKB Approximation]
        ElectronScreen[electron_screening.py<br/>Screening Models]
        PhononInter[phonon_interactions.py<br/>Phonon Effects]
        CasimirForces[casimir_forces.py<br/>Casimir Forces]
        ReactionRates[reaction_rates.py<br/>Fusion Rates]
        QuantumTunnel[quantum_tunneling.py<br/>Quantum Tunneling]
        BubbleCollapse[bubble_collapse.py<br/>Bubble Dynamics]
        RydbergMatter[rydberg_matter.py<br/>Rydberg Matter]
    end

    PhysicsRouter --> UnifiedModel
    UnifiedRouter --> UnifiedModel
    BubbleRouter --> BubbleLattice
    
    UnifiedModel --> BubbleLattice
    UnifiedModel --> HydrogenFlux
    UnifiedModel --> QuantumSolver
    
    BubbleLattice --> CoreConstants
    HydrogenFlux --> CoreConstants
    QuantumSolver --> CoreConstants
    
    BubbleLattice --> WKBTunneling
    BubbleLattice --> ElectronScreen
    BubbleLattice --> BubbleCollapse
    
    QuantumSolver --> PhononInter
    QuantumSolver --> CasimirForces
    QuantumSolver --> QuantumTunnel
    
    UnifiedModel --> ReactionRates
    UnifiedModel --> RydbergMatter

    style PhysicsRouter fill:#e3f2fd
    style UnifiedRouter fill:#e3f2fd
    style BubbleRouter fill:#e3f2fd
    style UnifiedModel fill:#c8e6c9
    style BubbleLattice fill:#c8e6c9
    style HydrogenFlux fill:#c8e6c9
    style QuantumSolver fill:#c8e6c9
    style CoreConstants fill:#fff9c4
    style WKBTunneling fill:#fff9c4
    style ElectronScreen fill:#fff9c4
    style PhononInter fill:#fff9c4
    style CasimirForces fill:#fff9c4
    style ReactionRates fill:#fff9c4
```

---

## Multi-Physics Coupling Architecture

```mermaid
graph TB
    subgraph "Coupling Framework"
        DomainManager[PhysicsDomainManager<br/>Coordinates Domains<br/>Time Stepping<br/>Synchronization]
        DomainInterface[DomainInterface<br/>Abstract Base Class<br/>Standardized Methods]
        DomainCoupler[DomainCoupler<br/>Data Exchange<br/>Interpolation<br/>Conservation]
        StateRepo[StateRepository<br/>Central Storage<br/>Caching<br/>Versioning]
    end

    subgraph "Physics Domains"
        Nuclear[Nuclear Domain<br/>Fusion Reactions<br/>Reaction Rates<br/>Energy Production]
        Thermal[Thermal Domain<br/>Heat Generation<br/>Temperature Transfer<br/>Conduction/Convection]
        EM[Electrodynamic Domain<br/>EM Fields<br/>Charge Dynamics<br/>Screening Effects]
        Mechanical[Mechanical Domain<br/>Stresses/Strains<br/>Material Deformation<br/>Structural Changes]
    end

    subgraph "Coupling Mechanisms"
        Explicit[Explicit Coupling<br/>Independent Advancement<br/>Small Time Steps]
        Implicit[Implicit Coupling<br/>Simultaneous Advancement<br/>Iterative Convergence]
        Adaptive[Adaptive Coupling<br/>Dynamic Switching<br/>Stability-Based]
    end

    DomainManager --> DomainInterface
    DomainManager --> DomainCoupler
    DomainManager --> StateRepo
    
    DomainInterface --> Nuclear
    DomainInterface --> Thermal
    DomainInterface --> EM
    DomainInterface --> Mechanical
    
    DomainCoupler -->|Exchanges Data| Nuclear
    DomainCoupler -->|Exchanges Data| Thermal
    DomainCoupler -->|Exchanges Data| EM
    DomainCoupler -->|Exchanges Data| Mechanical
    
    StateRepo -->|Stores State| Nuclear
    StateRepo -->|Stores State| Thermal
    StateRepo -->|Stores State| EM
    StateRepo -->|Stores State| Mechanical
    
    DomainCoupler --> Explicit
    DomainCoupler --> Implicit
    DomainCoupler --> Adaptive

    style DomainManager fill:#e3f2fd
    style DomainInterface fill:#e3f2fd
    style DomainCoupler fill:#c8e6c9
    style StateRepo fill:#c8e6c9
    style Nuclear fill:#fff9c4
    style Thermal fill:#fff9c4
    style EM fill:#fff9c4
    style Mechanical fill:#fff9c4
    style Explicit fill:#f3e5f5
    style Implicit fill:#f3e5f5
    style Adaptive fill:#f3e5f5
```

---

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User as User Browser
    participant CF as Cloudflare Pages
    participant API as FastAPI Backend
    participant Physics as Physics Engine
    participant DB as PostgreSQL
    participant Coupling as Multi-Physics Coupling

    User->>CF: Request Page
    CF->>User: Serve React App
    
    User->>API: POST /api/unified/simulate
    API->>Physics: Initialize Simulation
    Physics->>Coupling: Register Domains
    Coupling->>Physics: Domain Ready
    
    Physics->>Coupling: Advance Time Step
    Coupling->>Coupling: Exchange Data Between Domains
    Coupling->>Physics: Updated State
    
    Physics->>DB: Save Simulation State
    Physics->>API: Return Results
    API->>User: JSON Response
    
    User->>API: GET /api/simulation/{id}
    API->>DB: Query Simulation
    DB->>API: Return Data
    API->>User: Simulation Results
```

---

## Component Interaction Diagram

```mermaid
graph LR
    subgraph "Frontend Components"
        Dashboard[Dashboard]
        SimPage[Simulation Pages]
        VizPage[Visualization Pages]
        DocPage[Documentation]
    end

    subgraph "API Endpoints"
        Health[/api/health]
        Physics[/api/physics/*]
        Unified[/api/unified/*]
        Bubble[/api/bubble/*]
    end

    subgraph "Business Logic"
        SimService[Simulation Service]
        SharedService[Shared Simulation Service]
        PhysicsService[Physics Service]
    end

    subgraph "Data Layer"
        Models[SQLAlchemy Models]
        Migrations[Alembic Migrations]
    end

    Dashboard --> Health
    SimPage --> Physics
    SimPage --> Unified
    VizPage --> Bubble
    DocPage --> Health
    
    Health --> SimService
    Physics --> PhysicsService
    Unified --> SimService
    Bubble --> SimService
    
    SimService --> Models
    SharedService --> Models
    PhysicsService --> Models
    
    Models --> Migrations

    style Dashboard fill:#e3f2fd
    style SimPage fill:#e3f2fd
    style VizPage fill:#e3f2fd
    style DocPage fill:#e3f2fd
    style Health fill:#c8e6c9
    style Physics fill:#c8e6c9
    style Unified fill:#c8e6c9
    style Bubble fill:#c8e6c9
    style SimService fill:#fff9c4
    style SharedService fill:#fff9c4
    style PhysicsService fill:#fff9c4
    style Models fill:#ffccbc
    style Migrations fill:#ffccbc
```

---

## Request/Response Architecture

### Current Behavior: Synchronous Blocking

**⚠️ Important:** Most physics calculation endpoints are **synchronous and blocking**. The backend responses wait for physics simulations to complete before returning.

```mermaid
sequenceDiagram
    participant Client
    participant FastAPI as FastAPI Endpoint
    participant Physics as Physics Calculation
    participant EventLoop as Event Loop

    Client->>FastAPI: POST /api/physics/quantum-tunneling
    FastAPI->>Physics: calculate_tunneling_probability()
    Note over Physics: BLOCKS Event Loop<br/>(Synchronous CPU-bound)
    Physics-->>FastAPI: Result
    FastAPI-->>Client: JSON Response
    
    Note over EventLoop: Other requests wait<br/>during calculation
```

### Current Implementation Patterns

1. **Direct Synchronous Calls** (Most endpoints)
   - Physics calculations run directly in async functions
   - Blocks the FastAPI event loop during computation
   - Timeouts configured: 180-360 seconds
   - Example: `/api/physics/quantum-tunneling`

2. **Thread Pool Execution** (Some endpoints)
   - Uses `loop.run_in_executor(None, simulation.run)`
   - Offloads blocking work to thread pool
   - Example: `simulation_manager.py`

3. **WebSocket Streaming** (Real-time simulations)
   - Uses `asyncio.create_task` for background tasks
   - Streams updates via WebSocket
   - Example: `/api/websocket/simulate/{simulation_id}`

### Performance Implications

| Endpoint Type | Blocking Behavior | Timeout | Impact |
|--------------|------------------|---------|--------|
| Simple calculations | Blocks event loop | 180s | Low (fast calculations) |
| Complex enhancement | Blocks event loop | 360s | Medium (cached results) |
| Multi-physics | Blocks event loop | 300s | High (long calculations) |
| WebSocket simulations | Non-blocking | N/A | Low (streaming) |

### Recommendations for Improvement

1. **Use Thread Pool for All Blocking Calculations**
   ```python
   # Current (blocking)
   result = calc.calculate_tunneling_probability(...)
   
   # Recommended (non-blocking)
   loop = asyncio.get_event_loop()
   result = await loop.run_in_executor(
       None, 
       calc.calculate_tunneling_probability, 
       ...
   )
   ```

2. **Implement Background Task Pattern for Long Simulations**
   ```python
   @router.post("/simulate")
   async def create_simulation(
       request: SimulationRequest,
       background_tasks: BackgroundTasks
   ):
       simulation_id = generate_id()
       # Start simulation in background
       background_tasks.add_task(run_simulation, simulation_id, request)
       return {"simulation_id": simulation_id, "status": "started"}
   ```

3. **Add Progress Tracking for Long Operations**
   - Use WebSocket for real-time progress
   - Store intermediate results in database
   - Allow clients to poll for completion

4. **Consider Celery/Redis for Heavy Computations**
   - Offload to worker processes
   - Better scalability
   - Built-in retry and monitoring

---

## Architecture Comparison: Current vs. Proposed Queue-Based

### Current Architecture (Synchronous Blocking)

```mermaid
sequenceDiagram
    participant Frontend
    participant Backend as FastAPI Backend
    participant Physics as Physics Engine<br/>(Same Process)
    participant DB as PostgreSQL

    Frontend->>Backend: POST /api/physics/quantum-tunneling
    Note over Backend: Blocks for 10-300s
    Backend->>Physics: calculate_tunneling_probability()
    Note over Physics: Synchronous CPU-bound<br/>BLOCKS Event Loop
    Physics-->>Backend: Result
    Backend->>DB: Store Results (optional)
    Backend-->>Frontend: JSON Response (after completion)
    
    Note over Backend,Physics: All in same process<br/>Event loop blocked
```

**Characteristics:**
- ✅ Simple implementation
- ✅ Immediate results
- ❌ Blocks event loop
- ❌ No horizontal scaling
- ❌ Timeout risks (180-360s)
- ❌ Single point of failure

### Proposed Architecture (Queue-Based Async)

```mermaid
sequenceDiagram
    participant Frontend
    participant Backend as FastAPI Backend
    participant Redis as Redis Queue
    participant Simulator as Simulator Worker<br/>(Separate Process)
    participant DB as PostgreSQL

    Frontend->>Backend: POST /api/simulate
    Backend->>Redis: Enqueue Simulation Job
    Backend-->>Frontend: {"simulation_id": "abc123", "status": "queued"}<br/>(Returns immediately)
    
    Note over Redis: Job Queue
    Redis->>Simulator: Dequeue Job
    Note over Simulator: Runs in separate process<br/>Doesn't block FastAPI
    Simulator->>Simulator: Simulate 10s
    Simulator->>DB: Store Results
    Simulator->>Redis: Mark Complete
    
    Frontend->>Backend: GET /api/simulation/abc123/status
    Backend->>DB: Query Results
    Backend-->>Frontend: {"status": "completed", "results": {...}}
```

**Characteristics:**
- ✅ Non-blocking (immediate response)
- ✅ Horizontal scaling (multiple workers)
- ✅ Fault tolerance (retry failed jobs)
- ✅ Better resource utilization
- ❌ More complex setup
- ❌ Requires polling/WebSocket for status
- ❌ Additional infrastructure (Redis)

### Side-by-Side Comparison

| Aspect | Current (Synchronous) | Proposed (Queue-Based) |
|--------|----------------------|------------------------|
| **Response Time** | 10-300 seconds | <1 second (immediate) |
| **Event Loop** | Blocked during calculation | Never blocked |
| **Scalability** | Vertical only (more CPU) | Horizontal (more workers) |
| **Fault Tolerance** | Request fails if calculation fails | Jobs can retry automatically |
| **User Experience** | Long wait, timeout risk | Immediate feedback, progress tracking |
| **Infrastructure** | FastAPI + PostgreSQL | FastAPI + Redis + Workers + PostgreSQL |
| **Complexity** | Low | Medium-High |
| **Resource Usage** | Single process | Distributed across processes |
| **Monitoring** | Basic (timeouts) | Advanced (queue depth, worker status) |

### Migration Path

**Phase 1: Add Thread Pool (Minimal Change)**
```python
# Current blocking
result = calc.calculate_tunneling_probability(...)

# Phase 1: Non-blocking but still synchronous
loop = asyncio.get_event_loop()
result = await loop.run_in_executor(None, calc.calculate_tunneling_probability, ...)
```
- ✅ No infrastructure changes
- ✅ Prevents event loop blocking
- ❌ Still waits for completion
- ❌ No horizontal scaling

**Phase 2: Background Tasks (FastAPI Native)**
```python
@router.post("/simulate")
async def create_simulation(request: SimulationRequest, background_tasks: BackgroundTasks):
    simulation_id = generate_id()
    background_tasks.add_task(run_simulation, simulation_id, request)
    return {"simulation_id": simulation_id, "status": "started"}
```
- ✅ No new infrastructure
- ✅ Immediate response
- ❌ No persistence if server restarts
- ❌ Limited scalability

**Phase 3: Redis Queue (Full Async)**
```python
@router.post("/simulate")
async def create_simulation(request: SimulationRequest):
    simulation_id = generate_id()
    await redis_client.enqueue("simulations", {
        "simulation_id": simulation_id,
        "params": request.dict()
    })
    return {"simulation_id": simulation_id, "status": "queued"}
```
- ✅ Full async architecture
- ✅ Horizontal scaling
- ✅ Fault tolerance
- ❌ Requires Redis infrastructure
- ❌ More complex deployment

### Recommendation

For **v0.2.1-beta**, the current synchronous architecture is acceptable because:
- Most calculations are fast (<10s)
- Caching reduces repeated expensive calculations
- Two FastAPI replicas provide basic redundancy

**Consider migrating to queue-based architecture when:**
- Calculations regularly exceed 30 seconds
- You need to handle >10 concurrent simulations
- You want better fault tolerance
- You need progress tracking for long operations

---

## Infrastructure Evolution: Docker Swarm vs Kubernetes + Flux

### Current Architecture: Docker Swarm (v0.2.1-beta)

```mermaid
graph TB
    subgraph "Workstation"
        Terraform[Terraform<br/>IaC Provisioning]
        Ansible[Ansible<br/>Configuration Management]
    end

    subgraph "Cloudflare"
        DNS[Cloudflare DNS]
        Pages[Cloudflare Pages]
        R2[Cloudflare R2]
    end

    subgraph "Hostinger VPS - Single Node"
        Swarm[Docker Swarm<br/>Single Manager]
        Traefik[Traefik<br/>Reverse Proxy]
        Backend[FastAPI Backend<br/>x2 Replicas]
        Postgres[(PostgreSQL 16)]
    end

    Terraform -->|Provision| DNS
    Terraform -->|Provision| Pages
    Terraform -->|Provision| Swarm
    Ansible -->|Configure| Swarm
    Ansible -->|Deploy Stack| Traefik
    Traefik --> Backend
    Backend --> Postgres

    style Terraform fill:#e3f2fd
    style Ansible fill:#e3f2fd
    style Swarm fill:#c8e6c9
    style Traefik fill:#ffccbc
    style Backend fill:#fff9c4
    style Postgres fill:#ffccbc
```

**Current Setup:**
- **Cost:** ~$7.50/month (1 VPS @ $6.99 + Cloudflare)
- **Complexity:** Low-Medium
- **Scalability:** Vertical (add CPU/RAM to single node)
- **Deployment:** Ansible playbooks + Docker Swarm stack files
- **Orchestration:** Docker Swarm (built into Docker)

### Proposed Architecture: Kubernetes + Flux GitOps

```mermaid
graph TB
    subgraph "Workstation"
        Terraform2[Terraform<br/>IaC Provisioning]
        Ansible2[Ansible<br/>K8s Setup]
        Flux[Flux<br/>GitOps Controller]
    end

    subgraph "Cloudflare"
        DNS2[Cloudflare DNS]
        Pages2[Cloudflare Pages]
        R22[Cloudflare R2]
    end

    subgraph "Hostinger - Kubernetes Cluster"
        subgraph "Control Plane"
            K8sCP[Kubernetes Control Plane<br/>VPS 1]
        end
        subgraph "Worker Nodes"
            K8sNode1[Kubernetes Node 1<br/>VPS 2]
            K8sNode2[Kubernetes Node 2<br/>VPS 3]
        end
        subgraph "K8s Services"
            Ingress[Ingress Controller<br/>Traefik/Nginx]
            BackendK8s[FastAPI Backend<br/>Deployment]
            PostgresK8s[(PostgreSQL<br/>StatefulSet)]
        end
    end

    Terraform2 -->|Provision| DNS2
    Terraform2 -->|Provision| K8sCP
    Terraform2 -->|Provision| K8sNode1
    Terraform2 -->|Provision| K8sNode2
    Ansible2 -->|Setup K8s| K8sCP
    Ansible2 -->|Setup K8s| K8sNode1
    Ansible2 -->|Setup K8s| K8sNode2
    Flux -->|GitOps Deploy| K8sCP
    K8sCP -->|Orchestrate| K8sNode1
    K8sCP -->|Orchestrate| K8sNode2
    Ingress --> BackendK8s
    BackendK8s --> PostgresK8s

    style Terraform2 fill:#e3f2fd
    style Ansible2 fill:#e3f2fd
    style Flux fill:#f3e5f5
    style K8sCP fill:#c8e6c9
    style K8sNode1 fill:#fff9c4
    style K8sNode2 fill:#fff9c4
    style Ingress fill:#ffccbc
    style BackendK8s fill:#fff9c4
    style PostgresK8s fill:#ffccbc
```

**Proposed Setup:**
- **Cost:** ~$21/month (3 VPS @ $6.99 each + Cloudflare)
- **Complexity:** High
- **Scalability:** Horizontal (add more nodes)
- **Deployment:** GitOps (Flux watches Git repo, auto-deploys)
- **Orchestration:** Kubernetes (industry standard)

### Detailed Comparison

| Aspect | Docker Swarm (Current) | Kubernetes + Flux (Proposed) |
|--------|------------------------|------------------------------|
| **Monthly Cost** | ~$7.50 (1 VPS) | ~$21 (3 VPS) |
| **Setup Complexity** | Low-Medium | High |
| **Learning Curve** | Moderate | Steep |
| **Scalability** | Vertical only | Horizontal + Vertical |
| **High Availability** | Limited (single node) | Excellent (multi-node) |
| **Auto-scaling** | Manual | Built-in (HPA) |
| **Rolling Updates** | Yes (Docker Swarm) | Yes (Kubernetes) |
| **Self-healing** | Basic | Advanced |
| **GitOps** | Manual (Ansible) | Automatic (Flux) |
| **Resource Management** | Basic | Advanced (requests/limits) |
| **Service Discovery** | Built-in | Built-in (more powerful) |
| **Load Balancing** | Built-in | Built-in (more options) |
| **Storage** | Docker volumes | PersistentVolumes (more flexible) |
| **Networking** | Overlay network | CNI plugins (more options) |
| **Monitoring** | Basic | Rich ecosystem (Prometheus, Grafana) |
| **Deployment Speed** | Fast (simple stack) | Slower (more components) |
| **Maintenance Overhead** | Low | Medium-High |
| **Industry Adoption** | Declining | Dominant standard |

### When to Migrate to Kubernetes

**✅ Migrate if:**
- You need **high availability** (99.9%+ uptime)
- You're running **>10 concurrent simulations**
- You need **auto-scaling** based on load
- You want **GitOps** workflow (deploy on Git push)
- You plan to add **multiple applications/services**
- You need **advanced resource management**
- You want **industry-standard** orchestration
- You have **budget for 3x infrastructure cost**

**❌ Stay with Docker Swarm if:**
- Current setup meets your needs
- Budget is constrained (~$7.50/mo)
- Team lacks Kubernetes expertise
- You have **<5 concurrent users**
- You want **simpler operations**
- You prefer **lower maintenance overhead**
- You're in **early beta** (v0.2.1-beta)

### Migration Path (If Deciding to Migrate)

**Phase 1: Prepare (1-2 weeks)**
1. Set up Kubernetes cluster (3 VPS nodes)
2. Install Flux in cluster
3. Create Kubernetes manifests (Deployments, Services, Ingress)
4. Test deployment in staging

**Phase 2: Migrate (1 week)**
1. Set up Flux GitOps repository
2. Configure Flux to watch your Git repo
3. Migrate Docker Swarm stack to Kubernetes manifests
4. Test all services in K8s

**Phase 3: Cutover (1 day)**
1. DNS cutover to Kubernetes cluster
2. Monitor and verify
3. Decommission Docker Swarm

**Phase 4: Optimize (Ongoing)**
1. Configure HPA (Horizontal Pod Autoscaler)
2. Set up monitoring (Prometheus/Grafana)
3. Implement resource limits
4. Optimize for cost

### Cost-Benefit Analysis

**Current (Docker Swarm):**
- ✅ Low cost ($7.50/mo)
- ✅ Simple operations
- ✅ Fast deployment
- ❌ Limited scalability
- ❌ Single point of failure
- ❌ Manual scaling

**Proposed (Kubernetes + Flux):**
- ✅ High availability
- ✅ Auto-scaling
- ✅ GitOps workflow
- ✅ Industry standard
- ❌ 3x cost ($21/mo)
- ❌ Higher complexity
- ❌ Steeper learning curve

### Recommendation for v0.2.1-beta

**For now: Stay with Docker Swarm** because:
1. **Cost-effective** for beta phase
2. **Sufficient** for current scale
3. **Simpler** to maintain
4. **Adequate** for 2 replicas + load balancing

**Consider Kubernetes migration when:**
- You reach **production** (v1.0.0)
- You need **>99.9% uptime**
- You have **>50 concurrent users**
- Budget allows **$21+/month**
- Team has **Kubernetes expertise**

### Hybrid Approach (Recommended Migration Path)

**This is the recommended approach for gradual infrastructure evolution:**

```mermaid
graph TB
    subgraph Phase1 [Phase 1: Current - Docker Swarm Only]
        SwarmMain[Docker Swarm<br/>Main Application]
        BackendMain[FastAPI Backend]
        PostgresMain[(PostgreSQL)]
    end
    
    subgraph Phase2 [Phase 2: Hybrid - Add K8s for New Services]
        SwarmHybrid[Docker Swarm<br/>Main Application]
        K8sNew[Kubernetes Cluster<br/>New Services]
        BackendHybrid[FastAPI Backend]
        PostgresHybrid[(PostgreSQL)]
        Analytics[Analytics Service]
        QueueWorkers[Queue Workers]
        RedisQueue[(Redis Queue)]
    end
    
    subgraph Phase3 [Phase 3: Full K8s - Migrate Everything]
        K8sFull[Kubernetes Cluster<br/>All Services]
        BackendK8s[FastAPI Backend]
        PostgresK8s[(PostgreSQL)]
        AnalyticsK8s[Analytics Service]
        QueueK8s[Queue Workers]
    end
    
    Phase1 -->|Add K8s Cluster| Phase2
    Phase2 -->|Migrate Main App| Phase3
    
    style Phase1 fill:#c8e6c9
    style Phase2 fill:#fff9c4
    style Phase3 fill:#e3f2fd
```

**Hybrid Strategy Benefits:**

1. **Phase 1 (Current): Docker Swarm Only**
   - Main application on Docker Swarm
   - Cost: ~$7.50/month
   - Simple operations

2. **Phase 2 (Hybrid): Add Kubernetes for New Services**
   - **Keep Docker Swarm** for stable main application (FastAPI + PostgreSQL)
   - **Add Kubernetes cluster** (3 VPS nodes) for new services:
     - Analytics dashboard service
     - Queue workers (Redis + Celery)
     - Background job processors
     - Future microservices
   - **Use Flux GitOps** for Kubernetes services from day one
   - Cost: ~$28.50/month ($7.50 Swarm + $21 K8s)
   - Benefits:
     - ✅ Keep stable main app unchanged
     - ✅ Learn Kubernetes gradually
     - ✅ Test GitOps workflow on new services
     - ✅ Isolate risk (new services can fail without affecting main app)

3. **Phase 3 (Full K8s): Migrate Everything**
   - Migrate main application to Kubernetes
   - Decommission Docker Swarm
   - Cost: ~$21/month (3 VPS nodes)
   - Benefits:
     - ✅ Unified orchestration
     - ✅ Full GitOps workflow
     - ✅ Advanced features (HPA, auto-scaling)

**Hybrid Migration Timeline:**

| Phase | When | Cost | Complexity | Main App | New Services |
|-------|------|------|------------|----------|--------------|
| Phase 1 | v0.2.1-beta (Current) | $7.50/mo | Low | Docker Swarm | N/A |
| Phase 2 | v0.3.0-beta (Add analytics) | $28.50/mo | Medium | Docker Swarm | Kubernetes + Flux |
| Phase 3 | v1.0.0 (Production) | $21/mo | High | Kubernetes | Kubernetes |

**Why Hybrid is Recommended:**

- ✅ **Risk Mitigation**: New services can fail without affecting stable main app
- ✅ **Gradual Learning**: Team learns Kubernetes on non-critical services first
- ✅ **Cost Flexibility**: Can scale K8s services independently
- ✅ **GitOps Testing**: Validate Flux workflow before migrating critical services
- ✅ **Rollback Safety**: Easy to revert new services without touching main app
- ✅ **Incremental Migration**: Move services one at a time when ready

---

## Legend

- **Blue** - Client/User-facing components
- **Yellow** - Infrastructure/CDN services
- **Green** - Application services
- **Orange** - Data/Storage services
- **Purple** - System/Support services

---

**Document maintained by:** LENR Simulation Platform Development Team  
**Contact:** diadon@conscious.energy
