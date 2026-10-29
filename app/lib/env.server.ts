export const serverEnv = {
  businessApiBaseUrl: process.env.BUSINESS_API_BASE_URL ?? "",
  dynatrace: {
    url: (process.env.DYNATRACE_URL ?? "").replace(/\/+$/, ""),
    token: process.env.DYNATRACE_TOKEN ?? "",
  },
};
