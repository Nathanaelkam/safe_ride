Project Context & Architecture Guidelines: "Seva" (Emergency Tracking System)
1. Project Description & Executive Summary
Seva is a real-time emergency tracking and response platform designed to ensure passenger safety during transit (e.g., taxi rides). Built with a React Native (Expo) mobile frontend and a Python FastAPI backend, the system allows users to broadcast their live location and trip status.

The core innovation of Seva is its proactive safety layer: as the mobile app streams live GPS coordinates, a background analytical engine constantly compares the vehicle's actual location against its expected safe route. If the vehicle deviates beyond a safe geographic threshold, or if the passenger triggers an SOS (either manually via a panic button or via a voice-activated command), the system instantly broadcasts critical alerts to the user's pre-approved emergency contacts.

The Academic Constraint (Crucial Context): This project is not a startup MVP; it is a strict academic submission for a Software Architecture exam with a tight 4-week deadline. Every technical decision must optimize for maximizing points on the grading rubric. The AI must prioritize demonstrating enterprise-grade patterns: Event-Driven Microservices, strict CI/CD automation (Jenkins), Infrastructure as Code (Ansible), and Container Orchestration (Docker/Kubernetes). Solutions that suggest "Monoliths" or third-party Backend-as-a-Service tools (like Firebase) will fail the exam and must be strictly avoided.

2. Global Architecture Pattern
The backend is a Modular Monorepo orchestrated as Independent Microservices.

Codebase: All backend Python code lives in a single repository to simplify CI/CD.

Execution: The application must NEVER run as a single monolith container.

Containerization: The repository uses specific Dockerfiles (e.g., Dockerfile.auth, Dockerfile.tracking) to build and deploy distinct, isolated containers for each microservice. One process per container.

Data Isolation: Strict Database-per-Service pattern. Microservices cannot share foreign keys across databases. They only store UUID string references.

3. Technology Stack
Frontend: React Native (managed by Expo).

Backend Framework: FastAPI (Python 3.10+).

Databases: PostgreSQL (Multiple logically isolated databases running in Docker: auth_db and tracking_db).

Event Bus / Message Queue: Redis (Streams & Pub/Sub). Chosen over Kafka for edge-node VPS resource efficiency.

Infrastructure as Code: Ansible (for VPS provisioning).

Container Orchestration: Docker (local) and Kubernetes / K3s (production).

CI/CD: Jenkins (Automated testing and deployment).

Observability: Prometheus and Grafana.

Testing: Pytest (Minimum 80% coverage enforced strictly).

4. Core Microservices Breakdown
A. Authentication & User Service
Container: Runs independently via Dockerfile.auth.

Database: Connects exclusively to auth_db.

Responsibilities:

User registration and authentication via phone numbers.

Managing the "Contact Handshake" (pending/accepted emergency contacts).

Exposing REST API endpoints for user management.

B. Trip & Tracking Service
Container: Runs independently via Dockerfile.tracking.

Database: Connects exclusively to tracking_db.

Responsibilities:

Starting and completing transit trips.

Maintaining active WebSocket connections for live GPS coordinate streaming from the mobile app.

Validating vehicle plate numbers (mock safety data).

Pushing live GPS coordinates to the Redis Event Bus.

C. Emergency Trigger Service (The Input Layer)
Container: Runs independently via Dockerfile.emergency.

Responsibilities:

Handles the intake of manual panic button presses from the mobile app.

Processes incoming voice-activated SOS triggers (e.g., parsing audio commands or receiving a speech-to-text payload from the mobile device).

Instantly publishes an SOS_TRIGGERED event to the Redis Event Bus.

D. Route Analysis Service (The Innovation Layer)
Execution: Runs as an independent worker container or background process subscribed to Redis.

Responsibilities:

Consumes live GPS coordinates from the Redis Stream.

Calculates the physical distance between the live location and the expected safe route using geospatial math (e.g., Haversine formula).

If a vehicle deviates beyond a safe threshold (e.g., 500 meters), it instantly publishes a ROUTE_DEVIATED event to the Redis Event Bus.

E. Notification Service (The Output Layer)
Container: Runs independently via Dockerfile.notification.

Execution: Independent subscriber service.

Responsibilities:

Listens to the Redis Event Bus for SOS_TRIGGERED (from the Emergency Service) or ROUTE_DEVIATED (from the Route Analysis Service) events.

Formats and broadcasts critical alerts to the passenger's verified emergency contacts (via SMS API, push notification, etc.).

5. The Event-Driven Pipeline (Pub/Sub)
Direct microservice-to-microservice synchronous calls must be minimized. System communication relies on Redis Streams and Pub/Sub to ensure loose coupling and high fault tolerance.

Producers: * The Tracking Service publishes location_updates.

The Emergency Service publishes SOS_TRIGGERED.

The Route Analysis Service publishes ROUTE_DEVIATED.

Consumers: * The Route Analysis Service consumes location_updates.

The Notification Service consumes SOS_TRIGGERED and ROUTE_DEVIATED.

Justification: If the Notification SMS provider crashes, the Tracking Service, Voice SOS triggers, and WebSocket connections must remain completely unaffected.

6. AI Agent Directives & Constraints
When generating code, architecture, or configurations for this project, the AI must strictly adhere to the following rules:

No Monolith Code: Do not write global routers that mix Auth, Tracking, and Emergency logic. Always utilize Dependency Injection and the Repository Pattern to maintain separation of concerns.

Testing First: Any new business logic or endpoint must include accompanying pytest fixtures and tests to maintain the >80% coverage requirement.

API Documentation: Utilize Pydantic models extensively to ensure FastAPI automatically generates robust Swagger/OpenAPI documentation.

Metrics: Assume all core services need to expose a /metrics endpoint for Prometheus scraping.

No Third-Party Backend-as-a-Service: Do not suggest replacing core architecture with services like Firebase or Supabase. The infrastructure must be locally containerized to satisfy Kubernetes deployment and Jenkins CI/CD grading rubrics.