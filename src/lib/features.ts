import { OrganizationPlan } from "./types";

export type Feature =
    | 'smartReplenishment'
    | 'whatsappIntegration'
    | 'advancedReports';

export const PLAN_FEATURES: Record<OrganizationPlan, Feature[]> = {
    free: ['smartReplenishment'], // Unlocked for user testing/demo
    entrepreneur: ['smartReplenishment'],
    pyme: ['smartReplenishment', 'whatsappIntegration', 'advancedReports'],
    enterprise: ['smartReplenishment', 'whatsappIntegration', 'advancedReports'],
};

// [DEV] Set to true to unlock all features regardless of plan
const DEV_UNLOCK_ALL = true;

export const hasAccess = (plan: string | undefined, feature: Feature): boolean => {
    if (DEV_UNLOCK_ALL) return true;

    if (!plan) return false;
    // Normalize checking in case plan string comes in different casing or isn't exactly OrganizationPlan
    const normalizedPlan = plan.toLowerCase() as OrganizationPlan;

    const features = PLAN_FEATURES[normalizedPlan];
    if (!features) return false;

    return features.includes(feature);
};
