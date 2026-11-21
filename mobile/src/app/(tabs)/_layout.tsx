import { NativeTabs } from "expo-router/native-tabs";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { brand } from "@/lib/theme";

export default function TabsLayout() {
  const { t } = useT();
  const { state } = useAuth();
  const unread = state.status === "ready" ? state.unread : 0;
  return (
    <NativeTabs tintColor={brand.magenta} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
        <NativeTabs.Trigger.Label>{t.tabs.home}</NativeTabs.Trigger.Label>
        {unread > 0 ? <NativeTabs.Trigger.Badge>{String(Math.min(unread, 99))}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inquiries">
        <NativeTabs.Trigger.Icon sf={{ default: "tray", selected: "tray.fill" }} md="inbox" />
        <NativeTabs.Trigger.Label>{t.tabs.inquiries}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="work">
        <NativeTabs.Trigger.Icon sf={{ default: "calendar", selected: "calendar" }} md="calendar_month" />
        <NativeTabs.Trigger.Label>{t.tabs.work}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="files">
        <NativeTabs.Trigger.Icon sf={{ default: "folder", selected: "folder.fill" }} md="folder" />
        <NativeTabs.Trigger.Label>{t.tabs.files}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon sf={{ default: "ellipsis.circle", selected: "ellipsis.circle.fill" }} md="more_horiz" />
        <NativeTabs.Trigger.Label>{t.tabs.more}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
