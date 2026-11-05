const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { validate, createTaskSchema, updateTaskSchema } = require('../middleware/validateRequest');

// Graph and Reset routes must precede /:id to prevent ID matching collisions
router.get('/graph', taskController.getDependencyGraph);
router.post('/reset', taskController.resetDemoData);

// Collection routes
router
  .route('/')
  .get(taskController.getTasks)
  .post(validate(createTaskSchema), taskController.createTask);

// Individual item routes
router
  .route('/:id')
  .get(taskController.getTaskById)
  .put(validate(updateTaskSchema), taskController.updateTask)
  .delete(taskController.deleteTask);

module.exports = router;
