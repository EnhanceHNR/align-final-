import re

with open("src/components/appointments/ToothChart.tsx", "r") as f:
    content = f.read()

# Remove react-native imports and replace with standard web
new_content = re.sub(r"'use dom'\n?", "", content)
new_content = re.sub(r"import\s+\{[\s\S]*?\}\s+from\s+[\"']react-native[\"'];", "", new_content)
new_content = re.sub(r"import\s+Svg,\s*\{\s*G\s*\}\s+from\s+[\"']react-native-svg[\"'];", "", new_content)
new_content = re.sub(r"import\s+\{\s*Picker\s*\}\s+from\s+[\"']@react-native-picker/picker[\"'];", "", new_content)
new_content = re.sub(r"import\s+Header\s+from\s+[\"']@/components/Header[\"'];", "", new_content)

# Replace const { width, height } = Dimensions.get("window");
new_content = re.sub(r"const\s+\{\s*width,\s*height\s*\}\s*=\s*Dimensions\.get\([\"']window[\"']\);", "", new_content)

# Component Signature to accept props
comp_target = r"const ToothChart: React\.FC = \(\) => \{"
comp_replacement = """interface ToothChartProps {
  selectedTeeth: string[];
  onToggleTooth: (toothId: string) => void;
}

const ToothChart: React.FC<ToothChartProps> = ({ selectedTeeth, onToggleTooth }) => {"""
new_content = new_content.replace(comp_target, comp_replacement)

# Refactor the click handler
handle_target = r"""  const \[selectedColor, setSelectedColor\] = useState<string>\(["']#FFFFFF["']\);\s*//.*?\n\s*const \[toothColors, setToothColors\] = useState<\{ \[key: string\]: string \}>\(\{\}\);\s*//.*?\n\s*const handleColorChange = \(color: string\) => \{\s*setSelectedColor\(color\);\s*\};\s*const handleClick = \(toothId: string\): void => \{\s*setToothColors\(\(prevColors\) => \(\{\s*\.\.\.prevColors,\s*\[toothId\]: selectedColor,\s*\}\)\);\s*\};\s*const getToothColor = \(toothId: string\): string => \{\s*return toothColors\[toothId\] \|\| ["']#FFFFFF["'];\s*\};"""

handle_replacement = """
  const handleClick = (toothId: string): void => {
    onToggleTooth(toothId);
  };

  const getToothColor = (toothId: string): string => {
    return selectedTeeth.includes(toothId) ? "#3b82f6" : "#FFFFFF"; // Blue if selected, white if not
  };
"""

new_content = re.sub(handle_target, handle_replacement, new_content, flags=re.MULTILINE)

# We need to replace all Svg tags
new_content = new_content.replace("<Svg", "<svg").replace("</Svg>", "</svg>")
new_content = new_content.replace("<G", "<g").replace("</G>", "</g>")

# Remove stylesheet
new_content = re.sub(r"const styles = StyleSheet\.create\(\{[\s\S]*?\}\);", "", new_content)

# Replace Views and Text
new_content = re.sub(r"<ScrollView[^>]*>", "<div className=\"w-full overflow-x-auto flex justify-center py-4 bg-slate-50 rounded-xl border\">", new_content)
new_content = new_content.replace("</ScrollView>", "</div>")
new_content = re.sub(r"<View[^>]*>", "<div>", new_content)
new_content = new_content.replace("</View>", "</div>")
new_content = re.sub(r"<Text[^>]*>", "<span className=\"text-sm font-medium\">", new_content)
new_content = new_content.replace("</Text>", "</span>")

# Remove Header and pickers and color selectors
new_content = re.sub(r"<Header[^>]*/>", "", new_content)
new_content = re.sub(r"<span.*?Select tooth color[\s\S]*?</div>\s*</div>", "", new_content) # Try to kill the whole picker block
new_content = re.sub(r"<div>\s*<span className=\"text-sm font-medium\">Select tooth color[\s\S]*?</select>\s*</div>\s*</div>", "", new_content)

with open("src/components/appointments/ToothChart.tsx", "w") as f:
    f.write(new_content)

print("ToothChart converted to React Web!")
