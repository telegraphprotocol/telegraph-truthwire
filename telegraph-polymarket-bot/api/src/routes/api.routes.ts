import { Router } from 'express';
import * as signalsController from '../controllers/signals.controller';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'active', network: 'Telegraph WS', protocol: 'Telegraph' }));
router.get('/polymarket/search', signalsController.searchMarkets);
router.get('/signals', signalsController.getSignals);
router.get('/trades', signalsController.getTrades);
router.get('/portfolio', signalsController.getPortfolio);

export default router;
