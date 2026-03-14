# Multi-Service Application with Observability

This project consists of a UI service, two API services, two PostgreSQL databases, and a full observability stack (traces, metrics, logs) orchestrated with Docker Compose.

## Services

- **Service 1**: Python Flask API on port 5001 (connects to postgres1, calls Service 2)
- **Service 2**: Python Flask API on port 5002 (connects to postgres2)
- **Service 3**: Node.js UI on port 3000 (serves web interface, calls Service 1)
- **PostgreSQL 1**: Database for Service 1 on port 5432
- **PostgreSQL 2**: Database for Service 2 on port 5433

## Observability Stack

- **OpenTelemetry Collector**: Receives OTLP data on ports 4317 (gRPC) and 4318 (HTTP)
- **Tempo**: Distributed tracing backend on port 3200
- **Prometheus**: Metrics collection and querying on port 9090
- **Loki**: Log aggregation on port 3100
- **Promtail**: Log shipping from containers to Loki
- **Grafana**: Dashboards and visualization on port 3001 (admin/admin)

## Architecture

- UI (Service 3) -> Service 1 -> Service 2
- Service 1 stores data in postgres1
- Service 2 stores data in postgres2
- All services instrumented with OpenTelemetry for traces, metrics, and logs
- OTel Collector exports to Tempo (traces), Prometheus (metrics), Loki (logs)

## Setup

1. Ensure Docker and Docker Compose are installed.
2. Run `docker-compose up --build` to start all services.
3. Create tables in both databases:
   - Connect to postgres1: `docker exec -it application-postgres1-1 psql -U user -d db1 -c "CREATE TABLE IF NOT EXISTS data (id SERIAL PRIMARY KEY, value TEXT);"`
   - Connect to postgres2: `docker exec -it application-postgres2-1 psql -U user -d db2 -c "CREATE TABLE IF NOT EXISTS data (id SERIAL PRIMARY KEY, value TEXT);"`

## Endpoints

Each service has:
- GET /health: Returns {"status": "ok"}

Service 1 and 2 have:
- GET /data: Returns data from their respective DB
- POST /data: Inserts data into their DB

Service 3 (UI):
- Serves web interface at /
- POST /data: Forwards to Service 1
- GET /api/call-service1: Calls Service 1's GET /data

## Observability Access

- **Grafana**: http://localhost:3001 (admin/admin) - View traces, metrics, and logs
  - Add Tempo data source: URL `http://tempo:3200`
  - Add Prometheus data source: URL `http://prometheus:9090`
  - Add Loki data source: URL `http://loki:3100`
- **Tempo**: http://localhost:3200 - Raw traces (minimal UI)
- **Prometheus**: http://localhost:9090 (query metrics)
- **Loki**: http://localhost:3100 (log querying)

## Usage

Open http://localhost:3000 in your browser to access the UI with Bootstrap tabs:
- **Insert API1**: POST data to Service 1
- **Insert API2**: POST data to Service 2  
- **Fetch API1**: GET data from Service 1
- **Fetch API2**: GET data from Service 2
- **Fetch Chain**: Service 1 calls Service 2 and returns combined data

All interactions generate traces, metrics, and logs visible in the observability stack.