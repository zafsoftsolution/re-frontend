import type { Metadata } from "next";
import AccountView from "@/components/account/AccountView";

export const metadata: Metadata = {
  title: "My Account",
  description: "Profile, orders, addresses and loyalty.",
};

export default function AccountPage() {
  return <AccountView />;
}
