const express = require('express');
const router = express.Router();

const telegram = require('./telegram');

router.use('/telegram', telegram);

module.exports = router;
