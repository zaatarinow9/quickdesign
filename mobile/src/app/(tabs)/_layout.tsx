import { Tabs } from "expo-router/tabs";
import { TabBar } from "@/components/tabbar";

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="inquiries" />
      <Tabs.Screen name="work" />
      <Tabs.Screen name="files" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
