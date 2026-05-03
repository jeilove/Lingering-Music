import express from 'express';
import cors from 'cors';
import { config } from './config';
import storageRouter from './routes/storage';
import musicRouter from './routes/music';

const app = express();

app.use(cors({ origin: true, credentials: true }));

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Private-Network', 'true');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api', storageRouter);
app.use('/api', musicRouter);

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
