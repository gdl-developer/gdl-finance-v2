# GDL Fintech V2 Architecture

High-performance, gRPC-powered microservices architecture for modern banking.

## 🚀 Key Features

- **Fast**: Go-based services with gRPC for <2ms inter-service communication.
- **Secure**: Argon2 hashing, AES-256 PII encryption, and multi-factor PIN security.
- **Compliant**: Built to meet CBN Tiered KYC and GDPR/NDPR data privacy standards.
- **Scalable**: Stateless design ready for Kubernetes/Docker horizontal scaling.

## 🏗️ Services

- **API Gateway**: NestJS entry point with JWT validation and gRPC proxying.
- **Identity Service**: User management, Auth, RBAC, and PIN security.
- **Account Service**: Shadow ledger, NUBAN management, and CBA orchestration.
- **Transaction Service**: Internal/External transfers and CBN limit enforcement.

- <!-- Trigger PR -->
- 
- **Compliance Service**: BVN/NIN verification and AML checks.
- **BankOne/Symplus Connectors**: Low-latency Go sidecars for CBA integration.

## 🛠️ Setup Instructions

### Prerequisites

- Go 1.26+
- Node.js 18+
- PostgreSQL
- Kafka (Optional for event-driven ledger sync)

### Quick Start

1. **Clone the Repo**:

   ```bash
   git clone <repo-url>
   cd GDL-Fintech-V2
   ```

2. **Setup Protos**:
   Generate Go and TS code from the shared proto definitions.

   ```bash
   ./scripts/generate-protos.sh
   ```

3. **Environment Variables**:
   Copy `.env.example` in each service and fill in your DB and CBA credentials.

4. **Run Services**:
   ```bash
   # In separate terminals
   go run services/go/identity-service/main.go
   go run services/go/account-service/main.go
   npm run start --prefix services/typescript/api-gateway
   ```

## 🔒 Security & Compliance

- **Data Privacy**: All PII is encrypted at rest using AES-256-GCM.
- **Audit Logging**: Every sensitive action is logged with actor ID and IP.
- **Encryption**: TLS 1.3 for all internal and external communication.
