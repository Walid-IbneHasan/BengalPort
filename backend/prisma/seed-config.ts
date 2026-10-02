export const LOCAL_ADMIN_EMAIL = "admin@bengalport.com";
export const LOCAL_ADMIN_PASSWORD = "Admin123!";

export type SeedPlan = {
  adminEmail: string;
  adminPassword: string;
  demoData: boolean;
};

// The local defaults are published in the README, so a production database
// must be given its own admin password and gets no demo records unless asked.
export function seedPlan(env: Record<string, string | undefined>): SeedPlan {
  const production = env.NODE_ENV === "production";
  const adminPassword = env.SEED_ADMIN_PASSWORD || LOCAL_ADMIN_PASSWORD;
  if (production) {
    if (adminPassword === LOCAL_ADMIN_PASSWORD)
      throw new Error(
        "Set SEED_ADMIN_PASSWORD to a private password before seeding a production database.",
      );
    if (adminPassword.length < 12)
      throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  }
  return {
    adminEmail: (env.SEED_ADMIN_EMAIL || LOCAL_ADMIN_EMAIL).toLowerCase(),
    adminPassword,
    demoData: env.SEED_DEMO_DATA === "true" || !production,
  };
}
