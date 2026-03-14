import { reportError, trackEvent } from "@/src/lib/observability";
import * as Updates from "expo-updates";

let updateCheckInFlight = false;

export async function preloadLatestUpdateAsync(): Promise<void> {
  if (__DEV__ || !Updates.isEnabled || updateCheckInFlight) {
    return;
  }

  updateCheckInFlight = true;

  try {
    const result = await Updates.checkForUpdateAsync();

    if (!result.isAvailable) {
      return;
    }

    const fetched = await Updates.fetchUpdateAsync();

    trackEvent("ota_update_fetched", {
      is_new: fetched.isNew,
      rolled_back_to_embedded: fetched.isRollBackToEmbedded,
    });
  } catch (error) {
    reportError(error, { scope: "expo-updates" });
  } finally {
    updateCheckInFlight = false;
  }
}
