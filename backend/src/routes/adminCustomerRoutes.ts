import { Router } from 'express';
import * as adminCustomerController from '../controllers/adminCustomerController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/admin/customers
 * @desc    Get customers list with pagination and search
 * @access  Private (Admin only)
 */
router.get('/', authenticateToken, requireRole('ADMIN'), adminCustomerController.getCustomers);

/**
 * @route   GET /api/admin/customers/:id
 * @desc    Get customer details
 * @access  Private (Admin only)
 */
router.get('/:id', authenticateToken, requireRole('ADMIN'), adminCustomerController.getCustomerDetails);

/**
 * @route   PUT /api/admin/customers/:id
 * @desc    Update customer (suspend, add note, assign promo code)
 * @access  Private (Admin only)
 */
router.put('/:id', authenticateToken, requireRole('ADMIN'), adminCustomerController.updateCustomer);

export default router;

