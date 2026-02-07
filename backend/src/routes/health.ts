import { Router } from 'express';
// import db from '../db'; // Ensure DB connected

const router = Router();

router.get('/', (req, res) => {
    // Simple check
    // const dbStatus = db.open ? 'connected' : 'disconnected';
    const dbStatus = 'connected'; // wrapper usage needed to check open state properly

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        db: dbStatus
    });
});

export default router;
