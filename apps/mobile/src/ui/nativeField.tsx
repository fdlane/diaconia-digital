import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

export const nativeTokens = {
  color: {
    bg: Platform.select({ ios: "#f2f2f7", android: "#f7f8fb", default: "#f6f7f9" })!,
    surface: "#ffffff",
    surfaceAlt: "#f0f4ff",
    grouped: Platform.select({ ios: "#ffffff", android: "#ffffff", default: "#ffffff" })!,
    ink: "#16202a",
    secondary: "#667085",
    tertiary: "#98a2b3",
    line: Platform.select({ ios: "#d8dde6", android: "#e1e6ef", default: "#e4e7ec" })!,
    primary: Platform.select({ ios: "#0a84ff", android: "#2f4fbd", default: "#2f4fbd" })!,
    primarySoft: Platform.select({ ios: "#e8f2ff", android: "#e9edff", default: "#e9edff" })!,
    success: "#13795b",
    successSoft: "#e8f7f1",
    warning: "#b7791f",
    warningSoft: "#fff7df",
    danger: "#c2413a",
    dangerSoft: "#fff0ef",
  },
  radius: {
    page: Platform.select({ ios: 22, android: 18, default: 18 })!,
    card: Platform.select({ ios: 16, android: 20, default: 18 })!,
    row: Platform.select({ ios: 12, android: 16, default: 14 })!,
    chip: 999,
  },
  shadow: Platform.select<ViewStyle>({
    web: { boxShadow: "0 16px 44px rgba(16, 24, 40, 0.10)" } as ViewStyle,
    ios: { shadowColor: "#101828", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 2 },
    default: {},
  })!,
};

export function platformChrome() {
  return {
    isIOS: Platform.OS === "ios",
    isAndroid: Platform.OS === "android",
    isWeb: Platform.OS === "web",
  };
}

export function Page({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.page, style]}>{children}</View>;
}

export function NativeTitle({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: ReactNode }) {
  const { isIOS } = platformChrome();
  return (
    <View style={[styles.titleRow, isIOS && styles.titleRowIOS]}>
      <View style={styles.titleCopy}>
        <Text style={[styles.title, isIOS && styles.titleIOS]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View style={styles.titleTrailing}>{trailing}</View> : null}
    </View>
  );
}

export function Section({ title, subtitle, trailing, children, compact = false }: { title?: string; subtitle?: string; trailing?: ReactNode; children: ReactNode; compact?: boolean }) {
  const { isIOS } = platformChrome();
  return (
    <View style={styles.sectionShell}>
      {title ? (
        <View style={styles.sectionHeader}>
          <View style={styles.titleCopy}>
            <Text style={[styles.sectionLabel, isIOS && styles.sectionLabelIOS]}>{title}</Text>
            {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
          </View>
          {trailing}
        </View>
      ) : null}
      <View style={[styles.section, isIOS && styles.sectionIOS, compact && styles.sectionCompact]}>{children}</View>
    </View>
  );
}

export function Row({ title, subtitle, meta, leading, trailing, onPress, danger = false }: { title: string; subtitle?: string; meta?: string; leading?: ReactNode; trailing?: ReactNode; onPress?: (() => void | Promise<void>) | undefined; danger?: boolean }) {
  const content = (
    <>
      {leading ? <View style={styles.rowLeading}>{leading}</View> : null}
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={[styles.rowTitle, danger && styles.dangerText]}>{title}</Text>
        {subtitle ? <Text numberOfLines={2} style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      {trailing ? <View style={styles.rowTrailing}>{trailing}</View> : null}
    </>
  );
  if (onPress) {
    return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{content}</Pressable>;
  }
  return <View style={styles.row}>{content}</View>;
}

export function Avatar({ label, uri, size = 44 }: { label: string; uri?: string | null; size?: number }) {
  // Keep this intentionally image-free so the shared row component has no image dependency; callers can pass Image as leading when needed.
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: Platform.OS === "ios" ? size * 0.32 : size / 2 }]}>
      <Text style={styles.avatarText}>{label}</Text>
    </View>
  );
}

export function Chip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "primary" | "success" | "warning" | "danger" }) {
  return <Text style={[styles.chip, styles[`chip_${tone}`]]}>{label}</Text>;
}

export function PillButton({ label, onPress, variant = "secondary", grow = false }: { label: string; onPress: () => void | Promise<void>; variant?: "primary" | "secondary" | "ghost" | "danger"; grow?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, styles[`button_${variant}`], grow && styles.buttonGrow, pressed && styles.pressed]}>
      <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{label}</Text>
    </Pressable>
  );
}

export function MetricTile({ value, label, tone = "primary" }: { value: string; label: string; tone?: "primary" | "success" | "warning" }) {
  return (
    <View style={[styles.metric, tone === "success" && styles.metricSuccess, tone === "warning" && styles.metricWarning]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const baseFont = Platform.select({ ios: "System", android: "Roboto", default: "system-ui" });

export const styles = StyleSheet.create({
  page: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center", backgroundColor: nativeTokens.color.bg },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingTop: Platform.OS === "ios" ? 12 : 16, paddingBottom: 8 },
  titleRowIOS: { alignItems: "flex-end", paddingTop: 8 },
  titleCopy: { flex: 1, minWidth: 0 },
  title: { color: nativeTokens.color.ink, fontFamily: baseFont, fontSize: Platform.OS === "android" ? 24 : 26, fontWeight: "800", letterSpacing: -0.45 },
  titleIOS: { fontSize: 34, fontWeight: "800", letterSpacing: -0.9 },
  subtitle: { color: nativeTokens.color.secondary, fontSize: 14, lineHeight: 20, marginTop: 2 },
  titleTrailing: { alignItems: "flex-end" },
  sectionShell: { gap: 8, paddingHorizontal: 14, marginTop: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: Platform.OS === "ios" ? 6 : 2 },
  sectionLabel: { color: nativeTokens.color.secondary, fontSize: 12, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase" },
  sectionLabelIOS: { paddingLeft: 6 },
  sectionSubtitle: { color: nativeTokens.color.tertiary, fontSize: 12, marginTop: 2 },
  section: { overflow: "hidden", borderWidth: 1, borderColor: nativeTokens.color.line, borderRadius: nativeTokens.radius.card, backgroundColor: nativeTokens.color.surface, ...nativeTokens.shadow },
  sectionIOS: { borderWidth: 0, borderRadius: 12, shadowOpacity: 0, elevation: 0 },
  sectionCompact: { borderRadius: nativeTokens.radius.row },
  row: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: nativeTokens.color.line, backgroundColor: nativeTokens.color.surface },
  rowLeading: { alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { color: nativeTokens.color.ink, fontSize: 16, fontWeight: Platform.OS === "ios" ? "500" : "700" },
  rowSubtitle: { color: nativeTokens.color.secondary, fontSize: 13, lineHeight: 18 },
  rowMeta: { color: nativeTokens.color.tertiary, fontSize: 12, fontWeight: "700" },
  rowTrailing: { alignItems: "flex-end", justifyContent: "center" },
  avatar: { alignItems: "center", justifyContent: "center", backgroundColor: nativeTokens.color.primarySoft },
  avatarText: { color: nativeTokens.color.primary, fontSize: 13, fontWeight: "800" },
  chip: { overflow: "hidden", borderRadius: nativeTokens.radius.chip, paddingHorizontal: 9, paddingVertical: 4, fontSize: 11, fontWeight: "800" },
  chip_neutral: { color: nativeTokens.color.secondary, backgroundColor: "#f2f4f7" },
  chip_primary: { color: nativeTokens.color.primary, backgroundColor: nativeTokens.color.primarySoft },
  chip_success: { color: nativeTokens.color.success, backgroundColor: nativeTokens.color.successSoft },
  chip_warning: { color: nativeTokens.color.warning, backgroundColor: nativeTokens.color.warningSoft },
  chip_danger: { color: nativeTokens.color.danger, backgroundColor: nativeTokens.color.dangerSoft },
  button: { minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: Platform.OS === "ios" ? 12 : 24, paddingHorizontal: 16, paddingVertical: 10 },
  buttonGrow: { flex: 1 },
  button_primary: { backgroundColor: nativeTokens.color.primary },
  button_secondary: { backgroundColor: nativeTokens.color.primarySoft },
  button_ghost: { backgroundColor: "transparent" },
  button_danger: { backgroundColor: nativeTokens.color.dangerSoft },
  buttonText: { fontSize: 15, fontWeight: "800" },
  buttonText_primary: { color: "white" },
  buttonText_secondary: { color: nativeTokens.color.primary },
  buttonText_ghost: { color: nativeTokens.color.primary },
  buttonText_danger: { color: nativeTokens.color.danger },
  metric: { flex: 1, gap: 3, borderRadius: nativeTokens.radius.card, padding: 14, backgroundColor: nativeTokens.color.primarySoft },
  metricSuccess: { backgroundColor: nativeTokens.color.successSoft },
  metricWarning: { backgroundColor: nativeTokens.color.warningSoft },
  metricValue: { color: nativeTokens.color.ink, fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  metricLabel: { color: nativeTokens.color.secondary, fontSize: 12, fontWeight: "700" },
  emptyState: { gap: 5, padding: 18, alignItems: "center" },
  emptyTitle: { color: nativeTokens.color.ink, fontSize: 16, fontWeight: "800" },
  emptyBody: { color: nativeTokens.color.secondary, fontSize: 13, textAlign: "center", lineHeight: 19 },
  dangerText: { color: nativeTokens.color.danger },
  pressed: { opacity: 0.68 },
});
