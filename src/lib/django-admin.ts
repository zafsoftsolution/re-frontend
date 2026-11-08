/**
 * Django admin REST client.
 *
 * Talks to the same Django backend as `lib/django.ts` but stores tokens under
 * separate localStorage keys (`jmn:admin:access` / `jmn:admin:refresh`) so an
 * admin can be signed in alongside a customer session, and gates login on
 * `is_staff || is_superuser || account_type === "staff"` so a regular customer
 * can't elevate themselves into the console.
 *
 * Endpoints used (from this codebase's auth_app + storefront + inventory):
 *   POST  /api/auth/login/                         (JWT obtain)
 *   GET   /api/auth/me/                            (whoami)
 *   POST  /api/auth/logout/                        (blacklist refresh)
 *   POST  /api/auth/refresh/                       (refresh access)
 *   GET   /api/auth/users/?account_type=customer   (customer list)
 *   POST  /api/auth/users/{id}/lock|unlock|suspend|reactivate/
 *   GET   /api/site/products/                      (products, list & detail)
 *   …     /api/site/{categories|brands|collections|reviews|faqs}/
 *   GET   /api/inventory/orders/                   (orders + status update)
 *   POST  /api/inventory/orders/{id}/update_status/
 *   POST  /api/inventory/orders/{id}/mark_paid/
 *   GET   /api/inventory/dashboard/                (KPIs, sales, recent)
 */

const ROOT =
  process.env.NEXT_PUBLIC_DJANGO_API_URL?.replace(/\/api\/auth\/?$/, "") ||
  "http://localhost:8000";
const API = `${ROOT}/api`;

const ACCESS_KEY = "jmn:admin:access";
const REFRESH_KEY = "jmn:admin:refresh";
const USER_KEY = "jmn:admin:user";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminUserShape {
  id: string;
  email: string;
  phone_number: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  display_name: string;
  avatar_url: string;
  account_type: string;
  account_status: string;
  is_staff: boolean;
  is_superuser: boolean;
  email_verified: boolean;
  mfa_enabled: boolean;
  date_joined: string;
  last_login: string | null;
  roles: Array<{
    code: string;
    name: string;
    scope: string;
    is_primary: boolean;
    organization_id: string | null;
    store_id: string | null;
  }>;
  /**
   * Flat list of every permission code this user has across all assigned
   * roles (parents included). Superusers receive every code defined in the
   * catalog. Use the `hasPermission()` helper on the AdminContext rather
   * than poking this array directly so superuser short-circuiting stays in
   * one place.
   */
  effective_permissions: string[];
}

// ─── RBAC types ─────────────────────────────────────────────────────────────

export interface PermissionShape {
  id: string;
  code: string;
  module: string;
  resource: string;
  action: string;
  name: string;
  description: string;
  is_system: boolean;
}

export interface PermissionGroupShape {
  module: string;
  label: string;
  permissions: PermissionShape[];
}

export type RoleScope = "global" | "organization" | "store" | "department";
export type RoleAccountType = "customer" | "staff" | "service" | "" | null;

export interface RoleShape extends Record<string, unknown> {
  id: string;
  organization: string | null;
  code: string;
  name: string;
  description: string;
  scope: RoleScope;
  parent: string | null;
  is_system: boolean;
  is_default: boolean;
  applies_to_account_type: RoleAccountType;
  permissions: PermissionShape[];
  /** Flat list of codes — drives the role-form checkbox state. */
  permission_codes: string[];
  created_at: string;
  updated_at: string;
}

export interface RoleCreateInput {
  code: string;
  name: string;
  description?: string;
  scope: RoleScope;
  applies_to_account_type?: RoleAccountType;
  is_default?: boolean;
  parent?: string | null;
  permission_codes: string[];
}

interface AuthResponse {
  access: string;
  refresh: string;
  user: AdminUserShape;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── Purchasing types ────────────────────────────────────────────────────────

export interface SupplierShape extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  legal_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  tax_id: string;
  default_currency: string;
  payment_terms_days: number;
  status: "active" | "inactive" | "blocked";
  notes: string;
  open_po_count?: number;
  created_at: string;
  updated_at: string;
}

export type PurchaseOrderStatus =
  | "draft"
  | "awaiting_approval"
  | "approved"
  | "ordered"
  | "partial_received"
  | "received"
  | "closed"
  | "cancelled";

export interface PurchaseOrderItemShape {
  id: string;
  purchase_order: string;
  product: string | null;
  product_name: string;
  sku: string;
  color: string;
  size: string;
  product_image: string | null;
  ordered_quantity: number;
  received_quantity: number;
  remaining_quantity: number;
  unit_cost: string;
  discount_pct: string;
  tax_pct: string;
  line_total: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderTimelineShape {
  id: string;
  status: PurchaseOrderStatus;
  note: string;
  actor: string | null;
  actor_email: string | null;
  at: string;
}

export interface GoodsReceiptItemShape {
  id: string;
  receipt: string;
  purchase_order_item: string;
  product_name: string;
  sku: string;
  color: string;
  size: string;
  ordered_quantity: number;
  quantity_received: number;
  unit_cost_snapshot: string;
  notes: string;
}

export interface GoodsReceiptShape {
  id: string;
  number: string;
  purchase_order: string;
  purchase_order_number: string;
  warehouse: string;
  status: "draft" | "posted" | "reversed";
  received_at: string | null;
  received_by: string | null;
  received_by_email: string | null;
  supplier_packing_slip: string;
  notes: string;
  items: GoodsReceiptItemShape[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderListShape {
  id: string;
  number: string;
  status: PurchaseOrderStatus;
  currency: string;
  supplier: string;
  supplier_name: string;
  supplier_code: string;
  warehouse: string;
  warehouse_name: string;
  subtotal: string;
  discount: string;
  tax: string;
  shipping: string;
  other_charges: string;
  total: string;
  expected_delivery_date: string | null;
  supplier_reference: string;
  ordered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  item_count: number;
  // Payment (denormalised from the PurchasePayment ledger).
  amount_paid: string;
  balance_due: string;
  payment_status: PurchasePaymentStatus;
  paid_at: string | null;
  is_overdue: boolean;
  payment_terms_days: number;
  created_at: string;
  updated_at: string;
}

export type PurchasePaymentStatus = "unpaid" | "partial" | "paid";

export type PurchasePaymentMethod =
  | "cash"
  | "bank"
  | "mobile"
  | "cheque"
  | "card"
  | "other";

export interface PurchasePaymentShape {
  id: string;
  purchase_order: string;
  amount: string;
  currency: string;
  method: PurchasePaymentMethod;
  method_label: string;
  reference: string;
  paid_at: string;
  note: string;
  recorded_by: string | null;
  recorded_by_email: string | null;
  created_at: string;
}

export interface PurchaseOrderShape extends PurchaseOrderListShape {
  over_receipt_allowed: boolean;
  notes: string;
  internal_notes: string;
  created_by: string | null;
  created_by_email: string | null;
  approved_by: string | null;
  approved_by_email: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  is_editable: boolean;
  is_receivable: boolean;
  items: PurchaseOrderItemShape[];
  timeline: PurchaseOrderTimelineShape[];
  receipts: GoodsReceiptShape[];
  payments: PurchasePaymentShape[];
}

export interface DirectPurchasePayment {
  amount: number | string;
  method?: PurchasePaymentMethod;
  reference?: string;
  /** ISO datetime. Defaults to now on the server. */
  paid_at?: string | null;
  note?: string;
}

export interface DirectPurchaseInput
  extends Omit<PurchaseOrderCreateInput, "over_receipt_allowed"> {
  payment?: DirectPurchasePayment;
}

export interface PurchasePaymentInput {
  amount: number | string;
  method?: PurchasePaymentMethod;
  reference?: string;
  paid_at?: string | null;
  note?: string;
}

export interface SupplierDueShape {
  supplier: string;
  supplier_name: string;
  supplier_code: string;
  currency: string;
  open_invoice_count: number;
  overdue_invoice_count: number;
  total_billed: string;
  total_paid: string;
  balance_due: string;
}

// ─── Return shapes ──────────────────────────────────────────────────────────

export type OrderReturnStatus =
  | "requested"
  | "approved"
  | "received"
  | "refunded"
  | "rejected";

export type OrderReturnReason =
  | "defective"
  | "wrong_item"
  | "wrong_size"
  | "not_as_described"
  | "changed_mind"
  | "late"
  | "other";

export type OrderReturnItemCondition = "resalable" | "damaged" | "opened";

export type RefundMethod =
  | "cash"
  | "bank"
  | "mobile"
  | "card_reversal"
  | "store_credit"
  | "other";

export interface OrderReturnItemShape {
  id: string;
  order_item: string;
  order_item_name: string;
  order_item_sku: string;
  order_item_color: string;
  order_item_size: string;
  quantity: number;
  condition: OrderReturnItemCondition;
  condition_label: string;
  unit_price_snapshot: string;
  cost_price_snapshot: string | null;
  line_total: string;
  notes: string;
}

export interface OrderReturnShape {
  id: string;
  number: string;
  order: string;
  order_number: string;
  customer_email: string;
  warehouse: string;
  warehouse_name: string;
  status: OrderReturnStatus;
  status_label: string;
  reason: OrderReturnReason;
  reason_note: string;
  items_total: string;
  refund_amount: string;
  refund_method: RefundMethod | "";
  refund_reference: string;
  currency: string;
  notes: string;
  requested_by: string | null;
  processed_by: string | null;
  created_at: string;
  approved_at: string | null;
  received_at: string | null;
  refunded_at: string | null;
  rejected_at: string | null;
  updated_at: string;
  is_editable: boolean;
  items: OrderReturnItemShape[];
}

export interface OrderReturnCreateInput {
  order: string;
  warehouse: string;
  reason?: OrderReturnReason;
  reason_note?: string;
  refund_amount?: number | null;
  refund_method?: RefundMethod | "";
  refund_reference?: string;
  notes?: string;
  items: Array<{
    order_item: string;
    quantity: number;
    condition?: OrderReturnItemCondition;
    notes?: string;
  }>;
}

export type PurchaseReturnStatus = "draft" | "posted" | "refunded" | "cancelled";

export type PurchaseReturnReason =
  | "defective"
  | "wrong_item"
  | "over_received"
  | "expired"
  | "other";

export interface PurchaseReturnItemShape {
  id: string;
  purchase_order_item: string;
  poi_name: string;
  poi_sku: string;
  poi_color: string;
  poi_size: string;
  poi_received_quantity: number;
  quantity: number;
  unit_cost_snapshot: string;
  line_total: string;
  notes: string;
}

export interface PurchaseReturnShape {
  id: string;
  number: string;
  purchase_order: string;
  purchase_order_number: string;
  supplier_name: string;
  supplier_code: string;
  warehouse: string;
  warehouse_name: string;
  status: PurchaseReturnStatus;
  status_label: string;
  reason: PurchaseReturnReason;
  reason_note: string;
  items_total: string;
  refund_amount: string;
  refund_method: RefundMethod | "";
  refund_reference: string;
  currency: string;
  supplier_reference: string;
  notes: string;
  created_by: string | null;
  processed_by: string | null;
  created_at: string;
  posted_at: string | null;
  refunded_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
  is_editable: boolean;
  items: PurchaseReturnItemShape[];
}

export interface PurchaseReturnCreateInput {
  purchase_order: string;
  warehouse?: string;
  reason?: PurchaseReturnReason;
  reason_note?: string;
  refund_amount?: number | null;
  refund_method?: RefundMethod | "";
  refund_reference?: string;
  supplier_reference?: string;
  notes?: string;
  items: Array<{
    purchase_order_item: string;
    quantity: number;
    unit_cost_snapshot?: number | null;
    notes?: string;
  }>;
}

export interface RefundInput {
  amount?: number | null;
  method?: RefundMethod | "";
  reference?: string;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export type NotificationChannelCode = "email" | "sms" | "push" | "in_app";

/**
 * Subset of the backend NotificationEvent enum that an admin actually
 * cares about. Keep this loose (string fallback) — the backend can ship
 * new events without breaking the type.
 */
export type NotificationEventCode =
  | "account.welcome"
  | "account.verify_email"
  | "account.password_reset"
  | "account.password_changed"
  | "order.placed"
  | "order.paid"
  | "order.status_changed"
  | "order.shipped"
  | "order.delivered"
  | "order.cancelled"
  | "order.refunded"
  | "stock.low"
  | "stock.out"
  | "stock.back_in_stock"
  | "cart.abandoned"
  | "product.price_drop"
  | "marketing.promotion"
  | "marketing.newsletter"
  | "system.announcement"
  | (string & {});

export type NotificationStatusCode =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "suppressed";

export type NotificationPriorityCode =
  | "transactional"
  | "informational"
  | "marketing";

export interface NotificationShape {
  id: string;
  event: NotificationEventCode;
  event_label: string;
  channel: NotificationChannelCode;
  user: string | null;
  for_admins: boolean;
  email: string;
  phone: string;
  subject: string;
  body: string;
  /**
   * Free-form payload. Convention: when present, `reference_url` is a
   * relative path the frontend should navigate to when the notification
   * card is clicked (e.g. `/admin/orders?id=…`).
   */
  payload: Record<string, unknown> & { reference_url?: string };
  status: NotificationStatusCode;
  priority: NotificationPriorityCode;
  error: string;
  provider_message_id: string;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  is_read: boolean;
}

// ─── Sales model / quotes (RFQ) ─────────────────────────────────────────────

export type SiteSalesMode = "quote_only" | "mixed";
export type ProductSalesModeSetting = "inherit" | "quote_only" | "direct";
export type AvailabilityOverride = "auto" | "on_request" | "discontinued";
export type ProductStatusCode = "active" | "draft" | "archived";

export type QuoteStatus =
  | "new"
  | "in_review"
  | "quoted"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled"
  | "converted";

export type QuotePreferredContact = "whatsapp" | "call" | "email";

export interface QuoteItemShape {
  id: string;
  order: number;
  product: string | null;
  product_slug: string | null;
  product_name: string | null;
  product_part_number: string | null;
  /** Internal list price (staff only) — a reference when quoting. */
  product_price: string | null;
  part_number_text: string;
  description: string;
  quantity: number;
  machine_model_text: string;
  quoted_unit_price: string | null;
  line_total: string | null;
  admin_notes: string;
}

export interface QuoteAttachmentShape {
  id: string;
  original_name: string;
  content_type: string;
  size: number;
  /** Authenticated download endpoint — fetch with the admin JWT. */
  url: string;
  created_at: string;
}

export interface QuoteCustomerSummary {
  id: string;
  email: string;
  name: string;
  phone: string;
  company_name: string;
}

export interface QuoteShape {
  id: string;
  reference: string;
  status: QuoteStatus;
  /** PATCH-able next statuses (never contains "converted"). */
  allowed_transitions: QuoteStatus[];
  admin_notes: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  bin_number: string;
  delivery_area: string;
  preferred_contact: QuotePreferredContact;
  notes: string;
  currency: string;
  quoted_total: string | null;
  valid_until: string | null;
  quoted_at: string | null;
  quoted_by: string | null;
  sent_at: string | null;
  sent_count: number;
  order: string | null;
  order_number: string | null;
  converted_at: string | null;
  customer: string | null;
  customer_summary: QuoteCustomerSummary | null;
  locale: string;
  ip_address: string | null;
  user_agent: string;
  user: string | null;
  items: QuoteItemShape[];
  attachments: QuoteAttachmentShape[];
  items_count: number;
  attachments_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuotePatchInput {
  status?: QuoteStatus;
  admin_notes?: string;
  valid_until?: string | null;
  quoted_total?: string | number | null;
  customer?: string | null;
}

export interface QuoteMarkQuotedInput {
  items?: Array<{
    id: string;
    quoted_unit_price: string | number | null;
    admin_notes?: string;
    /** slug or uuid; null/"" unlinks. */
    product?: string | null;
  }>;
  quoted_total?: string | number | null;
  valid_until?: string | null;
  currency?: string;
  admin_notes?: string;
}

export interface QuoteConvertInput {
  payment_method?: string;
  payment_status?: "pending" | "paid";
  shipping?: string | number;
  tax?: string | number;
  allow_no_stock?: boolean;
  skip_unlinked?: boolean;
  notes?: string;
  internal_notes?: string;
  shipping_address?: Record<string, unknown>;
  billing_address?: Record<string, unknown>;
}

export interface QuoteConvertResponse {
  order: { id: string; order_number: string } & Record<string, unknown>;
  quote: QuoteShape;
}

export interface QuoteSendInput {
  email?: string;
  message?: string;
  send_email?: boolean;
}

export interface QuoteSendResponse {
  sent_at: string;
  sent_count: number;
  emailed: boolean;
  email_to: string | null;
  email_error: string | null;
  whatsapp_url: string | null;
  pdf_url: string;
}

export interface QuoteStatsShape {
  total: number;
  by_status: Record<QuoteStatus, number>;
  open: number;
  new_last_7_days: number;
  expiring_soon: number;
  currency: string;
  quoted_value_total: string | null;
  open_quoted_value: string | null;
  converted_value: string | null;
  /** converted / ever-quoted, 0..1 — null until something was quoted. */
  conversion_rate: number | null;
  avg_response_hours: number | null;
  newest: Array<{
    id: string;
    reference: string;
    status: QuoteStatus;
    company_name: string;
    contact_name: string;
    phone: string;
    items_count: number;
    quoted_total: string | null;
    created_at: string;
  }>;
}

// ─── Products: bulk + import ────────────────────────────────────────────────

export interface ProductBulkSet {
  sales_mode?: ProductSalesModeSetting;
  status?: ProductStatusCode;
  availability_override?: AvailabilityOverride;
  price_on_request?: boolean;
  /** category slug */
  category?: string;
}

export interface ProductBulkResult {
  matched: number;
  updated: number;
  unchanged: number;
  not_found: string[];
  set: Record<string, unknown>;
}

export interface ProductImportResult {
  dry_run: boolean;
  applied: boolean;
  total_rows: number;
  created: number;
  updated: number;
  unchanged: number;
  error_count: number;
  errors: Array<{ row: number; sku: string; errors: Record<string, string> }>;
  rows: Array<{ row: number; sku: string; action: "create" | "update" | "unchanged" }>;
}

// ─── Site settings (singleton) ──────────────────────────────────────────────

export interface SiteSettingsShape {
  id: number;
  // Identity
  site_name: string;
  site_tagline: string;
  /** QUOTE-FIRST: "quote_only" hides every price; "mixed" lets products
   *  with sales_mode="direct" show prices + checkout. */
  sales_mode: SiteSalesMode;
  contact_email: string;
  contact_phone: string;
  business_address: string;
  // Explicit-language copies (modeltranslation).
  site_tagline_en: string;
  site_tagline_bn: string;
  business_address_en: string;
  business_address_bn: string;
  footer_text_en: string;
  footer_text_bn: string;
  // Quotations
  company_bin: string;
  quote_validity_days: number;
  quote_terms: string;
  // Localization
  default_currency: string;
  default_locale: string;
  timezone: string;
  // Branding
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  og_image_url: string;
  primary_color: string;
  accent_color: string;
  footer_text: string;
  // Shipping & tax
  free_shipping_threshold: string;
  flat_shipping_fee: string;
  tax_rate: string;
  cod_enabled: boolean;
  cod_extra_fee: string;
  // Inventory
  low_stock_threshold_default: number;
  // Purchasing
  default_payment_terms_days: number;
  over_receipt_allowed_default: boolean;
  // Order behavior
  auto_cancel_unpaid_after_hours: number;
  // SEO defaults
  seo_title: string;
  seo_description: string;
  seo_title_template: string;
  seo_keywords: string;
  default_robots: string;
  canonical_base_url: string;
  twitter_handle: string;
  twitter_card_type: "summary" | "summary_large_image" | "app" | "player";
  // SEO — verification
  google_site_verification: string;
  bing_site_verification: string;
  pinterest_site_verification: string;
  facebook_domain_verification: string;
  // SEO — analytics
  ga4_measurement_id: string;
  gtm_container_id: string;
  meta_pixel_id: string;
  hotjar_id: string;
  microsoft_clarity_id: string;
  tiktok_pixel_id: string;
  // SEO — structured data + sitemap + robots
  organization_schema_json: string;
  sitemap_enabled: boolean;
  sitemap_changefreq:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  sitemap_priority_product: string;
  sitemap_priority_category: string;
  robots_txt_override: string;
  // Social
  facebook_url: string;
  instagram_url: string;
  youtube_url: string;
  whatsapp_number: string;
  // Notifications
  notify_order_placed: boolean;
  notify_order_paid: boolean;
  notify_order_shipped: boolean;
  notify_order_delivered: boolean;
  notify_low_stock: boolean;
  notification_from_name: string;
  notification_reply_to: string;
  // Maintenance
  maintenance_mode: boolean;
  maintenance_message: string;
  // Meta
  updated_at: string;
  updated_by: string | null;
}

export type SiteSettingsUpdateInput = Partial<
  Omit<SiteSettingsShape, "id" | "updated_at" | "updated_by">
>;

// ─── SEO: redirects ─────────────────────────────────────────────────────────

export interface RedirectShape {
  id: string;
  from_path: string;
  to_path: string;
  status_code: 301 | 302;
  status_label: string;
  is_active: boolean;
  hit_count: number;
  last_hit_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RedirectInput {
  from_path: string;
  to_path: string;
  status_code?: 301 | 302;
  is_active?: boolean;
  notes?: string;
}

// ─── SEO: audit report ──────────────────────────────────────────────────────

export interface SeoAuditIssue {
  severity: "danger" | "warning" | "info";
  scope: string;
  title: string;
  detail: string;
  fix_url: string;
}

export interface SeoAuditProductRow {
  id: string;
  slug: string;
  name: string;
  length?: number;
}

export interface SeoAuditResponse {
  score: number;
  summary: Record<string, unknown>;
  issues: SeoAuditIssue[];
  counts: {
    products_total: number;
    missing_seo_title: number;
    missing_seo_description: number;
    title_too_long: number;
    description_too_long: number;
    no_images: number;
  };
  products: {
    missing_seo_title: SeoAuditProductRow[];
    missing_seo_description: SeoAuditProductRow[];
    title_too_long: SeoAuditProductRow[];
    description_too_long: SeoAuditProductRow[];
    no_images: SeoAuditProductRow[];
  };
  categories: { missing_seo_title: SeoAuditProductRow[] };
  brands: { missing_seo_title: SeoAuditProductRow[] };
  collections: { missing_seo_title: SeoAuditProductRow[] };
  redirects: {
    total: number;
    active: number;
    loops: Array<{ id: string; from_path: string }>;
  };
}

export interface PurchaseOrderLineInput {
  product?: string | null;
  product_name?: string;
  sku?: string;
  color?: string;
  size?: string;
  ordered_quantity: number;
  unit_cost: number | string;
  discount_pct?: number | string;
  tax_pct?: number | string;
  notes?: string;
}

export interface PurchaseOrderCreateInput {
  supplier: string;
  warehouse: string;
  currency?: string;
  expected_delivery_date?: string | null;
  payment_terms_days?: number;
  over_receipt_allowed?: boolean;
  discount?: number | string;
  tax?: number | string;
  shipping?: number | string;
  other_charges?: number | string;
  supplier_reference?: string;
  notes?: string;
  internal_notes?: string;
  items: PurchaseOrderLineInput[];
}

export type PurchaseOrderUpdateInput = Partial<PurchaseOrderCreateInput>;

// ─── Loyalty types ───────────────────────────────────────────────────────────

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum" | "obsidian";

export interface TierConfigShape extends Record<string, unknown> {
  id: string;
  tier: LoyaltyTier;
  tier_label: string;
  rank: number;
  minimum_lifetime_value: string;
  points_multiplier: string;
  points_per_currency: string;
  perks: string[];
  badge_color: string;
  description: string;
  is_active: boolean;
  customer_count: number;
  created_at: string;
  updated_at: string;
}

export type LoyaltyRewardType =
  | "coupon_percent"
  | "coupon_fixed"
  | "coupon_shipping";

export interface LoyaltyRewardShape extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  points_cost: number;
  reward_type: LoyaltyRewardType;
  value: string;
  max_discount: string | null;
  min_spend: string | null;
  coupon_validity_days: number;
  minimum_tier: LoyaltyTier | "";
  minimum_tier_label: string;
  inventory_limit: number | null;
  per_user_limit: number;
  is_active: boolean;
  sort_order: number;
  is_sold_out: boolean;
  total_redeemed: number;
  created_at: string;
  updated_at: string;
}

export type LoyaltyTransactionReason =
  | "order_award"
  | "order_refund_clawback"
  | "signup_bonus"
  | "birthday_bonus"
  | "referral_bonus"
  | "review_bonus"
  | "manual_credit"
  | "manual_debit"
  | "redemption"
  | "expiry"
  | "adjustment";

export interface LoyaltyTransactionShape {
  id: string;
  user: string;
  user_email: string;
  points: number;
  balance_after: number;
  reason: LoyaltyTransactionReason;
  reason_label: string;
  reference: string;
  note: string;
  actor: string | null;
  actor_email: string | null;
  expires_at: string | null;
  created_at: string;
}

export type RewardRedemptionStatus =
  | "pending"
  | "active"
  | "used"
  | "expired"
  | "revoked";

export interface RewardRedemptionShape {
  id: string;
  user: string;
  user_email: string;
  reward: string;
  reward_name: string;
  reward_image: string;
  reward_type: LoyaltyRewardType;
  points_spent: number;
  status: RewardRedemptionStatus;
  status_label: string;
  coupon_code: string;
  coupon_expires_at: string | null;
  used_at: string | null;
  used_on_order: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyMeShape {
  points: number;
  lifetime_value: string;
  currency: string;
  tier: LoyaltyTier;
  tier_label: string;
  tier_rank: number;
  next_tier: LoyaltyTier | null;
  next_tier_label: string | null;
  next_tier_threshold: string | null;
  progress_to_next: number;
  spend_to_next_tier: string | null;
  perks: string[];
  badge_color: string;
  recent_transactions: LoyaltyTransactionShape[];
  active_redemptions: RewardRedemptionShape[];
}

export interface LoyaltyDashboardResponse {
  tier_distribution: Record<string, number>;
  points_outstanding: number;
  earned_30d: number;
  spent_30d: number;
  redemptions_30d: number;
  active_rewards: number;
  top_earners: Array<{
    user_id: string;
    email: string;
    full_name: string;
    tier: LoyaltyTier;
    points: number;
    lifetime_value: string;
  }>;
}

export class DjangoApiError extends Error {
  status: number;
  fields: Record<string, string[]>;
  /** Raw JSON error body — action endpoints return structured errors
   *  (e.g. convert-to-order `{code, items[]}`). */
  body: Record<string, unknown>;
  /** Machine-readable `code` from the body, when present. */
  code?: string;
  constructor(
    message: string,
    status: number,
    fields: Record<string, string[]>,
    body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "DjangoApiError";
    this.status = status;
    this.fields = fields;
    this.body = body;
    this.code = typeof body.code === "string" ? body.code : undefined;
  }
}

// ─── Token storage ───────────────────────────────────────────────────────────

function getAccess(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}
function getRefresh(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}
/** Same-tab change signal for the session store (storage events only fire
 *  in *other* tabs). */
export const SESSION_EVENT = "jmn:admin-session";
function emitSession(): void {
  window.dispatchEvent(new Event(SESSION_EVENT));
}

function setTokens(access: string, refresh: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  emitSession();
}
function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  emitSession();
}
export function cacheUser(user: AdminUserShape): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  emitSession();
}

/**
 * External-store view of the stored session for useSyncExternalStore:
 * "" when signed out, otherwise "1|<cached user json>". A string keeps the
 * snapshot referentially stable between reads.
 */
export function sessionSnapshot(): string {
  const token = localStorage.getItem(ACCESS_KEY);
  if (!token) return "";
  return "1|" + (localStorage.getItem(USER_KEY) ?? "");
}
export function subscribeSession(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  window.addEventListener(SESSION_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(SESSION_EVENT, cb);
  };
}
export function readCachedUser(): AdminUserShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUserShape) : null;
  } catch {
    return null;
  }
}

// ─── Request helper ──────────────────────────────────────────────────────────

let refreshInflight: Promise<string | null> | null = null;

/**
 * Single-flight token refresh: parallel 401s share one POST /auth/refresh/
 * (with refresh-token rotation, a second concurrent refresh would send an
 * already-blacklisted token and log the user out).
 */
function tryRefresh(): Promise<string | null> {
  refreshInflight ??= doRefresh().finally(() => {
    refreshInflight = null;
  });
  return refreshInflight;
}

async function doRefresh(): Promise<string | null> {
  const refresh = getRefresh();
  if (!refresh) return null;
  try {
    const res = await fetch(`${API}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      // Another tab may have rotated the tokens meanwhile: keep its new pair.
      if (getRefresh() !== refresh) return getAccess();
      // Only a rejected token ends the session — not a 5xx / throttle.
      if (res.status === 400 || res.status === 401 || res.status === 403) clearTokens();
      return null;
    }
    const json = (await res.json()) as { access: string; refresh?: string };
    // Logged out (or re-logged in) while the request was in flight.
    if (getRefresh() !== refresh) return getAccess();
    if (json.refresh) setTokens(json.access, json.refresh);
    else localStorage.setItem(ACCESS_KEY, json.access);
    return json.access;
  } catch {
    return null;
  }
}

/** Nested DRF errors (`items: [{field: [msg]}]`) → "field: msg" text. */
function flattenErr(x: object): string {
  return Object.entries(x)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join("; ");
}

interface RequestInit_ extends RequestInit {
  anon?: boolean;
  /**
   * Accept-Language for the request. Defaults to "en" so translated model
   * fields (name, description, …) are always read and written as English —
   * Bangla copies are addressed explicitly via `<field>_bn`.
   */
  lang?: "en" | "bn";
  query?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T>(path: string, init: RequestInit_ = {}): Promise<T> {
  const { anon, headers: rawHeaders, query, lang = "en", ...rest } = init;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept-Language": lang,
    ...((rawHeaders as Record<string, string>) ?? {}),
  };
  if (!anon) {
    const token = getAccess();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let url = path.startsWith("http") ? path : `${API}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  let res = await fetch(url, { ...rest, headers });

  if (res.status === 401 && !anon) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${refreshed}`;
      res = await fetch(url, { ...rest, headers });
    }
  }

  if (!res.ok) {
    let body: Record<string, unknown> = {};
    try {
      body = await res.json();
    } catch {
      /* not json */
    }
    const fields: Record<string, string[]> = {};
    let detail: string | undefined;
    for (const [k, v] of Object.entries(body)) {
      if (k === "detail" && typeof v === "string") detail = v;
      else if (k === "code") continue;
      else if (Array.isArray(v))
        fields[k] = v.map((x) => (typeof x === "object" && x ? flattenErr(x) : String(x)));
      else if (typeof v === "string") fields[k] = [v];
    }
    const message =
      detail ?? Object.values(fields).flat().join("; ") ?? `Request failed (${res.status})`;
    throw new DjangoApiError(
      message || `Request failed (${res.status})`,
      res.status,
      fields,
      body,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Fetch a streaming CSV and trigger a browser download. Shared by every
 * `exportCsv()` method on the admin client — mirrors the `downloadInvoicePdf`
 * pattern (auth header, 401-refresh-retry, programmatic anchor click).
 *
 * Pass any filter params you want the export to honour — they're funneled
 * through the same query-string serialisation the JSON list endpoints use,
 * so what's on screen is what lands in the file.
 *
 * Returns the chosen filename so callers can toast / log.
 */
export async function downloadCsv(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
  filename?: string,
): Promise<string> {
  let url = path.startsWith("http") ? path : `${API}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }
  const token = getAccess();
  // Don't set Accept: text/csv — DRF's content negotiation runs before our
  // action and would 406 because no CSV renderer is registered. Our view
  // returns a `StreamingHttpResponse` with the right Content-Type anyway,
  // so a permissive Accept (`*/*` is the browser default) is what we want.
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(url, { headers });
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${refreshed}`;
      res = await fetch(url, { headers });
    }
  }
  if (!res.ok) {
    throw new Error(`Couldn't generate CSV (${res.status})`);
  }
  // The server already sets a Content-Disposition with a filename; if the
  // caller didn't override, we sniff it back so the saved file matches.
  let resolved = filename;
  if (!resolved) {
    const disp = res.headers.get("Content-Disposition") || "";
    const match = /filename="?([^"]+)"?/i.exec(disp);
    resolved = match ? match[1] : "export.csv";
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = resolved;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return resolved;
}


/**
 * Authenticated GET → Blob (private files: RFQ attachments, quotation PDFs).
 * Same 401-refresh-retry as `request()`. Returns the server's filename from
 * Content-Disposition when present.
 */
export async function fetchBlob(
  path: string,
): Promise<{ blob: Blob; filename: string | null; contentType: string }> {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const headers: Record<string, string> = {};
  const token = getAccess();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res = await fetch(url, { headers });
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${refreshed}`;
      res = await fetch(url, { headers });
    }
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { detail?: string };
      detail = body.detail ?? "";
    } catch {
      /* not json */
    }
    throw new DjangoApiError(detail || `Download failed (${res.status})`, res.status, {});
  }
  const disp = res.headers.get("Content-Disposition") || "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disp);
  return {
    blob: await res.blob(),
    filename: match ? decodeURIComponent(match[1]) : null,
    contentType: res.headers.get("Content-Type") || "application/octet-stream",
  };
}

/** Save a Blob to disk via a temporary object URL. */
export function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** Multipart POST with auth + refresh-retry; parses JSON on success AND on
 *  4xx when `acceptErrorBody` (import dry-run returns its report with 400). */
async function postMultipart<T>(
  path: string,
  fd: FormData,
  query?: Record<string, string>,
  acceptErrorBody = false,
): Promise<T> {
  let url = `${API}${path}`;
  if (query) url += "?" + new URLSearchParams(query).toString();
  const headers: Record<string, string> = {};
  const token = getAccess();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res = await fetch(url, { method: "POST", body: fd, headers });
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${refreshed}`;
      res = await fetch(url, { method: "POST", body: fd, headers });
    }
  }
  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    /* not json */
  }
  if (res.ok || (acceptErrorBody && res.status === 400 && "total_rows" in body)) {
    return body as T;
  }
  throw new DjangoApiError(
    (body.detail as string) || `Request failed (${res.status})`,
    res.status,
    {},
  );
}

// ─── Standard machine catalog (seed + suggestions) ───────────────────────────

export interface MachineCatalogSuggestions {
  machine_brands: Array<{
    name: string; slug: string; country: string; is_featured: boolean;
    model_count: number; exists: boolean;
  }>;
  machine_models: Array<{
    brand_name: string; brand_slug: string; name: string; slug: string;
    machine_type: string; exists: boolean;
  }>;
  parts_brands: Array<{
    name: string; slug: string; is_oem: boolean; machine_brand_names: string[];
    description: string; exists: boolean;
  }>;
}

export interface MachineCatalogSeedResult {
  dry_run: boolean;
  summary: string;
  stats: Record<
    | "machine_brands_created" | "machine_brands_existing"
    | "machine_models_created" | "machine_models_existing"
    | "parts_brands_created" | "parts_brands_existing"
    | "fields_filled" | "skipped",
    number
  >;
  rows: Array<{
    kind: "machine brand" | "machine model" | "parts brand";
    action: "create" | "keep" | "fill" | "skip";
    slug: string; name: string; note: string;
  }>;
}

export interface CategorySeedResult {
  dry_run: boolean;
  summary: string;
  /** Command output lines, e.g. "create  needles — Needles / নিডল (সুই)". */
  rows: string[];
}

// ─── Resource helpers ────────────────────────────────────────────────────────

function crud<T = unknown>(base: string, idField: "slug" | "id" = "slug") {
  return {
    list: <R = PaginatedResponse<T>>(query?: Record<string, unknown>) =>
      request<R>(base, { query: query as Record<string, string | number | boolean | undefined | null> }),
    get: (key: string) => request<T>(`${base}${key}/`),
    create: (data: Partial<T>) =>
      request<T>(base, { method: "POST", body: JSON.stringify(data) }),
    update: (key: string, data: Partial<T>) =>
      request<T>(`${base}${key}/`, { method: "PATCH", body: JSON.stringify(data) }),
    replace: (key: string, data: Partial<T>) =>
      request<T>(`${base}${key}/`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (key: string) =>
      request<void>(`${base}${key}/`, { method: "DELETE" }),
    _idField: idField,
  };
}

/**
 * Fetch every page of a paginated list (follows `next`, max 40 pages) and
 * return it in the paginated envelope so callers that unwrap `.results`
 * keep working. Admin screens list catalogue tables client-side.
 */
async function listAllPages<T>(
  base: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): Promise<PaginatedResponse<T>> {
  const first = await request<PaginatedResponse<T> | T[]>(base, { query });
  if (Array.isArray(first)) {
    return { count: first.length, next: null, previous: null, results: first };
  }
  const results = [...first.results];
  let next = first.next;
  for (let i = 0; next && i < 40; i++) {
    const page: PaginatedResponse<T> = await request<PaginatedResponse<T>>(next);
    results.push(...page.results);
    next = page.next;
  }
  return { count: first.count, next: null, previous: null, results };
}

/** crud() for catalogue tables: list = all pages, inactive rows included. */
function catalogCrud<T = unknown>(base: string) {
  const c = crud<T>(base, "slug");
  return {
    ...c,
    list: <R = PaginatedResponse<T>>(query?: Record<string, unknown>) =>
      listAllPages<T>(base, {
        include_inactive: 1,
        page_size: 200,
        ...(query as Record<string, string | number | boolean | undefined | null>),
      }) as unknown as Promise<R>,
  };
}

// ─── Public client ───────────────────────────────────────────────────────────

export const djangoAdmin = {
  hasSession(): boolean {
    return typeof window !== "undefined" && !!localStorage.getItem(ACCESS_KEY);
  },

  async login(email: string, password: string): Promise<AdminUserShape> {
    const res = await request<AuthResponse>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      anon: true,
    });
    const user = res.user;
    const isAdmin =
      user.is_staff ||
      user.is_superuser ||
      user.account_type === "staff" ||
      user.roles?.some((r) => isAdminRole(r.code));
    if (!isAdmin) {
      throw new DjangoApiError(
        "This account does not have admin access.",
        403,
        {},
      );
    }
    setTokens(res.access, res.refresh);
    cacheUser(user);
    return user;
  },

  async me(): Promise<AdminUserShape> {
    const user = await request<AdminUserShape>("/auth/me/");
    cacheUser(user);
    return user;
  },

  async logout(): Promise<void> {
    // Clear locally first so the UI signs out immediately, then blacklist
    // the refresh token server-side with the captured credentials.
    const refresh = getRefresh();
    const access = getAccess();
    clearTokens();
    if (refresh) {
      try {
        await request("/auth/logout/", {
          method: "POST",
          body: JSON.stringify({ refresh }),
          anon: true,
          headers: access ? { Authorization: `Bearer ${access}` } : undefined,
        });
      } catch {
        /* already signed out locally */
      }
    }
  },

  // ── Storefront resources (admin gets all statuses)
  products: {
    ...crud("/site/products/", "slug"),
    list: (query?: {
      search?: string;
      status?: string;
      gender?: string;
      "category__slug"?: string;
      "brand__slug"?: string;
      "machine_brands__slug"?: string;
      ordering?: string;
      page?: number;
      page_size?: number;
    }) => request<PaginatedResponse<unknown>>("/site/products/", { query }),
    exportCsv: (query?: {
      search?: string;
      status?: string;
      gender?: string;
      "category__slug"?: string;
      "brand__slug"?: string;
      ordering?: string;
    }) =>
      downloadCsv(
        "/site/products/export.csv/",
        query as Record<string, string | number | boolean | undefined | null> | undefined,
      ),
    /** Detail read in one language (Bangla falls back to English server-side). */
    getLocalized: (slug: string, lang: "en" | "bn") =>
      request<Record<string, unknown>>(`/site/products/${slug}/`, { lang }),
    /** Apply one change to up to 500 products by slug. */
    bulkUpdate: (slugs: string[], set: ProductBulkSet) =>
      request<ProductBulkResult>("/site/products/bulk-update/", {
        method: "POST",
        body: JSON.stringify({ slugs, set }),
      }),
    /** CSV/XLSX upsert by SKU. dryRun validates only; a real run is
     *  all-or-nothing (row errors → 400 with the same report, nothing written). */
    importFile: (file: File, dryRun: boolean) => {
      const fd = new FormData();
      fd.append("file", file);
      return postMultipart<ProductImportResult>(
        "/site/products/import/",
        fd,
        dryRun ? { dry_run: "1" } : undefined,
        true,
      );
    },
    downloadImportTemplate: () =>
      downloadCsv("/site/products/import-template.csv/", undefined, "parts-import-template.csv"),
    exportImportLayout: () =>
      downloadCsv("/site/products/export.csv/", { layout: "import" }, "parts-export.csv"),
  },
  categories: {
    ...catalogCrud("/site/categories/"),
    /** Standard parts + devices categories; `dryRun` previews, nothing is overwritten. */
    seedStandard: (dryRun: boolean) =>
      request<CategorySeedResult>("/site/categories/seed-standard/", {
        method: "POST",
        body: JSON.stringify({ dry_run: dryRun }),
      }),
  },
  brands: catalogCrud("/site/brands/"),
  machineBrands: {
    ...catalogCrud("/site/machine-brands/"),
    /** Known brand / model / parts-brand names for the admin pickers. */
    catalogSuggestions: () =>
      request<MachineCatalogSuggestions>("/site/machine-brands/catalog-suggestions/"),
    /** Load the standard brands, models and parts brands. `dryRun` previews;
     *  existing rows are never renamed — only blank fields are filled. */
    seedStandard: (dryRun: boolean) =>
      request<MachineCatalogSeedResult>("/site/machine-brands/seed-standard/", {
        method: "POST",
        body: JSON.stringify({ dry_run: dryRun }),
      }),
  },
  machineModels: {
    ...crud("/site/machine-models/", "slug"),
    list: (machineBrandSlug?: string) =>
      listAllPages<unknown>("/site/machine-models/", {
        include_inactive: 1,
        page_size: 200,
        "machine_brand__slug": machineBrandSlug || undefined,
      }),
  },
  collections: crud("/site/collections/", "slug"),
  lookbooks: crud("/site/lookbooks/", "slug"),
  reviews: {
    list: (query?: { product?: string; rating?: number; ordering?: string }) =>
      request<PaginatedResponse<unknown>>("/site/reviews/", { query }),
    get: (id: string) => request("/site/reviews/" + id + "/"),
    delete: (id: string) =>
      request<void>("/site/reviews/" + id + "/", { method: "DELETE" }),
  },
  faqs: crud("/site/faqs/", "id"),
  testimonials: crud("/site/testimonials/", "id"),
  homeBlocks: crud("/site/home-blocks/", "id"),
  home: {
    /**
     * Public-facing aggregated homepage shape — heroes, marquee, manifesto,
     * etc. grouped by `kind`. Same endpoint the storefront uses, exposed here
     * for admin previews / sanity checks.
     */
    get: () => request<HomePagePayload>("/site/home/"),
  },
  contact: {
    list: (query?: { status?: string; search?: string }) =>
      request<PaginatedResponse<unknown>>("/site/contact/", { query }),
    update: (id: string, data: Record<string, unknown>) =>
      request("/site/contact/" + id + "/", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
  newsletter: {
    list: () => request<PaginatedResponse<unknown>>("/site/newsletter/"),
  },

  // ── Inventory resources
  orders: {
    list: (query?: {
      status?: string;
      payment_status?: string;
      search?: string;
      ordering?: string;
      page?: number;
    }) => request<PaginatedResponse<unknown>>("/inventory/orders/", { query }),
    get: (id: string) => request("/inventory/orders/" + id + "/"),
    updateStatus: (id: string, status: string, note?: string) =>
      request("/inventory/orders/" + id + "/update_status/", {
        method: "POST",
        body: JSON.stringify({ status, note }),
      }),
    markPaid: (id: string, paymentReference?: string) =>
      request("/inventory/orders/" + id + "/mark_paid/", {
        method: "POST",
        body: JSON.stringify({ payment_reference: paymentReference }),
      }),
    /**
     * Owner-driven order creation. Used when staff take an order on behalf
     * of a customer (in-store, phone, B2B).
     */
    create: (payload: {
      user?: string | null;
      customer_email: string;
      customer_phone?: string;
      shipping_address: Record<string, unknown>;
      billing_address?: Record<string, unknown>;
      payment_method: string;
      payment_status?: string;
      coupon_code?: string;
      notes?: string;
      internal_notes?: string;
      currency?: string;
      shipping_override?: number | null;
      tax_override?: number | null;
      items: Array<{
        product: string;
        color: string;
        size: string;
        quantity: number;
        unit_price_override?: number | null;
      }>;
    }) =>
      request("/inventory/admin-orders/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    /**
     * Fetch the printable order invoice / delivery slip as a PDF and trigger
     * a browser download. Mirrors purchaseOrders.downloadInvoicePdf — same
     * blob-URL trick because the generic `request` helper assumes JSON.
     */
    downloadInvoicePdf: async (
      id: string,
      orderNumber?: string,
    ): Promise<string> => {
      const url = `${API}/inventory/orders/${id}/invoice-pdf/`;
      const token = getAccess();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      let res = await fetch(url, { headers });
      if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
          headers["Authorization"] = `Bearer ${refreshed}`;
          res = await fetch(url, { headers });
        }
      }
      if (!res.ok) {
        throw new Error(`Couldn't generate invoice PDF (${res.status})`);
      }
      const blob = await res.blob();
      const filename = `order-${orderNumber ?? id}.pdf`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return filename;
    },
    /**
     * Download the current order list as a CSV. `query` honours the same
     * filter / search / ordering params the JSON list endpoint takes, so
     * what's on screen is what lands in the file.
     */
    exportCsv: (query?: {
      status?: string;
      payment_status?: string;
      search?: string;
      ordering?: string;
    }) =>
      downloadCsv(
        "/inventory/orders/export.csv/",
        query as Record<string, string | number | boolean | undefined | null> | undefined,
      ),
  },
  shipments: crud("/inventory/shipments/", "id"),
  refunds: crud("/inventory/refunds/", "id"),
  warehouses: crud("/inventory/warehouses/", "id"),
  stockLevels: {
    list: (query?: { product?: string; warehouse?: string; search?: string }) =>
      request<PaginatedResponse<unknown>>("/inventory/stock-levels/", { query }),
    update: (id: string, data: Record<string, unknown>) =>
      request("/inventory/stock-levels/" + id + "/", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    exportCsv: (query?: {
      product?: string;
      warehouse?: string;
      search?: string;
    }) =>
      downloadCsv(
        "/inventory/stock-levels/export.csv/",
        query as Record<string, string | number | boolean | undefined | null> | undefined,
      ),
  },
  coupons: crud("/inventory/coupons/", "id"),

  // ── Purchasing
  suppliers: crud<SupplierShape>("/inventory/suppliers/", "id"),

  purchaseOrders: {
    list: (query?: {
      status?: string;
      supplier?: string;
      warehouse?: string;
      payment_status?: PurchasePaymentStatus;
      search?: string;
      ordering?: string;
      page?: number;
      page_size?: number;
    }) =>
      request<PaginatedResponse<PurchaseOrderListShape>>(
        "/inventory/purchase-orders/",
        { query },
      ),
    get: (id: string) =>
      request<PurchaseOrderShape>("/inventory/purchase-orders/" + id + "/"),
    create: (payload: PurchaseOrderCreateInput) =>
      request<PurchaseOrderShape>("/inventory/purchase-orders/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: PurchaseOrderUpdateInput) =>
      request<PurchaseOrderShape>("/inventory/purchase-orders/" + id + "/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<void>("/inventory/purchase-orders/" + id + "/", {
        method: "DELETE",
      }),
    submit: (id: string) =>
      request<PurchaseOrderShape>(
        "/inventory/purchase-orders/" + id + "/submit/",
        { method: "POST" },
      ),
    approve: (id: string) =>
      request<PurchaseOrderShape>(
        "/inventory/purchase-orders/" + id + "/approve/",
        { method: "POST" },
      ),
    placeOrder: (id: string) =>
      request<PurchaseOrderShape>(
        "/inventory/purchase-orders/" + id + "/place-order/",
        { method: "POST" },
      ),
    cancel: (id: string, reason?: string) =>
      request<PurchaseOrderShape>(
        "/inventory/purchase-orders/" + id + "/cancel/",
        { method: "POST", body: JSON.stringify({ reason: reason ?? "" }) },
      ),
    close: (id: string) =>
      request<PurchaseOrderShape>(
        "/inventory/purchase-orders/" + id + "/close/",
        { method: "POST" },
      ),
    /**
     * Receive goods against the PO. Creates a draft GoodsReceipt internally
     * and posts it in the same request — stock goes up, PO advances to
     * partial-received or received depending on totals.
     */
    receive: (
      id: string,
      payload: {
        warehouse?: string;
        supplier_packing_slip?: string;
        notes?: string;
        items: Array<{
          purchase_order_item: string;
          quantity_received: number;
          unit_cost_snapshot?: number;
          notes?: string;
        }>;
      },
    ) =>
      request<PurchaseOrderShape>(
        "/inventory/purchase-orders/" + id + "/receive/",
        { method: "POST", body: JSON.stringify(payload) },
      ),
    /**
     * Cash-and-carry: create + receive + pay in one transaction. Stock is
     * committed exactly the way a goods receipt commits it.
     */
    directPurchase: (payload: DirectPurchaseInput) =>
      request<PurchaseOrderShape>(
        "/inventory/purchase-orders/direct/",
        { method: "POST", body: JSON.stringify(payload) },
      ),
    /** Record a payment against an existing PO. */
    pay: (id: string, payload: PurchasePaymentInput) =>
      request<PurchaseOrderShape>(
        "/inventory/purchase-orders/" + id + "/pay/",
        { method: "POST", body: JSON.stringify(payload) },
      ),
    /**
     * Invoice list — same shape as `list` but excludes draft + cancelled POs
     * and supports a synthetic `overdue=1` filter.
     */
    invoices: (query?: {
      supplier?: string;
      warehouse?: string;
      payment_status?: PurchasePaymentStatus;
      overdue?: "1" | "true";
      search?: string;
      ordering?: string;
      page?: number;
      page_size?: number;
    }) =>
      request<PaginatedResponse<PurchaseOrderListShape>>(
        "/inventory/purchase-orders/invoices/",
        { query },
      ),
    /** Per-supplier outstanding totals, for the invoices page summary strip. */
    supplierDues: () =>
      request<SupplierDueShape[]>(
        "/inventory/purchase-orders/supplier-dues/",
      ),
    exportCsv: (query?: {
      status?: string;
      supplier?: string;
      warehouse?: string;
      payment_status?: PurchasePaymentStatus;
      search?: string;
      ordering?: string;
    }) =>
      downloadCsv(
        "/inventory/purchase-orders/export.csv/",
        query as Record<string, string | number | boolean | undefined | null> | undefined,
      ),
    /**
     * Fetch the printable invoice PDF and trigger a browser download. Returns
     * the filename so callers can toast / log. Uses fetch directly because the
     * generic `request` helper assumes JSON; here we want a binary blob with
     * the same Authorization header.
     */
    downloadInvoicePdf: async (id: string, number?: string): Promise<string> => {
      const url = `${API}/inventory/purchase-orders/${id}/invoice-pdf/`;
      const token = getAccess();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      let res = await fetch(url, { headers });
      // One-shot refresh-and-retry, mirroring `request`.
      if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
          headers["Authorization"] = `Bearer ${refreshed}`;
          res = await fetch(url, { headers });
        }
      }
      if (!res.ok) {
        throw new Error(`Couldn't generate invoice PDF (${res.status})`);
      }
      const blob = await res.blob();
      const filename = `invoice-${number ?? id}.pdf`;
      // Programmatic <a download> click. We revoke the blob URL after the
      // click ticks so the browser has time to start the download.
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return filename;
    },
  },

  goodsReceipts: {
    list: (query?: {
      status?: string;
      purchase_order?: string;
      warehouse?: string;
      search?: string;
      ordering?: string;
      page?: number;
    }) =>
      request<PaginatedResponse<GoodsReceiptShape>>(
        "/inventory/goods-receipts/",
        { query },
      ),
    get: (id: string) =>
      request<GoodsReceiptShape>("/inventory/goods-receipts/" + id + "/"),
    post: (id: string) =>
      request<GoodsReceiptShape>(
        "/inventory/goods-receipts/" + id + "/post/",
        { method: "POST" },
      ),
    delete: (id: string) =>
      request<void>("/inventory/goods-receipts/" + id + "/", {
        method: "DELETE",
      }),
  },

  // ── Returns: sales (customer → us) ────────────────────────────────────────
  orderReturns: {
    list: (query?: {
      status?: OrderReturnStatus;
      order?: string;
      reason?: OrderReturnReason;
      search?: string;
      ordering?: string;
      page?: number;
      page_size?: number;
    }) =>
      request<PaginatedResponse<OrderReturnShape>>(
        "/inventory/order-returns/",
        { query },
      ),
    get: (id: string) =>
      request<OrderReturnShape>("/inventory/order-returns/" + id + "/"),
    create: (payload: OrderReturnCreateInput) =>
      request<OrderReturnShape>("/inventory/order-returns/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    approve: (id: string) =>
      request<OrderReturnShape>(
        "/inventory/order-returns/" + id + "/approve/",
        { method: "POST" },
      ),
    reject: (id: string, note?: string) =>
      request<OrderReturnShape>(
        "/inventory/order-returns/" + id + "/reject/",
        { method: "POST", body: JSON.stringify({ note: note ?? "" }) },
      ),
    receive: (id: string) =>
      request<OrderReturnShape>(
        "/inventory/order-returns/" + id + "/receive/",
        { method: "POST" },
      ),
    refund: (id: string, payload: RefundInput) =>
      request<OrderReturnShape>(
        "/inventory/order-returns/" + id + "/refund/",
        { method: "POST", body: JSON.stringify(payload) },
      ),
    exportCsv: (query?: {
      status?: OrderReturnStatus;
      order?: string;
      reason?: OrderReturnReason;
      search?: string;
      ordering?: string;
    }) =>
      downloadCsv(
        "/inventory/order-returns/export.csv/",
        query as Record<string, string | number | boolean | undefined | null> | undefined,
      ),
  },

  // ── Returns: purchase (us → supplier) ─────────────────────────────────────
  purchaseReturns: {
    list: (query?: {
      status?: PurchaseReturnStatus;
      purchase_order?: string;
      reason?: PurchaseReturnReason;
      search?: string;
      ordering?: string;
      page?: number;
      page_size?: number;
    }) =>
      request<PaginatedResponse<PurchaseReturnShape>>(
        "/inventory/purchase-returns/",
        { query },
      ),
    get: (id: string) =>
      request<PurchaseReturnShape>("/inventory/purchase-returns/" + id + "/"),
    create: (payload: PurchaseReturnCreateInput) =>
      request<PurchaseReturnShape>("/inventory/purchase-returns/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    post: (id: string) =>
      request<PurchaseReturnShape>(
        "/inventory/purchase-returns/" + id + "/post/",
        { method: "POST" },
      ),
    refund: (id: string, payload: RefundInput) =>
      request<PurchaseReturnShape>(
        "/inventory/purchase-returns/" + id + "/refund/",
        { method: "POST", body: JSON.stringify(payload) },
      ),
    cancel: (id: string) =>
      request<PurchaseReturnShape>(
        "/inventory/purchase-returns/" + id + "/cancel/",
        { method: "POST" },
      ),
    exportCsv: (query?: {
      status?: PurchaseReturnStatus;
      purchase_order?: string;
      reason?: PurchaseReturnReason;
      search?: string;
      ordering?: string;
    }) =>
      downloadCsv(
        "/inventory/purchase-returns/export.csv/",
        query as Record<string, string | number | boolean | undefined | null> | undefined,
      ),
  },

  // ── Media uploads (multipart) — used by image inputs in the form
  uploads: {
    async create(
      file: File,
    ): Promise<{ url: string; path: string; name: string; size: number }> {
      const fd = new FormData();
      fd.append("file", file);
      const endpoint = `${API}/site/uploads/`;
      const headers: Record<string, string> = {};
      const token =
        typeof window !== "undefined" ? localStorage.getItem(ACCESS_KEY) : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let res = await fetch(endpoint, { method: "POST", body: fd, headers });

      // Single retry after a token refresh — mirrors `request()`.
      if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
          headers["Authorization"] = `Bearer ${refreshed}`;
          res = await fetch(endpoint, { method: "POST", body: fd, headers });
        }
      }

      if (!res.ok) {
        let body: Record<string, unknown> = {};
        try {
          body = await res.json();
        } catch {
          /* not json */
        }
        const msg = (body.detail as string) || `Upload failed (${res.status})`;
        throw new DjangoApiError(msg, res.status, {});
      }
      return res.json();
    },
  },

  // ── User management (auth_app)
  users: {
    list: (query?: {
      account_type?: string;
      account_status?: string;
      organization?: string;
      search?: string;
      ordering?: string;
      page?: number;
    }) => request<PaginatedResponse<AdminUserShape>>("/auth/users/", { query }),
    get: (id: string) => request<AdminUserShape>("/auth/users/" + id + "/"),
    lock: (id: string) =>
      request("/auth/users/" + id + "/lock/", { method: "POST" }),
    unlock: (id: string) =>
      request("/auth/users/" + id + "/unlock/", { method: "POST" }),
    suspend: (id: string) =>
      request("/auth/users/" + id + "/suspend/", { method: "POST" }),
    reactivate: (id: string) =>
      request("/auth/users/" + id + "/reactivate/", { method: "POST" }),
    forcePasswordReset: (id: string) =>
      request("/auth/users/" + id + "/force-password-reset/", { method: "POST" }),
    exportCsv: (query?: {
      account_type?: string;
      account_status?: string;
      organization?: string;
      search?: string;
      ordering?: string;
    }) =>
      downloadCsv(
        "/auth/users/export.csv/",
        query as Record<string, string | number | boolean | undefined | null> | undefined,
      ),
  },

  // ── RBAC
  roles: {
    ...crud<RoleShape>("/auth/roles/", "id"),
    list: (query?: { search?: string; ordering?: string; page?: number }) =>
      request<PaginatedResponse<RoleShape>>("/auth/roles/", {
        query: query as Record<string, string | number | boolean | undefined | null> | undefined,
      }),
  },
  permissions: {
    list: () =>
      request<PaginatedResponse<PermissionShape>>("/auth/permissions/"),
    /**
     * Permissions bucketed by module — the shape the role-form drawer needs
     * to render checkbox sections. Saves the frontend grouping a flat list
     * itself and lets us label modules with friendly names from the catalog.
     */
    grouped: () =>
      request<PermissionGroupShape[]>("/auth/permissions/grouped/"),
  },
  roleAssignments: {
    list: (query?: { user?: string; role?: string }) =>
      request<PaginatedResponse<unknown>>("/auth/role-assignments/", { query }),
    create: (data: Record<string, unknown>) =>
      request("/auth/role-assignments/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>("/auth/role-assignments/" + id + "/", { method: "DELETE" }),
  },

  // ── Tenancy
  organizations: crud("/auth/organizations/", "id"),
  stores: crud("/auth/stores/", "id"),
  departments: crud("/auth/departments/", "id"),

  // ── Audit
  auditLog: {
    list: (query?: { event?: string; target_user?: string; actor?: string }) =>
      request<PaginatedResponse<unknown>>("/auth/audit-log/", { query }),
  },
  loginAttempts: {
    list: (query?: { search?: string }) =>
      request<PaginatedResponse<unknown>>("/auth/login-attempts/", { query }),
  },

  // ── Quotes (RFQ) — the primary sales flow (QUOTE-FIRST)
  rfq: {
    list: (query?: {
      status?: string;
      preferred_contact?: string;
      customer?: string;
      search?: string;
      ordering?: string;
      page?: number;
      page_size?: number;
    }) => request<PaginatedResponse<QuoteShape>>("/site/rfq/", { query }),
    get: (id: string) => request<QuoteShape>(`/site/rfq/${id}/`),
    update: (id: string, data: QuotePatchInput) =>
      request<QuoteShape>(`/site/rfq/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    markQuoted: (id: string, data: QuoteMarkQuotedInput) =>
      request<QuoteShape>(`/site/rfq/${id}/mark-quoted/`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    convertToOrder: (id: string, data: QuoteConvertInput = {}) =>
      request<QuoteConvertResponse>(`/site/rfq/${id}/convert-to-order/`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    sendQuote: (id: string, data: QuoteSendInput = {}) =>
      request<QuoteSendResponse>(`/site/rfq/${id}/send-quote/`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    /** Quotation PDF ("DRAFT" watermark until quoted). */
    pdf: (id: string) => fetchBlob(`/site/rfq/${id}/quote-pdf/?download=1`),
    attachment: (quoteId: string, attId: string) =>
      fetchBlob(`/site/rfq/${quoteId}/attachments/${attId}/download/`),
    stats: () => request<QuoteStatsShape>("/site/rfq/stats/"),
  },

  // ── Dashboard
  dashboard: {
    stats: (days = 14) =>
      request<DashboardStatsResponse>("/inventory/dashboard/", {
        query: { days },
      }),
  },

  // ── Financials (Profit & Loss) ───────────────────────────────────────────
  financials: {
    summary: (days = 30) =>
      request<FinancialsResponse>("/inventory/financials/", {
        query: { days },
      }),
  },

  // ── Site settings (singleton) ─────────────────────────────────────────────
  siteSettings: {
    get: () => request<SiteSettingsShape>("/inventory/site-settings/", {
      // GET is public so the storefront can read theme / contact info too —
      // it still works for admin tokens.
      anon: true,
    }),
    update: (payload: SiteSettingsUpdateInput) =>
      request<SiteSettingsShape>("/inventory/site-settings/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  },

  // ── SEO audit + redirects ─────────────────────────────────────────────────
  seo: {
    audit: () => request<SeoAuditResponse>("/inventory/seo/audit/"),
  },

  redirects: {
    list: (query?: {
      is_active?: boolean;
      status_code?: 301 | 302;
      search?: string;
      ordering?: string;
      page?: number;
      page_size?: number;
    }) =>
      request<PaginatedResponse<RedirectShape>>("/inventory/redirects/", {
        query: query as Record<string, string | number | boolean | undefined | null> | undefined,
      }),
    get: (id: string) =>
      request<RedirectShape>("/inventory/redirects/" + id + "/"),
    create: (payload: RedirectInput) =>
      request<RedirectShape>("/inventory/redirects/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: Partial<RedirectInput>) =>
      request<RedirectShape>("/inventory/redirects/" + id + "/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<void>("/inventory/redirects/" + id + "/", {
        method: "DELETE",
      }),
  },

  // ── Notifications (admin inbox + broadcast) ─────────────────────────────
  notifications: {
    list: (query?: {
      event?: NotificationEventCode;
      channel?: NotificationChannelCode;
      page?: number;
      page_size?: number;
      ordering?: string;
    }) =>
      request<PaginatedResponse<NotificationShape>>("/notifications/inbox/", {
        query: query as Record<string, string | number | boolean | undefined | null> | undefined,
      }),
    get: (id: string) =>
      request<NotificationShape>("/notifications/inbox/" + id + "/"),
    markRead: (id: string) =>
      request<NotificationShape>("/notifications/inbox/" + id + "/read/", {
        method: "POST",
      }),
    markAllRead: () =>
      request<{ detail: string }>("/notifications/inbox/mark-all-read/", {
        method: "POST",
      }),
    unreadCount: () =>
      request<{ count: number }>("/notifications/inbox/unread_count/"),
    delete: (id: string) =>
      request<void>("/notifications/inbox/" + id + "/", { method: "DELETE" }),
    test: (payload: {
      event?: NotificationEventCode;
      channel?: NotificationChannelCode;
      context?: Record<string, unknown>;
    }) =>
      request<NotificationShape[]>("/notifications/test/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  // ── Loyalty ──────────────────────────────────────────────────────────────
  loyalty: {
    dashboard: () =>
      request<LoyaltyDashboardResponse>("/loyalty/admin/dashboard/"),

    customer: (userId: string) =>
      request<LoyaltyMeShape>("/loyalty/admin/customers/" + userId + "/"),

    adjust: (payload: {
      user: string;
      points: number;
      note?: string;
    }) =>
      request<LoyaltyTransactionShape>("/loyalty/admin/adjust/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    tiers: {
      list: () =>
        request<PaginatedResponse<TierConfigShape>>("/loyalty/admin/tiers/"),
      update: (id: string, data: Partial<TierConfigShape>) =>
        request<TierConfigShape>("/loyalty/admin/tiers/" + id + "/", {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
    },

    rewards: crud<LoyaltyRewardShape>("/loyalty/admin/rewards/", "id"),

    transactions: {
      list: (query?: {
        reason?: string;
        user?: string;
        search?: string;
        ordering?: string;
        page?: number;
        page_size?: number;
      }) =>
        request<PaginatedResponse<LoyaltyTransactionShape>>(
          "/loyalty/admin/transactions/",
          { query },
        ),
    },

    redemptions: {
      list: (query?: {
        status?: string;
        reward?: string;
        search?: string;
        page?: number;
      }) =>
        request<PaginatedResponse<RewardRedemptionShape>>(
          "/loyalty/admin/redemptions/",
          { query },
        ),
      revoke: (id: string) =>
        request<RewardRedemptionShape>(
          "/loyalty/admin/redemptions/" + id + "/revoke/",
          { method: "POST" },
        ),
    },
  },
};

// ─── Dashboard shape ─────────────────────────────────────────────────────────

interface KpiDelta {
  value: number;
  trend: "up" | "down" | "flat";
  label: string;
}

export interface DashboardStatsResponse {
  revenue: { current: number; currency: string; delta: KpiDelta };
  orders: { current: number; delta: KpiDelta };
  customers: { current: number; delta: KpiDelta };
  avgOrderValue: { current: number; currency: string; delta: KpiDelta };
  conversionRate: { current: number; delta: KpiDelta };
  salesByDay: Array<{ date: string; sales: number; orders: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number;
    currency: string;
    items: Array<{ id: string; productName: string; quantity: number }>;
    createdAt: string;
    updatedAt: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    slug: string;
    sku: string;
    price: number;
    currency: string;
    images: string[];
    sizes: Array<{ label: string; stock: number; inStock: boolean }>;
    rating: number;
    reviewCount: number;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    slug: string;
    sku: string;
    price: number;
    currency: string;
    images: string[];
    sizes: Array<{ label: string; stock: number; inStock: boolean }>;
    rating: number;
    reviewCount: number;
  }>;
  trafficSources: Array<{ source: string; visits: number; share: number }>;
  /** RFQ widget numbers (same as GET /site/rfq/stats/). */
  quotes?: QuoteStatsShape;
}

// ─── Financials (P&L) shape ─────────────────────────────────────────────────

/**
 * Delta object on financials KPIs is simpler than the dashboard's (no label —
 * the page hard-codes "vs prev period" because that's the only comparison).
 */
interface FinancialsKpi {
  current: number;
  previous?: number;
  delta?: { value: number; trend: "up" | "down" | "flat" };
}

export interface FinancialsProductRow {
  product: string;
  name: string;
  sku: string;
  image: string;
  units: number;
  /** Decimal strings — preserve precision; format with formatPrice. */
  revenue: string;
  cogs: string;
  profit: string;
  margin_pct: number;
}

export interface FinancialsResponse {
  period: { days: number; start: string; end: string };
  currency: string;
  kpis: {
    revenue: FinancialsKpi;
    cogs: FinancialsKpi;
    grossProfit: FinancialsKpi;
    grossMarginPct: { current: number };
    purchasingSpend: FinancialsKpi;
    netProfit: FinancialsKpi;
    paidOrders: FinancialsKpi;
    unitsSold: FinancialsKpi;
    openSupplierBalance: number;
    unknownCostLines: number;
    /** Revenue before sales returns are netted out — useful for headline display. */
    grossRevenue: FinancialsKpi;
    /** Refunds issued to customers in the window. */
    salesReturns: FinancialsKpi;
    /** Credits received from suppliers in the window. */
    purchaseReturns: FinancialsKpi;
  };
  timeseries: Array<{
    date: string;
    revenue: number;
    cogs: number;
    profit: number;
    salesReturns: number;
    purchaseReturns: number;
  }>;
  topProducts: {
    byRevenue: FinancialsProductRow[];
    byProfit: FinancialsProductRow[];
    byUnits: FinancialsProductRow[];
    losses: FinancialsProductRow[];
  };
}

// ─── Homepage block shapes ──────────────────────────────────────────────────

export type HomeBlockKind =
  | "hero"
  | "marquee"
  | "category_grid"
  | "featured_edit"
  | "manifesto"
  | "new_arrivals"
  | "lookbook_feature"
  | "best_sellers"
  | "testimonials"
  | "newsletter_cta"
  | "custom";

export interface HomeBlockShape {
  id: string;
  kind: HomeBlockKind;
  name: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  image: string;
  secondary_image: string;
  cta_label: string;
  cta_href: string;
  text_color: string;
  linked_collection: string | null;
  linked_collection_slug: string | null;
  linked_lookbook: string | null;
  linked_lookbook_slug: string | null;
  featured_products: string[];
  featured_product_ids: string[];
  featured_categories: string[];
  featured_category_ids: string[];
  is_active: boolean;
  order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HomePagePayload {
  heroes: HomeBlockShape[];
  marquee: HomeBlockShape[];
  category_grid: HomeBlockShape | null;
  featured_edit: HomeBlockShape | null;
  manifesto: HomeBlockShape | null;
  new_arrivals: HomeBlockShape | null;
  lookbook_feature: HomeBlockShape | null;
  best_sellers: HomeBlockShape | null;
  testimonials: HomeBlockShape | null;
  newsletter_cta: HomeBlockShape | null;
  custom: HomeBlockShape[];
}

// ─── Internal ────────────────────────────────────────────────────────────────

const ADMIN_ROLE_CODES = new Set([
  "super_admin",
  "platform_admin",
  "platform_support",
  "org_owner",
  "org_admin",
  "store_manager",
  "catalog_manager",
  "order_manager",
  "customer_support_lead",
]);

function isAdminRole(code: string): boolean {
  return ADMIN_ROLE_CODES.has(code);
}
