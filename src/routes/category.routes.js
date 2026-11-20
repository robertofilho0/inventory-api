const { Router } = require('express');
const controller = require('../controllers/category.controller');
const validate = require('../middlewares/validate');
const { idParams } = require('../validators/common');
const schemas = require('../validators/category.validator');

const router = Router();

router.get('/', controller.list);
router.post('/', validate({ body: schemas.createBody }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.patch('/:id', validate({ params: idParams, body: schemas.updateBody }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);

module.exports = router;
