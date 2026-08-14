export const ODONTOGRAM_SURFACES = [
    "TOP",
    "BOTTOM",
    "LEFT",
    "RIGHT",
    "CENTER",
] as const;


export type OdontogramSurfaceName = (typeof ODONTOGRAM_SURFACES)[number];


export const ODONTOGRAM_CONDITIONS = [
    "healthy",
    "caries",
    "filled",
    "missing",
    "bridge",
    "implant",
] as const;


export type OdontogramCondition = (typeof ODONTOGRAM_CONDITIONS)[number];


export const ODONTOGRAM_CONDITION_LABELS: Record<OdontogramCondition, string> = {
    healthy: "Healthy tooth",
    caries: "Caries",
    missing: "Missing tooth",
    filled: "Filled",
    bridge: "Bridge",
    implant: "Implant",
};


export function parseOdontogramCondition(value: string): OdontogramCondition {
    const normalized = value.toLowerCase();
    if ((ODONTOGRAM_CONDITIONS as readonly string[]).includes(normalized)) {
        return normalized as OdontogramCondition;
    }
    return "healthy";
}


export function parseOdontogramSurface(value: string): OdontogramSurfaceName | null {
    const upper = value.toUpperCase();
    if ((ODONTOGRAM_SURFACES as readonly string[]).includes(upper)) {
        return upper as OdontogramSurfaceName;
    }
    return null;
}


export function getConditionColor(condition: string): string {
    switch (condition) {
        case "caries":
            return "#ef4444";
        case "filled":
            return "#10b981";
        case "missing":
            return "#475569";
        case "bridge":
            return "#8b5cf6";
        case "implant":
            return "#f59e0b";
        default:
            return "white";
    }
}
