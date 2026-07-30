export declare function generateId(prefix?: string): string;
export declare function paginate<T>(items: T[], page?: number, limit?: number): {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
};
export declare function todayISO(): string;
export declare function nowISO(): string;
export declare function success<T>(data: T, message?: string): {
    data: T;
    message?: string | undefined;
    success: boolean;
};
export declare function fail(message: string, status?: number): Error & {
    status: number;
};
