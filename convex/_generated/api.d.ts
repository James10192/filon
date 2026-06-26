/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as admin from "../admin.js";
import type * as agent_agent from "../agent/agent.js";
import type * as agent_gating from "../agent/gating.js";
import type * as agent_govWrites from "../agent/govWrites.js";
import type * as agent_instructions from "../agent/instructions.js";
import type * as agent_models from "../agent/models.js";
import type * as agent_mutations from "../agent/mutations.js";
import type * as agent_networkReads from "../agent/networkReads.js";
import type * as agent_orgReads from "../agent/orgReads.js";
import type * as agent_permissions from "../agent/permissions.js";
import type * as agent_queries from "../agent/queries.js";
import type * as agent_referralReads from "../agent/referralReads.js";
import type * as agent_tools_carnet from "../agent/tools/carnet.js";
import type * as agent_tools_ctx from "../agent/tools/ctx.js";
import type * as agent_tools_followups from "../agent/tools/followups.js";
import type * as agent_tools_index from "../agent/tools/index.js";
import type * as agent_tools_manifest from "../agent/tools/manifest.js";
import type * as agent_tools_network from "../agent/tools/network.js";
import type * as agent_tools_pipeline from "../agent/tools/pipeline.js";
import type * as agent_tools_proposals from "../agent/tools/proposals.js";
import type * as agent_tools_referral from "../agent/tools/referral.js";
import type * as agent_tools_shared from "../agent/tools/shared.js";
import type * as agent_tools_team from "../agent/tools/team.js";
import type * as agent_tools_veille from "../agent/tools/veille.js";
import type * as agent_veilleReads from "../agent/veilleReads.js";
import type * as aiChat from "../aiChat.js";
import type * as aiCredits from "../aiCredits.js";
import type * as aiPermissions from "../aiPermissions.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as billingLifecycle from "../billingLifecycle.js";
import type * as billingRenewal from "../billingRenewal.js";
import type * as byok from "../byok.js";
import type * as carnet from "../carnet.js";
import type * as companies from "../companies.js";
import type * as contacts from "../contacts.js";
import type * as contactsImport from "../contactsImport.js";
import type * as conversion_radar from "../conversion/radar.js";
import type * as copilot_brief from "../copilot/brief.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as documents from "../documents.js";
import type * as feedback from "../feedback.js";
import type * as followups from "../followups.js";
import type * as http from "../http.js";
import type * as lib_aiGate from "../lib/aiGate.js";
import type * as lib_credits from "../lib/credits.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_flagPriority from "../lib/flagPriority.js";
import type * as lib_paystackPlans from "../lib/paystackPlans.js";
import type * as lib_plan from "../lib/plan.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as lib_referral from "../lib/referral.js";
import type * as lib_teamMetrics from "../lib/teamMetrics.js";
import type * as lib_track from "../lib/track.js";
import type * as lib_withOrg from "../lib/withOrg.js";
import type * as lib_withUser from "../lib/withUser.js";
import type * as members from "../members.js";
import type * as mlm from "../mlm.js";
import type * as notifications from "../notifications.js";
import type * as opportunities from "../opportunities.js";
import type * as organizations from "../organizations.js";
import type * as paystack from "../paystack.js";
import type * as paystackPlans from "../paystackPlans.js";
import type * as paystackRenewal from "../paystackRenewal.js";
import type * as paystackSubscription from "../paystackSubscription.js";
import type * as paystackWebhook from "../paystackWebhook.js";
import type * as profile from "../profile.js";
import type * as proposalRecipients from "../proposalRecipients.js";
import type * as proposals from "../proposals.js";
import type * as referrals from "../referrals.js";
import type * as savedSearches from "../savedSearches.js";
import type * as search from "../search.js";
import type * as settings from "../settings.js";
import type * as suggestions from "../suggestions.js";
import type * as tags from "../tags.js";
import type * as team from "../team.js";
import type * as users from "../users.js";
import type * as veille_actions from "../veille/actions.js";
import type * as veille_ai from "../veille/ai.js";
import type * as veille_aiData from "../veille/aiData.js";
import type * as veille_connectors from "../veille/connectors.js";
import type * as veille_monitor from "../veille/monitor.js";
import type * as veille_parser from "../veille/parser.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  admin: typeof admin;
  "agent/agent": typeof agent_agent;
  "agent/gating": typeof agent_gating;
  "agent/govWrites": typeof agent_govWrites;
  "agent/instructions": typeof agent_instructions;
  "agent/models": typeof agent_models;
  "agent/mutations": typeof agent_mutations;
  "agent/networkReads": typeof agent_networkReads;
  "agent/orgReads": typeof agent_orgReads;
  "agent/permissions": typeof agent_permissions;
  "agent/queries": typeof agent_queries;
  "agent/referralReads": typeof agent_referralReads;
  "agent/tools/carnet": typeof agent_tools_carnet;
  "agent/tools/ctx": typeof agent_tools_ctx;
  "agent/tools/followups": typeof agent_tools_followups;
  "agent/tools/index": typeof agent_tools_index;
  "agent/tools/manifest": typeof agent_tools_manifest;
  "agent/tools/network": typeof agent_tools_network;
  "agent/tools/pipeline": typeof agent_tools_pipeline;
  "agent/tools/proposals": typeof agent_tools_proposals;
  "agent/tools/referral": typeof agent_tools_referral;
  "agent/tools/shared": typeof agent_tools_shared;
  "agent/tools/team": typeof agent_tools_team;
  "agent/tools/veille": typeof agent_tools_veille;
  "agent/veilleReads": typeof agent_veilleReads;
  aiChat: typeof aiChat;
  aiCredits: typeof aiCredits;
  aiPermissions: typeof aiPermissions;
  analytics: typeof analytics;
  auth: typeof auth;
  billing: typeof billing;
  billingLifecycle: typeof billingLifecycle;
  billingRenewal: typeof billingRenewal;
  byok: typeof byok;
  carnet: typeof carnet;
  companies: typeof companies;
  contacts: typeof contacts;
  contactsImport: typeof contactsImport;
  "conversion/radar": typeof conversion_radar;
  "copilot/brief": typeof copilot_brief;
  crons: typeof crons;
  dashboard: typeof dashboard;
  documents: typeof documents;
  feedback: typeof feedback;
  followups: typeof followups;
  http: typeof http;
  "lib/aiGate": typeof lib_aiGate;
  "lib/credits": typeof lib_credits;
  "lib/crypto": typeof lib_crypto;
  "lib/flagPriority": typeof lib_flagPriority;
  "lib/paystackPlans": typeof lib_paystackPlans;
  "lib/plan": typeof lib_plan;
  "lib/pricing": typeof lib_pricing;
  "lib/referral": typeof lib_referral;
  "lib/teamMetrics": typeof lib_teamMetrics;
  "lib/track": typeof lib_track;
  "lib/withOrg": typeof lib_withOrg;
  "lib/withUser": typeof lib_withUser;
  members: typeof members;
  mlm: typeof mlm;
  notifications: typeof notifications;
  opportunities: typeof opportunities;
  organizations: typeof organizations;
  paystack: typeof paystack;
  paystackPlans: typeof paystackPlans;
  paystackRenewal: typeof paystackRenewal;
  paystackSubscription: typeof paystackSubscription;
  paystackWebhook: typeof paystackWebhook;
  profile: typeof profile;
  proposalRecipients: typeof proposalRecipients;
  proposals: typeof proposals;
  referrals: typeof referrals;
  savedSearches: typeof savedSearches;
  search: typeof search;
  settings: typeof settings;
  suggestions: typeof suggestions;
  tags: typeof tags;
  team: typeof team;
  users: typeof users;
  "veille/actions": typeof veille_actions;
  "veille/ai": typeof veille_ai;
  "veille/aiData": typeof veille_aiData;
  "veille/connectors": typeof veille_connectors;
  "veille/monitor": typeof veille_monitor;
  "veille/parser": typeof veille_parser;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
