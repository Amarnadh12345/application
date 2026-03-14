import os
from flask import Flask, request, jsonify
import psycopg2
import requests
import logging

# OpenTelemetry setup
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor

# Initialize tracing
trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="otel-collector:4317", insecure=True))
)

# Initialize metrics
metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter(endpoint="otel-collector:4317", insecure=True))
metrics.set_meter_provider(MeterProvider(metric_readers=[metric_reader]))

app = Flask(__name__)

# Instrument Flask and psycopg2
FlaskInstrumentor().instrument_app(app)
Psycopg2Instrumentor().instrument()

def get_db_connection():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    return conn

@app.route('/health')
def health():
    logging.info("Health check requested")
    return jsonify({'status': 'ok'})

@app.route('/data', methods=['GET'])
def get_data():
    logging.info("Fetching data from service1")
    meter = metrics.get_meter("service1")
    counter = meter.create_counter("data_requests", description="Number of data requests")
    counter.add(1)
    
    # Fetch from own DB
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT * FROM data')
    own_data = [{'id': row[0], 'value': row[1]} for row in cur.fetchall()]
    cur.close()
    conn.close()
    
    # Fetch from service2
    try:
        response = requests.get('http://service2:5000/data')
        service2_data = response.json()
        logging.info(f"Fetched {len(service2_data)} items from service2")
    except Exception as e:
        service2_data = {'error': str(e)}
        logging.error(f"Error fetching from service2: {e}")
    
    return jsonify({
        'own_data': own_data,
        'service2_data': service2_data
    })

@app.route('/data', methods=['POST'])
def data():
    value = request.json.get('value')
    logging.info(f"Inserting data: {value}")
    meter = metrics.get_meter("service1")
    counter = meter.create_counter("data_inserts", description="Number of data inserts")
    counter.add(1)
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('INSERT INTO data (value) VALUES (%s)', (value,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'message': 'data inserted'})

@app.route('/call-service2')
def call_service2():
    try:
        response = requests.get('http://service2:5000/health')
        return jsonify({'service2_response': response.json()})
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)