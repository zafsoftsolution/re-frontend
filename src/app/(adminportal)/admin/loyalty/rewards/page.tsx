"use client";

import {
  djangoAdmin,
  type LoyaltyRewardShape,
} from "@/lib/django-admin";
import ResourceManager, {
  type CrudClient,
} from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";

const REWARD_TYPE_LABEL: Record<string, string> = {
  coupon_percent: "Percent off",
  coupon_fixed: "Fixed off",
  coupon_shipping: "Free shipping",
};

const columns: Column<LoyaltyRewardShape>[] = [
  {
    key: "name",
    header: "Reward",
    sortable: true,
    accessor: (r) => r.name,
    render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{r.name}</p>
        <p className="text-[11px] text-ink/45 tabular">{r.slug}</p>
      </div>
    ),
  },
  {
    key: "cost",
    header: "Cost",
    sortable: true,
    align: "right",
    accessor: (r) => r.points_cost,
    render: (r) => (
      <span className="tabular text-sm text-navy">
        {r.points_cost.toLocaleString()} <span className="text-ink/45">pts</span>
      </span>
    ),
  },
  {
    key: "type",
    header: "Type",
    accessor: (r) => r.reward_type,
    render: (r) => (
      <span className="text-[11px] tracking-[0.18em] uppercase text-ink/65">
        {REWARD_TYPE_LABEL[r.reward_type] ?? r.reward_type}
      </span>
    ),
  },
  {
    key: "value",
    header: "Value",
    align: "right",
    accessor: (r) => Number(r.value),
    render: (r) => {
      if (r.reward_type === "coupon_percent") {
        return <span className="tabular text-sm">{r.value}%</span>;
      }
      if (r.reward_type === "coupon_shipping") {
        return <span className="text-[11px] text-ink/55">Free shipping</span>;
      }
      return (
        <span className="tabular text-sm text-navy">৳ {Number(r.value).toFixed(0)}</span>
      );
    },
  },
  {
    key: "tier",
    header: "Min tier",
    accessor: (r) => r.minimum_tier,
    render: (r) =>
      r.minimum_tier ? (
        <span className="text-[11px] tracking-[0.18em] uppercase text-ink/65">
          {r.minimum_tier}
        </span>
      ) : (
        <span className="text-ink/30">—</span>
      ),
  },
  {
    key: "redeemed",
    header: "Redeemed",
    sortable: true,
    align: "right",
    accessor: (r) => r.total_redeemed,
    render: (r) => (
      <span className="tabular text-sm text-ink/65">
        {r.total_redeemed}
        {r.inventory_limit != null && (
          <span className="text-ink/35"> / {r.inventory_limit}</span>
        )}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    accessor: (r) => (r.is_active ? (r.is_sold_out ? "sold_out" : "active") : "off"),
    render: (r) => {
      if (!r.is_active) {
        return (
          <span className="text-[11px] tracking-[0.18em] uppercase text-ink/45">
            Hidden
          </span>
        );
      }
      if (r.is_sold_out) {
        return (
          <span className="text-[11px] tracking-[0.18em] uppercase text-rose-700">
            Sold out
          </span>
        );
      }
      return (
        <span className="text-[11px] tracking-[0.18em] uppercase text-emerald-700">
          Live
        </span>
      );
    },
  },
];

export default function AdminLoyaltyRewards() {
  return (
    <ResourceManager<LoyaltyRewardShape>
      eyebrow="Loyalty"
      title="Rewards"
      singular="reward"
      description="Catalog of redeemable items. Each redemption mints a single-use coupon scoped to the customer."
      client={
        djangoAdmin.loyalty.rewards as unknown as CrudClient<LoyaltyRewardShape>
      }
      rowKey={(r) => r.id}
      rowLabel={(r) => r.name}
      columns={columns}
      searchPlaceholder="Search rewards…"
      searchAccessor={(r) => `${r.name} ${r.slug} ${r.description}`}
      pageSize={20}
      tabs={[
        { key: "all", label: "All", predicate: () => true },
        { key: "live", label: "Live", predicate: (r) => r.is_active && !r.is_sold_out },
        { key: "hidden", label: "Hidden", predicate: (r) => !r.is_active },
        { key: "sold_out", label: "Sold out", predicate: (r) => r.is_sold_out },
      ]}
      initialValues={{
        is_active: true,
        sort_order: 0,
        per_user_limit: 1,
        coupon_validity_days: 30,
        reward_type: "coupon_fixed",
        value: "0",
      }}
      fields={[
        { name: "name", label: "Display name", type: "text", required: true },
        {
          name: "slug",
          label: "Slug",
          type: "slug",
          required: true,
          autoFrom: "name",
          hint: "Used internally — keep short, lowercase",
        },
        { name: "description", label: "Description", type: "textarea", full: true },
        { name: "image", label: "Image URL", type: "imageUrl", full: true },
        {
          name: "points_cost",
          label: "Points cost",
          type: "number",
          required: true,
          hint: "Points the customer must spend",
        },
        {
          name: "reward_type",
          label: "Reward type",
          type: "select",
          required: true,
          options: [
            { value: "coupon_percent", label: "Percent-off coupon" },
            { value: "coupon_fixed", label: "Fixed-amount coupon" },
            { value: "coupon_shipping", label: "Free-shipping coupon" },
          ],
        },
        {
          name: "value",
          label: "Value",
          type: "number",
          hint: "Percent (0–100) or currency amount; leave 0 for shipping",
        },
        { name: "max_discount", label: "Max discount", type: "number", hint: "Cap on percent-off" },
        { name: "min_spend", label: "Min cart spend", type: "number" },
        {
          name: "coupon_validity_days",
          label: "Coupon validity (days)",
          type: "number",
          required: true,
        },
        {
          name: "minimum_tier",
          label: "Minimum tier",
          type: "select",
          options: [
            { value: "", label: "Any tier" },
            { value: "bronze", label: "Bronze" },
            { value: "silver", label: "Silver" },
            { value: "gold", label: "Gold" },
            { value: "platinum", label: "Platinum" },
            { value: "obsidian", label: "Obsidian" },
          ],
        },
        {
          name: "inventory_limit",
          label: "Inventory limit",
          type: "number",
          hint: "Total redemption cap (blank = unlimited)",
        },
        {
          name: "per_user_limit",
          label: "Per-customer limit",
          type: "number",
          required: true,
        },
        { name: "sort_order", label: "Sort order", type: "number" },
        { name: "is_active", label: "Active", type: "boolean" },
      ]}
    />
  );
}
