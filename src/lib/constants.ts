import { OrganizationPlan } from './types';

interface PlanConfig {
    limits: {
        invoicesPerMonth: number;
        aiCreditsPerMonth: number;
        usersLimit: number;
        hasDigitalMenu: boolean;
        hasWhatsAppBot: boolean;
    };
}

export const PLAN_DEFAULTS: Record<OrganizationPlan, PlanConfig> = {
    free: {
        limits: {
            invoicesPerMonth: 20,
            aiCreditsPerMonth: 10,
            usersLimit: 1,
            hasDigitalMenu: false,
            hasWhatsAppBot: false,
        },
    },
    entrepreneur: {
        limits: {
            invoicesPerMonth: 100,
            aiCreditsPerMonth: 100,
            usersLimit: 1,
            hasDigitalMenu: true,
            hasWhatsAppBot: true,
        },
    },
    pyme: {
        limits: {
            invoicesPerMonth: 500,
            aiCreditsPerMonth: 500,
            usersLimit: 3,
            hasDigitalMenu: true,
            hasWhatsAppBot: true,
        },
    },
    enterprise: {
        limits: {
            invoicesPerMonth: 999999, // Unleashed
            aiCreditsPerMonth: 2000,
            usersLimit: 10,
            hasDigitalMenu: true,
            hasWhatsAppBot: true,
        },
    },
};
