import { StyleSheet, Text, View } from "react-native";

import type { AppointmentSummary } from "@hospital/shared";

function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat("az-Latn-AZ", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateIso));
}

function statusLabel(status: AppointmentSummary["status"]) {
  switch (status) {
    case "CONFIRMED":
      return "Təsdiqlənib";
    case "PENDING":
      return "Gözləyir";
    case "COMPLETED":
      return "Tamamlanıb";
    case "CANCELED":
      return "Ləğv edilib";
    case "NO_SHOW":
      return "Gəlməyib";
    default:
      return status;
  }
}

function channelLabel(channel: string) {
  switch (channel) {
    case "web":
      return "VEB";
    case "mobile":
      return "MOBİL";
    case "call-center":
      return "ÇAĞRI MƏRKƏZİ";
    default:
      return channel.toUpperCase();
  }
}

export function AppointmentCard({ appointment }: { appointment: AppointmentSummary }) {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.doctor}>{appointment.doctorName}</Text>
        <Text style={styles.branch}>{appointment.branch}</Text>
        <Text style={styles.date}>{formatDate(appointment.startsAt)}</Text>
      </View>

      <View style={styles.badges}>
        <Text style={styles.channel}>{channelLabel(appointment.channel)}</Text>
        <Text style={[styles.status, appointment.status === "PENDING" ? styles.pending : styles.confirmed]}>
          {statusLabel(appointment.status)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffaf3",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(26, 24, 21, 0.08)"
  },
  content: {
    flexShrink: 1,
    gap: 4
  },
  doctor: {
    fontSize: 18,
    fontWeight: "700",
    color: "#161411"
  },
  branch: {
    fontSize: 14,
    color: "#0d7a68",
    fontWeight: "600"
  },
  date: {
    fontSize: 14,
    color: "#685e54"
  },
  badges: {
    alignItems: "flex-end",
    gap: 8
  },
  channel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#685e54"
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700"
  },
  confirmed: {
    backgroundColor: "#d8efe8",
    color: "#0d7a68"
  },
  pending: {
    backgroundColor: "#f7d9cc",
    color: "#ba5a31"
  }
});