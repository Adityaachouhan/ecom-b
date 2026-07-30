import type { Request, Response, NextFunction } from 'express';
export type Role = 'customer' | 'seller' | 'manager' | 'admin' | 'superadmin';
export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: Role;
    avatar?: string;
    phone?: string;
    sellerId?: string;
    /** True when a Super Admin is viewing as another role */
    impersonating?: boolean;
    /** Original Super Admin user id (present while impersonating) */
    originalUserId?: string;
    /** Always 'superadmin' when impersonating */
    originalRole?: Role;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare function signToken(user: AuthUser): string;
export declare function authenticate(req: Request, _res: Response, next: NextFunction): void;
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
export declare function requireRoles(...roles: Role[]): (req: Request, _res: Response, next: NextFunction) => void;
/** True Super Admin (not currently impersonating another role). */
export declare function requireGenuineSuperAdmin(req: Request, _res: Response, next: NextFunction): void;
/**
 * Allows the original Super Admin to start or change impersonation,
 * whether currently acting as Super Admin or already impersonating.
 */
export declare function requireSuperAdminOrigin(req: Request, _res: Response, next: NextFunction): void;
/** Staff roles that can manage platform-wide resources */
export declare const staffRoles: Role[];
export declare const adminRoles: Role[];
export declare const ALL_ROLES: Role[];
