"use client";

import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import { formatDate, formatPrice } from "@/lib/utils";

interface Coupon extends Record<string, unknown> {
  id: string;
  code: string;
  type: "percent" | "fixed" | "shipping";
  value: string;
  min_spend: string | null;
  max_discount: string | null;
  valid_from: string;
  valid_until: string;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  used_count: number;
  is_active: boolean;
  is_first_order_only: boolean;
  is_currently_valid: boolean;
  description: string;
}

function describe(c: Coupon): string {
  const v = Number(c.value);
  if (c.type === "percent") return `${v}% off`;
  if (c.type === "fixed") return `${formatPrice(v)} off`;
  return "Free shipping";
}

const columns: Column<Coupon>[] = [
  {
    key: "code",
    header: "Code",
    sortable: true,
    accessor: (c) => c.code,
    render: (c) => (
      <div className="min-w-0">
        <p className="font-medium text-navy tabular tracking-[0.05em]">{c.code}</p>
        {c.description && (
          <p className="text-[11px] text-ink/55 truncate">{c.description}</p>
        )}
      </div>
    ),
  },
  {
    key: "discount",
    header: "Discount",
    sortable: true,
    accessor: (c) => c.value,
    render: (c) => <span className="text-sm text-navy">{describe(c)}</span>,
  },
  {
    key: "minSpend",
    header: "Min spend",
    align: "right",
    accessor: (c) => Number(c.min_spend ?? 0),
    render: (c) =>
      c.min_spend ? (
        <span className="tabular text-sm text-ink/65">
          {formatPrice(Number(c.min_spend))}
        </span>
      ) : (
        <span className="text-ink/30">—</span>
      ),
  },
  {
    key: "validUntil",
    header: "Expires",
    sortable: true,
    accessor: (c) => c.valid_until,
    render: (c) => (
      <span className="text-sm text-ink/65">{formatDate(c.valid_until)}</span>
    ),
  },
  {
    key: "uses",
    header: "Uses",
    sortable: true,
    align: "right",
    accessor: (c) => c.used_count,
    render: (c) => (
      <span className="tabular text-sm text-ink/65">
        {c.used_count}
        {c.usage_limit ? ` / ${c.usage_limit}` : ""}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    accessor: (c) => (c.is_currently_valid ? "valid" : c.is_active ? "scheduled" : "inactive"),
    render: (c) => (
      <span
        className={`text-[11px] tracking-[0.18em] uppercase ${
          c.is_currently_valid
            ? "text-emerald-700"
            : c.is_active
            ? "text-amber-700"
            : "text-ink/45"
        }`}
      >
        {c.is_currently_valid ? "Live" : c.is_active ? "Scheduled" : "Disabled"}
      </span>
    ),
  },
];

export default function AdminCoupons() {
  return (
    <ResourceManager<Coupon>
      eyebrow="Sales"
      title="Coupons"
      singular="coupon"
      description="Discount codes — percentage, fixed amount, or free shipping."
      client={djangoAdmin.coupons as CrudClient<Coupon>}
      rowKey={(c) => c.id}
      rowLabel={(c) => c.code}
      columns={columns}
      searchPlaceholder="Search codes or descriptions…"
      searchAccessor={(c) => `${c.code} ${c.description}`}
      tabs={[
        { key: "all", label: "All", predicate: () => true },
        { key: "live", label: "Live", predicate: (c) => c.is_currently_valid },
        { key: "scheduled", label: "Scheduled", predicate: (c) => c.is_active && !c.is_currently_valid },
        { key: "disabled", label: "Disabled", predicate: (c) => !c.is_active },
      ]}
      initialValues={{ type: "percent", is_active: true, used_count: 0 }}
      fields={[
        { name: "code", label: "Code", type: "text", required: true, placeholder: "WELCOME10" },
        {
          name: "type",
          label: "Type",
          type: "select",
          required: true,
          options: [
            { value: "percent", label: "Percent off" },
            { value: "fixed", label: "Fixed amount off" },
            { value: "shipping", label: "Free shipping" },
          ],
        },
        { name: "value", label: "Value", type: "number", required: true, hint: "Percent or amount" },
        { name: "min_spend", label: "Min spend", type: "number" },
        { name: "max_discount", label: "Max discount", type: "number", hint: "Cap for percent coupons" },
        { name: "valid_from", label: "Valid from", type: "datetime", required: true },
        { name: "valid_until", label: "Valid until", type: "datetime", required: true },
        { name: "usage_limit", label: "Usage limit (total)", type: "number" },
        { name: "usage_limit_per_user", label: "Usage limit per user", type: "number" },
        { name: "is_active", label: "Active", type: "boolean" },
        { name: "is_first_order_only", label: "First order only", type: "boolean" },
        { name: "description", label: "Description", type: "textarea", full: true },
      ]}
    />
  );
}
