import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { fail } from '../utils/helpers.js'

export type Role = 'customer' | 'seller' | 'manager' | 'admin' | 'superadmin' | 'delivery'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  avatar?: string
  phone?: string
  sellerId?: string
  /** True when a Super Admin is viewing as another role */
  impersonating?: boolean
  /** Original Super Admin user id (present while impersonating) */
  originalUserId?: string
  /** Always 'superadmin' when impersonating */
  originalRole?: Role
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'atmosphere-dev-secret-change-in-production'

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(fail('Unauthorized', 401))
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser
    req.user = payload
    next()
  } catch {
    next(fail('Invalid or expired token', 401))
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser
    } catch {
      // ignore invalid token for optional routes
    }
  }
  next()
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(fail('Unauthorized', 401))
    if (!roles.includes(req.user.role)) {
      return next(fail('Forbidden', 403))
    }
    next()
  }
}

/** True Super Admin (not currently impersonating another role). */
export function requireGenuineSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(fail('Unauthorized', 401))
  if (req.user.role !== 'superadmin' || req.user.impersonating) {
    return next(fail('Only Super Admin can perform this action', 403))
  }
  next()
}

/**
 * Allows the original Super Admin to start or change impersonation,
 * whether currently acting as Super Admin or already impersonating.
 */
export function requireSuperAdminOrigin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(fail('Unauthorized', 401))
  const isGenuine = req.user.role === 'superadmin' && !req.user.impersonating
  const isImpersonatingAsSuperAdmin =
    Boolean(req.user.impersonating) && req.user.originalRole === 'superadmin'
  if (!isGenuine && !isImpersonatingAsSuperAdmin) {
    return next(fail('Only Super Admin can switch roles', 403))
  }
  next()
}

/** Staff roles that can manage platform-wide resources */
export const staffRoles: Role[] = ['manager', 'admin', 'superadmin']
export const adminRoles: Role[] = ['admin', 'superadmin']

export const ALL_ROLES: Role[] = ['customer', 'seller', 'manager', 'admin', 'superadmin', 'delivery']
