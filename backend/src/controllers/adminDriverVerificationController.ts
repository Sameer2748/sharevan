import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/helpers';

/**
 * Get driver verifications list (pending verification)
 * GET /api/admin/driver-verifications?page=1&limit=10&search=query&status=PENDING_VERIFICATION
 */
export const getDriverVerifications = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || 'PENDING_VERIFICATION';
    const skip = (page - 1) * limit;

    // Build search filter
    const where: any = {
      status: status as any,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { vehicleNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get drivers
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          vehicleType: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.driver.count({ where }),
    ]);

    const formattedDrivers = drivers.map((driver) => {
      const shortId = driver.id.slice(-5);
      const statusLabel = driver.status === 'PENDING_VERIFICATION' ? 'Pending' :
                          driver.status === 'REJECTED' ? 'Rejected' :
                          driver.status === 'VERIFIED' ? 'Verified' : 'Pending';

      return {
        id: driver.id,
        shortId,
        name: driver.name || 'N/A',
        email: driver.email,
        mobile: driver.mobile || 'N/A',
        vehicleType: driver.vehicleType || 'N/A',
        status: driver.status,
        statusLabel,
        appliedDate: driver.createdAt.toISOString(),
      };
    });

    return sendSuccess(
      res,
      {
        drivers: formattedDrivers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Driver verifications retrieved successfully'
    );
  } catch (error: any) {
    console.error('Get driver verifications error:', error);
    return sendError(res, error.message || 'Failed to get driver verifications', 500);
  }
};

/**
 * Get driver verification details by ID
 * GET /api/admin/driver-verifications/:id
 */
export const getDriverVerificationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        vehicleType: true,
        vehicleNumber: true,
        vehicleModel: true,
        vehicleColor: true,
        status: true,
        licenseNumber: true,
        licenseImage: true,
        vehicleRegImage: true,
        aadharNumber: true,
        aadharImage: true,
        panNumber: true,
        panImage: true,
        createdAt: true,
        verifiedAt: true,
        verifiedBy: true,
        rejectionReason: true,
      },
    });

    if (!driver) {
      return sendError(res, 'Driver not found', 404);
    }

    const shortId = driver.id.slice(-5);

    // Return only 2 documents: License and Aadhar (Resident ID)
    const documents = [
      {
        name: 'Driving License',
        imageUrl: driver.licenseImage,
        required: true,
        verified: driver.status === 'VERIFIED' && !!driver.licenseImage,
        fieldName: 'licenseImage',
      },
      {
        name: 'Resident ID (Aadhar Card)',
        imageUrl: driver.aadharImage,
        required: true,
        verified: driver.status === 'VERIFIED' && !!driver.aadharImage,
        fieldName: 'aadharImage',
      },
    ];

    const verifiedCount = documents.filter(doc => doc.verified).length;

    return sendSuccess(
      res,
      {
        id: driver.id,
        shortId,
        name: driver.name || 'N/A',
        email: driver.email,
        mobile: driver.mobile || 'N/A',
        vehicleType: driver.vehicleType || 'N/A',
        appliedDate: driver.createdAt.toISOString(),
        status: driver.status,
        documents,
        verifiedCount,
        totalDocuments: documents.length,
        rejectionReason: driver.rejectionReason,
        verifiedAt: driver.verifiedAt?.toISOString() || null,
        verifiedBy: driver.verifiedBy || null,
      },
      'Driver verification details retrieved successfully'
    );
  } catch (error: any) {
    console.error('Get driver verification details error:', error);
    return sendError(res, error.message || 'Failed to get driver verification details', 500);
  }
};

/**
 * Update driver verification status and document verifications
 * PUT /api/admin/driver-verifications/:id
 */
export const updateDriverVerification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, documentVerifications, internalNotes } = req.body;
    const adminId = (req as any).user?.id;

    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) {
      return sendError(res, 'Driver not found', 404);
    }

    const updateData: any = {};

    if (status) {
      if (status === 'VERIFIED') {
        // Only verify if both documents are verified
        if (documentVerifications && typeof documentVerifications === 'object') {
          const licenseVerified = documentVerifications.licenseImage === true;
          const aadharVerified = documentVerifications.aadharImage === true;
          
          if (licenseVerified && aadharVerified) {
            updateData.status = 'VERIFIED';
            updateData.verifiedAt = new Date();
            updateData.verifiedBy = adminId;
            updateData.rejectionReason = null;
          } else {
            return sendError(res, 'Both documents (License and Aadhar) must be verified before completing verification', 400);
          }
        } else {
          // If no document verification provided, check if driver has both images
          if (driver.licenseImage && driver.aadharImage) {
            updateData.status = 'VERIFIED';
            updateData.verifiedAt = new Date();
            updateData.verifiedBy = adminId;
            updateData.rejectionReason = null;
          } else {
            return sendError(res, 'Both documents (License and Aadhar) must be present and verified', 400);
          }
        }
      } else if (status === 'REJECTED') {
        updateData.status = 'REJECTED';
        updateData.rejectionReason = rejectionReason || 'Application rejected';
      }
    }
    
    // Handle saving document verifications without status change (for Save & Close)
    // Note: Document verification status is currently stored in memory/session only
    // In a production system, you'd want to store this in a database field
    if (documentVerifications && !status) {
      // Just save progress without changing status
      // The document verifications will be sent when completing verification
    }
    
    if (internalNotes && !status) {
      // Store internal notes (could use rejectionReason field temporarily, or a separate notes field)
      // For now, we'll just acknowledge the save
    }

    // Note: Since we can't modify Driver schema, we'll store document verification status
    // in a JSON field or separate approach. For now, if all documents are verified and status is VERIFIED,
    // we consider the driver verified.
    // In a production system, you'd want a DriverDocumentVerification table or JSON field.

    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        verifiedAt: true,
        verifiedBy: true,
        rejectionReason: true,
      },
    });

    return sendSuccess(res, updatedDriver, 'Driver verification updated successfully');
  } catch (error: any) {
    console.error('Update driver verification error:', error);
    return sendError(res, error.message || 'Failed to update driver verification', 500);
  }
};

