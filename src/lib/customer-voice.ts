import { inArray } from "drizzle-orm";
import { schema } from "@/db";
import { CUSTOMER_SOURCES } from "./taxonomy";
export const customerVoice = inArray(schema.insights.source_type, [...CUSTOMER_SOURCES]);
