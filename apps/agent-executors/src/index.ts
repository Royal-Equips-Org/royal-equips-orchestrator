import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const PORT = process.env.AGENT_EXECUTORS_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'agent-executors', timestamp: new Date().toISOString() });
});

app.get('/readiness', (req, res) => {
  res.json({ status: 'ready', service: 'agent-executors', timestamp: new Date().toISOString() });
});

// Agent execution endpoints
app.post('/execute/:agentType', async (req, res) => {
  try {
    const { agentType } = req.params;
    const { payload } = req.body;
    
    // Basic agent execution logic
    const result = {
      agentType,
      executionId: `exec_${Date.now()}`,
      status: 'completed',
      payload,
      timestamp: new Date().toISOString()
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Agent execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Agent status endpoints
app.get('/agents/status', (req, res) => {
  res.json({
    agents: [
      { name: 'inventory', status: 'active', lastExecution: new Date().toISOString() },
      { name: 'marketing', status: 'active', lastExecution: new Date().toISOString() },
      { name: 'fulfillment', status: 'active', lastExecution: new Date().toISOString() }
    ],
    total: 3,
    active: 3
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 Agent Executors Service running on port ${PORT}`);
});