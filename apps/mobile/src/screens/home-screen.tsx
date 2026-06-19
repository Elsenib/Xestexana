import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const doctors = [
  {
    id: "d1",
    name: "Prof. Dr. Kərəm Öz",
    branch: "Ortopediya",
    rating: "4.9",
    detail: "Travma sonrası sürətli reabilitasiya proqramı"
  },
  {
    id: "d2",
    name: "Dr. Banu Dəmir",
    branch: "Sinə xəstəlikləri",
    rating: "4.8",
    detail: "Ağciyər taraması və nəfəs darlığı izləmə paketi"
  },
  {
    id: "d3",
    name: "Uzm. Dr. Elif Şən",
    branch: "Qadın doğum",
    rating: "4.9",
    detail: "Gözləmə müddəti qısa, rəqəmsal nəticə paylaşımı aktiv"
  }
];

const reviews = [
  {
    id: "r1",
    text: "Qeydiyyat sürətli oldu, həkim bütün nəticələri mobil sistemə eyni gün yüklədi.",
    author: "Aysel M."
  },
  {
    id: "r2",
    text: "Canlı dəstək ilə 3 dəqiqədə doğru şöbəyə yönləndirildim, 103 düyməsi də rahat görünür.",
    author: "Rauf K."
  }
];

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Şəhər xəstəxanası mobil vitrini</Text>
          <Text style={styles.title}>Doğru həkimi tap, xəstəxana haqqında öyrən, dəstəyə bir toxunuşla çat.</Text>
          <Text style={styles.description}>
            Bu ekran yalnız pasiyent yönlü tanıtım üçündür: xəstəxana məlumatı, həkim kartları, xəstə rəyləri, canlı
            dəstək və 103 çağrı düyməsi bir yerdədir.
          </Text>

          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Canlı dəstək</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>103-ə zəng et</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoEyebrow}>Xəstəxana haqqında</Text>
          <Text style={styles.infoTitle}>24/7 təcili qəbul, rəqəmsal nəticə mərkəzi və çoxşöbəli həkim komandası</Text>
          <Text style={styles.infoText}>
            Pasiyentlər qəbul masası, laboratoriya nəticələri və klinik şöbələr arasında daha sürətli yönləndirilir.
            Mobil vitrin əsas xidmətləri sadə və aydın göstərir.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reytinqli həkimlər</Text>
          <Text style={styles.sectionHint}>Seçilmiş kartlar</Text>
        </View>

        <View style={styles.cardList}>
          {doctors.map((doctor) => (
            <View key={doctor.id} style={styles.doctorCard}>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{doctor.rating}</Text>
              </View>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.doctorBranch}>{doctor.branch}</Text>
              <Text style={styles.doctorDetail}>{doctor.detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pasiyent rəyləri</Text>
          <Text style={styles.sectionHint}>Son paylaşımlar</Text>
        </View>

        <View style={styles.cardList}>
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <Text style={styles.reviewText}>{review.text}</Text>
              <Text style={styles.reviewAuthor}>{review.author}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Hospital Platform</Text>
          <Text style={styles.footerText}>Ünvan: Mərkəzi klinik kampus • Canlı dəstək: 24/7 • Təcili xətt: 103</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#efe7dc"
  },
  container: {
    padding: 20,
    gap: 18
  },
  hero: {
    borderRadius: 30,
    padding: 24,
    gap: 14,
    backgroundColor: "#fff9f1"
  },
  eyebrow: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#daeae5",
    color: "#165f57",
    fontWeight: "700",
    overflow: "hidden"
  },
  title: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "800",
    color: "#1a1713"
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: "#675f57"
  },
  heroActions: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap"
  },
  primaryButton: {
    backgroundColor: "#1a1713",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700"
  },
  secondaryButton: {
    backgroundColor: "#dcefe9",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18
  },
  secondaryButtonText: {
    color: "#165f57",
    fontWeight: "700"
  },
  infoCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#165f57"
  },
  infoEyebrow: {
    color: "#d4efe7",
    fontSize: 13,
    fontWeight: "700"
  },
  infoTitle: {
    marginTop: 10,
    color: "#fff",
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "800"
  },
  infoText: {
    marginTop: 10,
    color: "#d4efe7",
    lineHeight: 23
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1713"
  },
  sectionHint: {
    color: "#675f57"
  },
  cardList: {
    gap: 12
  },
  doctorCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#fff9f1",
    borderWidth: 1,
    borderColor: "rgba(26, 23, 19, 0.08)",
    gap: 8
  },
  ratingBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f4d8c5"
  },
  ratingText: {
    color: "#9b4d28",
    fontWeight: "800"
  },
  doctorName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1713"
  },
  doctorBranch: {
    color: "#165f57",
    fontWeight: "700"
  },
  doctorDetail: {
    color: "#675f57",
    lineHeight: 22
  },
  reviewCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#f8efe3",
    gap: 10
  },
  reviewText: {
    color: "#1a1713",
    lineHeight: 24,
    fontSize: 15
  },
  reviewAuthor: {
    color: "#675f57",
    fontWeight: "700"
  },
  footerCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#1a1713"
  },
  footerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800"
  },
  footerText: {
    marginTop: 8,
    color: "#d6cdc3",
    lineHeight: 22
  }
});