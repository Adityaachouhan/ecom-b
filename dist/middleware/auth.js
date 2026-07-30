import jwt from 'jsonwebtoken';
import { fail } from '../utils/helpers.js';
const JWT_SECRET = process.env.JWT_SECRET || 'atmosphere-dev-secret-change-in-production';
export function signToken(user) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}
export function authenticate(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return next(fail('Unauthorized', 401));
    }
    try {
        const payload = jwt.verify(header.slice(7), JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        next(fail('Invalid or expired token', 401));
    }
}
export function optionalAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
        try {
            req.user = jwt.verify(header.slice(7), JWT_SECRET);
        }
        catch {
            // ignore invalid token for optional routes
        }
    }
    next();
}
export function requireRoles(...roles) {
    return (req, _res, next) => {
        if (!req.user)
            return next(fail('Unauthorized', 401));
        if (!roles.includes(req.user.role)) {
            return next(fail('Forbidden', 403));
        }
        next();
    };
}
/** True Super Admin (not currently impersonating another role). */
export function requireGenuineSuperAdmin(req, _res, next) {
    if (!req.user)
        return next(fail('Unauthorized', 401));
    if (req.user.role !== 'superadmin' || req.user.impersonating) {
        return next(fail('Only Super Admin can perform this action', 403));
    }
    next();
}
/**
 * Allows the original Super Admin to start or change impersonation,
 * whether currently acting as Super Admin or already impersonating.
 */
export function requireSuperAdminOrigin(req, _res, next) {
    if (!req.user)
        return next(fail('Unauthorized', 401));
    const isGenuine = req.user.role === 'superadmin' && !req.user.impersonating;
    const isImpersonatingAsSuperAdmin = Boolean(req.user.impersonating) && req.user.originalRole === 'superadmin';
    if (!isGenuine && !isImpersonatingAsSuperAdmin) {
        return next(fail('Only Super Admin can switch roles', 403));
    }
    next();
}
/** Staff roles that can manage platform-wide resources */
export const staffRoles = ['manager', 'admin', 'superadmin'];
export const adminRoles = ['admin', 'superadmin'];
export const ALL_ROLES = ['customer', 'seller', 'manager', 'admin', 'superadmin'];
