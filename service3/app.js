// OpenTelemetry setup
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter, OTLPMetricExporter } = require('@opentelemetry/exporter-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { LoggerProvider, BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { logs } = require('@opentelemetry/api-logs');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
    headers: {},
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://otel-collector:4318/v1/metrics',
      headers: {},
    }),
    exportIntervalMillis: 10000,
  }),
  logRecordProcessor: new BatchLogRecordProcessor(new OTLPLogExporter({
    url: 'http://otel-collector:4318/v1/logs',
    headers: {},
  })),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

const express = require('express');
const path = require('path');
const { metrics } = require('@opentelemetry/api-metrics');

const app = express();
app.use(express.json());

// Basic request logging (for debug)
app.use((req, res, next) => {
    console.log(`[service3] ${req.method} ${req.originalUrl}`);
    next();
});

app.get('/health', (req, res) => {
    const logger = logs.getLogger('service3');
    logger.emit({ body: 'Health check requested', severityNumber: 9 });
    
    const meter = metrics.getMeter('service3');
    const counter = meter.createCounter('health_checks', { description: 'Number of health checks' });
    counter.add(1);
    
    res.json({ status: 'ok' });
});

// API helper that proxies to another service
async function proxyJson(url, method = 'GET', body = null) {
    const fetch = (await import('node-fetch')).default;
    const options = { method, headers: {} };
    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const text = await response.text();

    if (!response.ok) {
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = { raw: text };
        }
        return { ok: false, status: response.status, body: parsed };
    }

    try {
        return { ok: true, body: JSON.parse(text) };
    } catch {
        return { ok: false, status: 502, body: { error: 'Non-JSON response', raw: text } };
    }
}

// Proxy helpers
app.post('/api/insert1', async (req, res) => {
    const result = await proxyJson('http://service1:5000/data', 'POST', req.body);
    res.status(result.ok ? 200 : result.status).json(result.body);
});

app.post('/api/insert2', async (req, res) => {
    const result = await proxyJson('http://service2:5000/data', 'POST', req.body);
    res.status(result.ok ? 200 : result.status).json(result.body);
});

app.get('/api/fetch1', async (req, res) => {
    const result = await proxyJson('http://service1:5000/data', 'GET');
    res.status(result.ok ? 200 : result.status).json(result.body);
});

app.get('/api/fetch2', async (req, res) => {
    const result = await proxyJson('http://service2:5000/data', 'GET');
    res.status(result.ok ? 200 : result.status).json(result.body);
});

// Backward-compatibility: existing call-chain endpoint
app.get('/api/call-service1', async (req, res) => {
    const result = await proxyJson('http://service1:5000/data', 'GET');
    res.status(result.ok ? 200 : result.status).json(result.body);
});

// Serve UI
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all for /api routes (returns JSON instead of HTML)
app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

app.listen(3000, () => {
    console.log('UI Service listening on port 3000');
});