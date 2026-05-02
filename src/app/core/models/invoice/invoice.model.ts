// ────────── REQUEST ──────────
export interface InvoiceSearchRequest {
    invoiceCode?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    totalAmountFrom?: number;
    totalAmountTo?: number;
    page: number;
    limit: number;
    sortField?: string;     // 'createdAt', 'invoiceCode', ...
    sortDir?: string;       // 'asc' | 'desc'
}

export interface InvoiceDetailRequest {
    invoiceId: number;
}

// ────────── GRID ROW ──────────
export interface InvoiceListItem {
    id: number;
    invoiceCode: string;
    totalAmount: number;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: string;           // ISO-8601
    fullName: string;
    bookingInvoiceCode: string | null;
}

// ────────── RESPONSE WRAPPER (giống backend ApiResponse + PageResponse) ──────────
export interface InvoiceSearchApiResponse {
    status: number;
    message: string;
    data: {
        rows: InvoiceListItem[];
        pageNo: number;
        pageSize: number;
        totalElements: number;
        totalPages: number;
    };
}

export interface InvoiceDetailData {
    invoiceId: number;
    invoiceCode: string;
    totalAmount: number;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: string;
    diningTable: {
        id: number;
        tableCode: string;
        tableName: string;
        floor: number;
        slot: number;
    };
    createdBy: {
        accountId: number;
        username: string;
        fullName: string;
    };
    customer: {
        bookingId: number | null;
        customerName: string;
        phoneNumber: string | null;
    };
    items: {
        dishId: number;
        dishCode: string;
        dishName: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
    }[];
}

export interface InvoiceDetailApiResponse {
    status: number;
    message: string;
    data: InvoiceDetailData;
}