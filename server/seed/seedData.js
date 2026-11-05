const mongoose = require('mongoose');
const Task = require('../models/Task');
const { connectDB, disconnectDB } = require('../config/db');

/**
 * Seeds a realistic DAG software release project into the database.
 */
async function seedDemoTasks() {
  console.log('[Seeder] Clearing existing tasks...');
  await Task.deleteMany({});

  console.log('[Seeder] Generating DAG nodes...');

  // Phase 1: Create foundational tasks (roots)
  const task1 = await Task.create({
    title: 'System Architecture & API Schema Spec',
    description: 'Define OpenAPI specifications, protobuf schemas, and service boundaries for the microservice mesh.',
    status: 'Done',
    priority: 'High',
    prerequisites: [],
    dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    tags: ['Architecture', 'API', 'Docs'],
  });

  const task7 = await Task.create({
    title: 'Frontend Design System & Dark Slate Theme',
    description: 'Build reusable Tailwind component primitives, color tokens, and modal dialog scaffolding.',
    status: 'Done',
    priority: 'Medium',
    prerequisites: [],
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    tags: ['Frontend', 'UI', 'Tailwind'],
  });

  // Phase 2: Tasks dependent on foundational architecture
  const task2 = await Task.create({
    title: 'Database Schema & Migration Pipeline',
    description: 'Design relational tables, indexes, and automated database migration pipelines.',
    status: 'Done',
    priority: 'Critical',
    prerequisites: [task1._id],
    dueDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    tags: ['Database', 'Postgres', 'Backend'],
  });

  const task5 = await Task.create({
    title: 'Product Catalog & Inventory Service',
    description: 'Implement CRUD microservices for item lookup, stock counts, and SKU caching.',
    status: 'Done',
    priority: 'Medium',
    prerequisites: [task2._id],
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    tags: ['Catalog', 'Backend', 'Services'],
  });

  // Phase 3: Active In-Progress Tasks
  const task3 = await Task.create({
    title: 'Auth & JWT Identity Microservice',
    description: 'Implement OAuth2 / JWT authentication, role-based access control, and token rotation.',
    status: 'In Progress',
    priority: 'Critical',
    prerequisites: [task1._id, task2._id],
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    tags: ['Security', 'Auth', 'Backend'],
  });

  const task8 = await Task.create({
    title: 'Executive Analytics & Sales Dashboard',
    description: 'Real-time telemetry metrics, order velocity visualization, and operational KPIs.',
    status: 'In Progress',
    priority: 'Medium',
    prerequisites: [task7._id, task5._id],
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    tags: ['Analytics', 'Frontend', 'Dashboard'],
  });

  // Phase 4: Blocked Dependent Tasks (Multi-level chain)
  const task4 = await Task.create({
    title: 'Payment Gateway & Stripe Webhook Adapter',
    description: 'Secure credit card tokenization, 3D-Secure charge verification, and webhook replay protection.',
    status: 'Not Started',
    priority: 'Critical',
    prerequisites: [task3._id], // Blocked by Task 3 (In Progress)
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    tags: ['Payments', 'Stripe', 'Fintech'],
  });

  const task6 = await Task.create({
    title: 'Order Processing & Saga State Machine',
    description: 'Distributed transaction coordinator managing stock holds, payment captures, and rollbacks.',
    status: 'Not Started',
    priority: 'High',
    prerequisites: [task4._id, task5._id], // Blocked by Task 4
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    tags: ['Orders', 'Saga', 'Backend'],
  });

  const task9 = await Task.create({
    title: 'Customer Checkout Flow & Cart UI',
    description: 'Interactive single-page checkout experience with address auto-complete and payment inputs.',
    status: 'Not Started',
    priority: 'Critical',
    prerequisites: [task6._id, task7._id], // Blocked by Task 6
    dueDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    tags: ['Frontend', 'Checkout', 'UX'],
  });

  const task10 = await Task.create({
    title: 'End-to-End Integration Testing & Staging QA',
    description: 'Playwright synthetic test suites covering full checkout lifecycle and load endurance.',
    status: 'Not Started',
    priority: 'High',
    prerequisites: [task9._id, task8._id], // Blocked by Task 9 & Task 8
    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    tags: ['QA', 'E2E', 'Testing'],
  });

  console.log(`[Seeder] Successfully seeded 10 realistic DAG project tasks.`);
  return {
    seededCount: 10,
    taskIds: [
      task1._id,
      task2._id,
      task3._id,
      task4._id,
      task5._id,
      task6._id,
      task7._id,
      task8._id,
      task9._id,
      task10._id,
    ],
  };
}

// Allow direct execution via CLI
if (require.main === module) {
  (async () => {
    try {
      require('dotenv').config();
      await connectDB();
      await seedDemoTasks();
      await disconnectDB();
      console.log('[Seeder] Seeding process complete.');
      process.exit(0);
    } catch (err) {
      console.error('[Seeder] Execution failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedDemoTasks,
};
