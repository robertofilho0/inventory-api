const { Router } = require('express');
const controller = require('../controllers/report.controller');

const router = Router();

router.get('/summary', controller.summary);
router.get('/low-stock', controller.lowStock);

module.exports = router;
