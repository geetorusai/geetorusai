# 20 — Glossary and Learning Guide

This reference guide explains core technical terms and product-specific concepts used throughout the GeetorusAI architecture in clear, accessible language.

---

## 1. General AI & Systems Engineering Terminology

### **AI Inference**
The process where a trained machine learning model processes an input prompt and generates a predictive output response (tokens of text, code, or structured JSON).

### **LLM (Large Language Model)**
A neural network trained on vast amounts of text data capable of understanding, generating, and reasoning through natural language and code (e.g., Claude 3.5 Sonnet, GPT-4o, Llama 3.3).

### **Agent**
An autonomous software entity powered by an LLM that can perceive its environment, formulate multi-step plans, execute tools, observe feedback, and iterate toward a goal without human intervention at every step.

### **Tool Calling / Function Calling**
A mechanism allowing an LLM to request the execution of predefined functions (such as reading a file, running a database query, or deploying a service) with structured JSON arguments.

### **Context Window**
The maximum volume of tokens (words/characters) an LLM can process simultaneously across the system instructions, conversation history, and tool outputs in a single inference call.

### **Model Context Protocol (MCP)**
An open standard protocol developed by Anthropic allowing AI models to securely discover, inspect, and invoke external tools and context providers over standard communication channels (stdio, HTTP/SSE).

### **Agent Client Protocol (ACP / ACPX)**
A standardized communication protocol between an AI agent engine (like Claude Code or Codex) and a host client (like GeetorusAI), enabling session persistence, warm process reuse, and structured terminal streaming.

### **Circuit Breaker**
A software resilience pattern that detects repeated operational failures (such as LLM rate limits or API outages) and temporarily stops sending requests to the failing component, preventing cascade failures and runaway spend.

### **Role-Based Access Control (RBAC)**
A security model where access permissions to system resources (issues, secrets, tools, agents) are assigned based on a user's or agent's defined role (`owner`, `admin`, `member`, `contractor`).

---

## 2. GeetorusAI Product-Specific Terminology

### **Heartbeat**
The autonomous background scheduler loop in GeetorusAI (`server/src/services/heartbeat.ts`) that periodically wakes assigned agents, acquires issue locks, provisions isolated worktrees, and supervises task execution.

### **Execution Workspace (Git Worktree)**
An isolated filesystem checkout created dynamically from a Git repository branch. Worktrees allow AI agents to edit, build, and test code on an independent branch without dirtying the developer's primary working directory.

### **Tool Gateway**
The centralized security and dispatch router in GeetorusAI (`server/src/services/tool-gateway.ts`) that evaluates tool permissions, executes stdio/MCP commands, enforces human approval gates, and scrubs sensitive secrets from tool outputs.

### **Pulse & PulseCenter**
The real-time health monitoring and self-healing subsystem (`server/src/services/pulse/`) that runs diagnostics against the API gateway, PostgreSQL database, model providers, and runner daemons every 30 seconds.

### **Routine**
A scheduled, recurring agent workflow (configured with cron expressions or periodic intervals) that executes automated maintenance, triage, or reporting tasks without manual triggers.

### **Decision Queue**
A triage surface in the UI where human operators review, prioritize, approve, or reject batched agent proposals, high-risk tool actions, or secret update requests.

### **Bubblewrap (`bwrap`) Confinement**
A lightweight Linux namespace containerization tool used by GeetorusAI to restrict an agent subprocess's filesystem access exclusively to its assigned worktree and block unauthorized network sockets.
