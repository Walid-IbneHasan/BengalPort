export type OpportunityCategory = 'BUSINESS'|'EDUCATION'|'HEALTHCARE'|'FACTORY_VISIT'|'BUSINESS_TOUR'|'SCHOLARSHIP'|'EVENT';
export type PaymentStatus = 'PAID'|'PARTIALLY_PAID'|'DUE'|'PENDING'|'FAILED'|'REFUNDED';
export type ApiResponse<T> = { data: T; meta?: { total:number; page:number; pageSize:number } };
export type ApiError = { error: { code:string; message:string; details?:unknown } };
