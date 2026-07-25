#!/usr/bin/env python3
# M.A.T.R.I.X. AI-OS OpenTelemetry GenAI Telemetry Tracer & Energy Audit System
# Standardized telemetry following OpenTelemetry GenAI semantic conventions.

import time
import uuid
import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

class TelemetrySpan:
    def __init__(self, trace_id: str, name: str, agent_id: str):
        self.trace_id = trace_id
        self.span_id = uuid.uuid4().hex[:8]
        self.name = name
        self.agent_id = agent_id
        self.start_time = time.time()
        self.end_time = None
        self.latency_ms = 0.0
        self.attributes = {}

    def finish(self, attributes: Optional[Dict[str, Any]] = None):
        self.end_time = time.time()
        self.latency_ms = round((self.end_time - self.start_time) * 1000.0, 2)
        if attributes:
            self.attributes.update(attributes)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "name": self.name,
            "agent_id": self.agent_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "latency_ms": self.latency_ms,
            "attributes": self.attributes
        }

class TelemetryTracer:
    """Collects system execution traces, hardware metrics, power draw (W), and energy (Joules)."""

    def __init__(self, capacity: int = 500):
        self.capacity = capacity
        self.spans: List[Dict[str, Any]] = []
        self.total_energy_joules: float = 0.0
        self.total_tokens_generated: int = 0
        self.total_tasks_completed: int = 0

    def start_span(self, trace_id: str, name: str, agent_id: str) -> TelemetrySpan:
        return TelemetrySpan(trace_id, name, agent_id)

    def record_span(self, span: TelemetrySpan):
        span_data = span.to_dict()
        self.spans.append(span_data)
        if len(self.spans) > self.capacity:
            self.spans.pop(0)

        # Update energy & metric totals
        energy = span.attributes.get("energy_joules", 0.0)
        tokens = span.attributes.get("tokens_generated", 0)
        self.total_energy_joules += energy
        self.total_tokens_generated += tokens

    def record_task_completion(self):
        """Record completion once per scheduler task, not once per execution span."""
        self.total_tasks_completed += 1

    def get_summary_telemetry(self) -> Dict[str, Any]:
        mean_latency = 0.0
        if self.spans:
            mean_latency = round(sum(s["latency_ms"] for s in self.spans) / len(self.spans), 2)

        j_per_token = round(self.total_energy_joules / max(1, self.total_tokens_generated), 4)
        j_per_task = round(self.total_energy_joules / max(1, self.total_tasks_completed), 2)

        return {
            "total_spans_recorded": len(self.spans),
            "total_tasks_completed": self.total_tasks_completed,
            "total_energy_joules": round(self.total_energy_joules, 2),
            "total_tokens_generated": self.total_tokens_generated,
            "joules_per_token": j_per_token,
            "joules_per_task": j_per_task,
            "mean_latency_ms": mean_latency,
            "recent_spans": self.spans[-10:]
        }

# Global tracer instance
TRACER = TelemetryTracer()
