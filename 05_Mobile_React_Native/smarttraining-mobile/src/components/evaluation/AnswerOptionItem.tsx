import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import { Pressable,StyleSheet,Text } from "react-native";import { AnswerOption } from "../../types/evaluation";
export default function AnswerOptionItem({option,selected,onPress}:{option:AnswerOption;selected:boolean;onPress:()=>void}){
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);return <Pressable
    accessibilityRole="button"
    accessibilityLabel={option.content}
    accessibilityState={{ selected }}
    style={[styles.option,selected&&styles.selected]}
    onPress={onPress}
  ><Text style={[styles.text,selected&&styles.selectedText]}>{option.content}</Text></Pressable>}
function makeStyles(theme: ReturnType<typeof useSmartTrainingTheme>["theme"]) {
  return StyleSheet.create({option:{borderWidth:1,borderColor:theme.colors.border,borderRadius:theme.shape.controlRadius,padding:14,marginBottom:8,backgroundColor:theme.colors.surface},selected:{borderColor:theme.colors.accent,backgroundColor:theme.colors.surfaceSoft},text:{color:theme.colors.foreground,fontSize:15},selectedText:{color:theme.colors.accent,fontWeight:"800"}});
}
