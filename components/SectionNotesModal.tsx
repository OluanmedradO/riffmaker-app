import { showToast } from "@/src/shared/ui/AppToast";
import { updateProject } from "@/src/data/storage/projects";
import { Project, ProjectSection } from "@/src/domain/types/project";
import { CodeBlock, MapPinPlus, TextAa, X } from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    NativeSyntheticEvent,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextInputSelectionChangeEventData,
    View
} from "react-native";
import { useTheme } from "@/src/shared/theme/ThemeProvider";

interface SectionNotesModalProps {
  isVisible: boolean;
  project?: Project;
  section?: ProjectSection;
  globalTimestampMs?: number;
  onClose: () => void;
  onRefresh?: () => void;
  onSave: (sectionId: string, updatedNotes: string, notesMode: "lyrics" | "notes", notesWrap: boolean) => void;
}

export function SectionNotesModal({
  isVisible,
  project,
  section,
  globalTimestampMs = 0,
  onClose,
  onRefresh,
  onSave,
}: SectionNotesModalProps) {
  const theme = useTheme();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"lyrics" | "notes">("notes");
  const [wrap, setWrap] = useState(true);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // Auto-save typing mechanism
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isVisible && section) {
      setText(section.notes || "");
      setMode(section.notesMode || "notes");
      setWrap(section.notesWrap !== undefined ? section.notesWrap : true);
    }
  }, [isVisible, section]);

  const triggerSave = (newText: string, newMode: "lyrics" | "notes", newWrap: boolean) => {
    if (section) {
      onSave(section.id, newText, newMode, newWrap);
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      triggerSave(val, mode, wrap);
    }, 800);
  };

  const handleSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setSelection(e.nativeEvent.selection);
  };

  const insertTextAtCursor = (insertion: string) => {
    const before = text.substring(0, selection.start);
    const after = text.substring(selection.end);
    const newText = before + insertion + after;
    
    setText(newText);
    triggerSave(newText, mode, wrap);
    
    // Attempting to move cursor forward requires refs and isn't perfectly reliable on RN without a full remount, 
    // but the text update will suffice for quick chip injections.
  };

  const formatTimestamp = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `[${mins}:${secs.toString().padStart(2, '0')}]`;
  };

  const insertTimestamp = () => {
    insertTextAtCursor(`\n${formatTimestamp(globalTimestampMs)} `);
  };

  const insertMarker = async () => {
    if (!project || !section) return;
    
    // Choose selected text, or fallback to line context if empty
    let snippetContext = "";
    if (selection.start !== selection.end) {
      snippetContext = text.substring(selection.start, selection.end);
    } else {
      // Find the line we are on
      const upToCursor = text.substring(0, selection.start);
      const afterCursor = text.substring(selection.start);
      
      const lastNewline = upToCursor.lastIndexOf('\n');
      const startOfLine = lastNewline === -1 ? 0 : lastNewline + 1;
      
      const nextNewline = afterCursor.indexOf('\n');
      const endOfLine = nextNewline === -1 ? text.length : selection.start + nextNewline;
      
      snippetContext = text.substring(startOfLine, endOfLine).trim();
    }

    if (!snippetContext) {
      snippetContext = "*Marcação vazia*";
    }

    const newMarker = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sectionId: section.id,
      timestampMs: globalTimestampMs,
      text: snippetContext
    };

    try {
      const updatedMarkers = [...(project.markers || []), newMarker];
      // Note: In a production app, this should sort the markers by timestamp for easier playback rendering.
      updatedMarkers.sort((a, b) => a.timestampMs - b.timestampMs);
      
      await updateProject(project.id, { markers: updatedMarkers });
      showToast({ type: "success", message: `Marcador salvo em ${formatTimestamp(globalTimestampMs)}` });
      
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      showToast({ type: "error", message: "Erro ao salvar marcador." });
    }
  };

  const toggleMode = () => {
    const newMode = mode === "notes" ? "lyrics" : "notes";
    setMode(newMode);
    triggerSave(text, newMode, wrap);
  };

  const toggleWrap = () => {
    const newWrap = !wrap;
    setWrap(newWrap);
    triggerSave(text, mode, newWrap);
  };

  if (!section) return null;

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.foreground }]} numberOfLines={1}>
            Notas — {section.name}
          </Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={theme.foreground} />
          </Pressable>
        </View>

        <View style={[styles.toolbar, { borderBottomColor: theme.border }]}>
          <Pressable 
            style={[styles.toolBtn, { backgroundColor: mode === "lyrics" ? theme.primary + "30" : theme.card, borderColor: mode === "lyrics" ? theme.primary : theme.border }]} 
            onPress={toggleMode}
          >
             <TextAa size={18} color={mode === "lyrics" ? theme.primary : theme.foreground} weight={mode === "lyrics" ? "bold" : "regular"} />
             <Text style={[styles.toolText, { color: mode === "lyrics" ? theme.primary : theme.foreground, fontWeight: mode === "lyrics" ? "bold" : "regular" }]}>
               Modo Letra
             </Text>
          </Pressable>

          <Pressable 
            style={[styles.toolBtn, { backgroundColor: !wrap ? theme.primary + "30" : theme.card, borderColor: !wrap ? theme.primary : theme.border }]} 
            onPress={toggleWrap}
          >
             <CodeBlock size={18} color={!wrap ? theme.primary : theme.foreground} weight={!wrap ? "bold" : "regular"} />
             <Text style={[styles.toolText, { color: !wrap ? theme.primary : theme.foreground, fontWeight: !wrap ? "bold" : "regular" }]}>
               Sem Quebra
             </Text>
          </Pressable>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={[styles.chipsContainer, { borderBottomColor: theme.border }]}
          contentContainerStyle={styles.chipsContent}
          keyboardShouldPersistTaps="always"
        >
          <Pressable style={({pressed}) => [styles.chip, { backgroundColor: theme.card, borderColor: theme.border }, pressed && {opacity: 0.7}]} onPress={() => insertTextAtCursor("\n\n[Verso]\n")}>
            <Text style={[styles.chipText, { color: theme.foreground }]}>Verso</Text>
          </Pressable>
          <Pressable style={({pressed}) => [styles.chip, { backgroundColor: theme.card, borderColor: theme.border }, pressed && {opacity: 0.7}]} onPress={() => insertTextAtCursor("\n\n[Refrão]\n")}>
            <Text style={[styles.chipText, { color: theme.foreground }]}>Refrão</Text>
          </Pressable>
          <Pressable style={({pressed}) => [styles.chip, { backgroundColor: theme.card, borderColor: theme.border }, pressed && {opacity: 0.7}]} onPress={() => insertTextAtCursor("\n\n[Ponte]\n")}>
            <Text style={[styles.chipText, { color: theme.foreground }]}>Ponte</Text>
          </Pressable>
          
          <View style={{ width: 1, height: 16, backgroundColor: theme.border, alignSelf: "center", marginHorizontal: 4 }} />
          
          <Pressable style={({pressed}) => [styles.chip, { backgroundColor: theme.card, borderColor: theme.border }, pressed && {opacity: 0.7}]} onPress={insertTimestamp}>
            <Text style={[styles.chipText, { color: theme.foreground }]}>{formatTimestamp(globalTimestampMs)}</Text>
          </Pressable>
          <Pressable style={({pressed}) => [styles.chip, { backgroundColor: theme.primary + "20", borderColor: theme.primary }, pressed && {opacity: 0.7}]} onPress={insertMarker}>
            <MapPinPlus size={14} color={theme.primary} weight="bold" />
            <Text style={[styles.chipText, { color: theme.primary, fontWeight: "bold" }]}>Marcador</Text>
          </Pressable>
        </ScrollView>

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={[
              styles.input,
              { 
                color: theme.foreground, 
                fontFamily: mode === "lyrics" ? (Platform.OS === "ios" ? "Menlo" : "monospace") : undefined,
                fontSize: mode === "lyrics" ? 15 : 16,
                lineHeight: mode === "lyrics" ? 28 : 24,
                paddingBottom: 40,
                minHeight: "100%",
                flex: 1
              }
            ]}
            value={text}
            onChangeText={handleTextChange}
            onSelectionChange={handleSelectionChange}
            placeholder="Escreva a letra ou anotações para esta parte da música..."
            placeholderTextColor={theme.muted}
            multiline
            autoFocus
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  closeBtn: {
    padding: 8,
    marginRight: -8,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  toolText: {
    fontSize: 14,
  },
  input: {
    flex: 1,
    padding: 20,
  },
  chipsContainer: {
    maxHeight: 48,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chipsContent: {
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  }
});


