import express from 'express';
import { predictPostPerformance } from '../llm/postPredictor.js';

const router = express.Router();

router.post('/analyze', async (req, res) => {
    try {
        const { caption, image, platform, scheduledTime, mediaType, hashtags } = req.body;

        if (!caption && !image) {
            return res.status(400).json({ error: 'Please provide at least a caption or an image.' });
        }

        const result = await predictPostPerformance({
            caption: caption || "",
            image, // Base64 string or null
            platform: platform || 'Instagram',
            scheduledTime: scheduledTime || new Date().toISOString(),
            mediaType: mediaType || 'post',
            hashtags: hashtags || ''
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Prediction API Error:', error);
        res.status(500).json({ error: 'Failed to generate prediction.' });
    }
});

export default router;
