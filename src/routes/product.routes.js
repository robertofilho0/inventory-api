const { Router } = require('express');
const controller = require('../controllers/product.controller');
const validate = require('../middlewares/validate');
const { idParams } = require('../validators/common');
const schemas = require('../validators/product.validator');

const router = Router();

router.get('/', validate({ query: schemas.listQuery }), controller.list);
router.post('/', validate({ body: schemas.createBody }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.patch('/:id', validate({ params: idParams, body: schemas.updateBody }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);

router.get(
  '/:id/movements',
  validate({ params: idParams, query: schemas.movementQuery }),
  controller.listMovements,
);
router.post(
  '/:id/movements',
  validate({ params: idParams, body: schemas.movementBody }),
  controller.addMovement,
);

module.exports = router;
