import { mutationGeneric, queryGeneric } from "convex/server";
import {
  clearStalePresenceHandler,
  getPresenceHandler,
  heartbeatHandler
} from "../../../packages/datatable/src/convex/server";

export const heartbeat = mutationGeneric(heartbeatHandler("presence"));
export const getPresence = queryGeneric(getPresenceHandler("presence"));
export const clearStale = mutationGeneric(clearStalePresenceHandler("presence"));
