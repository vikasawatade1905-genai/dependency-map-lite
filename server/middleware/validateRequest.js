const { z } = require('zod');

// Regex for standard MongoDB ObjectId (24 hex characters)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = z
  .string()
  .regex(objectIdRegex, { message: 'Must be a valid 24-character hex ObjectId' });

const createTaskSchema = z.object({
  title: z
    .string({ required_error: 'Task title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title cannot exceed 120 characters'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().default(''),
  status: z
    .enum(['Not Started', 'In Progress', 'Done'], {
      errorMap: () => ({ message: 'Status must be "Not Started", "In Progress", or "Done"' }),
    })
    .optional()
    .default('Not Started'),
  priority: z
    .enum(['Low', 'Medium', 'High', 'Critical'], {
      errorMap: () => ({ message: 'Priority must be "Low", "Medium", "High", or "Critical"' }),
    })
    .optional()
    .default('Medium'),
  prerequisites: z.array(objectIdSchema).optional().default([]),
  dueDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date format for dueDate',
    })
    .optional()
    .nullable(),
  tags: z.array(z.string().trim()).optional().default([]),
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120, 'Title cannot exceed 120 characters').optional(),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
  status: z
    .enum(['Not Started', 'In Progress', 'Done'], {
      errorMap: () => ({ message: 'Status must be "Not Started", "In Progress", or "Done"' }),
    })
    .optional(),
  priority: z
    .enum(['Low', 'Medium', 'High', 'Critical'], {
      errorMap: () => ({ message: 'Priority must be "Low", "Medium", "High", or "Critical"' }),
    })
    .optional(),
  prerequisites: z.array(objectIdSchema).optional(),
  dueDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date format for dueDate',
    })
    .optional()
    .nullable(),
  tags: z.array(z.string().trim()).optional(),
});

/**
 * Middleware factory for validating request bodies
 */
const validate = (schema) => (req, res, next) => {
  try {
    const validatedData = schema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails,
      });
    }
    next(error);
  }
};

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  validate,
};
