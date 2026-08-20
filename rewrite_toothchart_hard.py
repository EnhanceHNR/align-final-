import re

with open("src/components/appointments/ToothChart.tsx", "r") as f:
    content = f.read()

# Extract the SVG part
svg_match = re.search(r"<svg.*?</svg>", content, re.DOTALL)
if not svg_match:
    print("Could not find SVG block!")
    exit(1)

svg_block = svg_match.group(0)

# Replace any lingering React Native syntax in the SVG (like onClick needs to be safe)
svg_block = svg_block.replace("onClick={()", "onClick={()")

new_file = f"""import React from "react";

interface ToothChartProps {{
  selectedTeeth: string[];
  onToggleTooth: (toothId: string) => void;
}}

export default function ToothChart({{ selectedTeeth, onToggleTooth }}: ToothChartProps) {{
  const handleClick = (toothId: string): void => {{
    onToggleTooth(toothId);
  }};

  const getToothColor = (toothId: string): string => {{
    return selectedTeeth.includes(toothId) ? "#3b82f6" : "#FFFFFF"; // Blue if selected, white if not
  }};

  return (
    <div className="w-full overflow-x-auto flex justify-center py-4 bg-slate-50 rounded-xl border">
      {svg_block}
    </div>
  );
}}
"""

with open("src/components/appointments/ToothChart.tsx", "w") as f:
    f.write(new_file)

print("Properly wrapped ToothChart!")
