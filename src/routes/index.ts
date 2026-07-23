import { Router } from 'express';
import authRoutes from '@/routes/auth.routes';
import healthRoutes from '@/routes/health.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);

export default router;
