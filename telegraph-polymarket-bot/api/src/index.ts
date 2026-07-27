import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.routes';
import { telegraphSignalService } from './services/telegraph-signal.service';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Main API routes
app.use('/api', apiRoutes);

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🔗 Health check: http://localhost:${port}/api/health`);
});

// Start the Telegraph signal WebSocket subscription
telegraphSignalService.start();
