import type { LegalBlock, LegalDocument } from '@eparadar/legal';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') {
    return <ThemedText style={styles.paragraph}>{block}</ThemedText>;
  }
  return (
    <View style={styles.list}>
      {block.map((item) => (
        <View key={item} style={styles.item}>
          <ThemedText style={styles.paragraph}>•</ThemedText>
          <ThemedText style={[styles.paragraph, styles.itemText]}>{item}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScreenHeader title={doc.title} />
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            Senast uppdaterad: {doc.updated}
          </ThemedText>
          {doc.intro.map((block, index) => (
            <Block key={`intro-${index}`} block={block} />
          ))}
          {doc.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <ThemedText type="subtitle">{section.heading}</ThemedText>
              {section.blocks.map((block, index) => (
                <Block key={`${section.heading}-${index}`} block={block} />
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two },
  section: { gap: Spacing.two, marginTop: Spacing.two },
  paragraph: { lineHeight: 24 },
  list: { gap: Spacing.one },
  item: { flexDirection: 'row', gap: Spacing.two },
  itemText: { flex: 1 },
});
