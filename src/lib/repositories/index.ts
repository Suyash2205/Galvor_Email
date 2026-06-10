import { DemoLeadRepository } from "./demo-lead-repository";
import type { LeadRepository } from "./lead-repository";
import { SheetsLeadRepository } from "./sheets-lead-repository";
import { hasSheetsConfig } from "@/lib/system/env";

let repository: LeadRepository | null = null;

export function getLeadRepository(): LeadRepository {
  if (!repository) {
    repository = hasSheetsConfig() ? new SheetsLeadRepository() : new DemoLeadRepository();
  }

  return repository;
}

