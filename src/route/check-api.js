import { Router } from 'express';

const router = Router();

// Basic GET request to check server status
router.get('/status', (req, res) => {
    res.json({ message: 'Server is running' });
});

export default router;