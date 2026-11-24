import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { space, useColors } from "@/lib/theme";
import { apptWho, kindStyle, localDate, localTime, statusTone, todayLocal, type CalItem } from "@/lib/appointments";
import { Chip, Empty, ErrorView, Icon, List, Loading, Segments, Txt } from "./ui";

/** Termin-Übersicht: die nächsten 14 Tage, nach Tagen gruppiert */
export function Agenda() {
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const [wer, setWer] = useState<"mich" | "alle">("mich");
  const { data, error, loading, reload } = useApi<{ items: CalItem[] }>(`/appointments?days=14&wer=${wer}`);
  const today = todayLocal();
  const items = data?.items ?? [];
  const days = new Map<string, CalItem[]>();
  for (const it of items) {
    const d = localDate(it.item.starts_at);
    days.set(d, [...(days.get(d) ?? []), it]);
  }

  return (
    <>
      <Segments
        value={wer}
        onChange={setWer}
        options={[
          { value: "mich", label: t.appt.mine },
          { value: "alle", label: t.appt.all },
        ]}
      />
      {loading ? (
        <Loading />
      ) : error && !data ? (
        <ErrorView code={error} onRetry={reload} />
      ) : !items.length ? (
        <Empty text={t.appt.none} icon="calendar-clear-outline" />
      ) : (
        [...days.entries()].map(([day, list]) => (
          <View key={day} style={{ marginTop: 22, paddingHorizontal: space.page }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              {day === today ? <Chip label={t.common.today} tone="magenta" /> : null}
              <Txt v="heading">{f.weekday(day)}</Txt>
            </View>
            <List>
              {list.map((it) => {
                const termin = it.source === "termin" ? it.item : null;
                const color = termin ? kindStyle[termin.kind]?.color ?? "#64748b" : "#475569";
                const icon = termin ? kindStyle[termin.kind]?.icon ?? "calendar" : "hammer";
                const who = termin ? apptWho(termin) : it.source === "auftrag" ? it.item.who : "";
                const sub = termin ? `${t.appt.kinds[termin.kind] ?? termin.kind} · ${termin.title}` : `${t.appt.orderBadge} ${it.source === "auftrag" ? it.item.number : ""} · ${it.item.title}`;
                const off = termin?.status === "abgesagt";
                return (
                  <Pressable
                    key={`${it.source}-${it.item.id}`}
                    onPress={() => router.push(termin ? `/work/termin/${it.item.id}` : `/work/${it.item.id}`)}
                    style={({ pressed }) => ({ flexDirection: "row", gap: 12, padding: 14, opacity: pressed ? 0.6 : off ? 0.5 : 1 })}
                  >
                    <View style={{ width: 54 }}>
                      <Txt v="bodyStrong">{localTime(it.item.starts_at)}</Txt>
                      <Txt v="caption" color={c.text3}>{localTime(it.item.ends_at)}</Txt>
                    </View>
                    <View style={{ width: 4, borderRadius: 2, backgroundColor: color }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Icon name={icon} size={15} color={color} />
                        <Txt v="bodyStrong" lines={1} style={{ flex: 1, textDecorationLine: off ? "line-through" : "none" }}>{who}</Txt>
                      </View>
                      <Txt v="meta" lines={1}>{sub}</Txt>
                      {termin?.location ? (
                        <Txt v="caption" color={c.text3} lines={1}>📍 {termin.location}</Txt>
                      ) : null}
                      {termin?.agenda ? (
                        <Txt v="caption" color={c.text2} lines={2}>{termin.agenda.replace(/\s+/g, " ")}</Txt>
                      ) : null}
                    </View>
                    {termin && termin.status !== "geplant" ? <Chip label={t.appt.status[termin.status]} tone={statusTone[termin.status]} /> : null}
                  </Pressable>
                );
              })}
            </List>
          </View>
        ))
      )}
    </>
  );
}
