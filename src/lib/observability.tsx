import { appInfo, publicConfig } from "@/src/lib/appConfig";
import * as Sentry from "@sentry/react-native";
import { usePathname, useSegments } from "expo-router";
import PostHog from "posthog-react-native";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

type TrackingContext = Record<
  string,
  string | number | boolean | null | undefined
>;
type PostHogContext = Record<string, string | number | boolean | null>;

let posthogClient: PostHog | null = null;
let sentryInitialized = false;
let analyticsBootstrapped = false;

function getReleaseName(): string {
  return `${appInfo.slug}@${appInfo.version}+${appInfo.build}`;
}

function sanitizeContext(context?: TrackingContext): PostHogContext | undefined {
  if (!context) {
    return undefined;
  }

  const entries = Object.entries(context).filter(([, value]) => value !== undefined);

  return Object.fromEntries(entries) as PostHogContext;
}

function getPostHogClient(): PostHog | null {
  if (posthogClient || !publicConfig.posthogApiKey) {
    return posthogClient;
  }

  posthogClient = new PostHog(publicConfig.posthogApiKey, {
    host: publicConfig.posthogHost,
    captureAppLifecycleEvents: true,
    persistence: "file",
  });

  return posthogClient;
}

export function initializeObservability() {
  if (!sentryInitialized && publicConfig.sentryDsn) {
    Sentry.init({
      dsn: publicConfig.sentryDsn,
      enabled: !__DEV__,
      debug: __DEV__,
      release: getReleaseName(),
      dist: appInfo.build,
      environment: appInfo.channel,
      attachStacktrace: true,
      tracesSampleRate: __DEV__ ? 1 : 0.1,
    });

    Sentry.setTags({
      app_version: appInfo.version,
      build_number: appInfo.build,
      update_channel: appInfo.channel,
      runtime_version: appInfo.runtimeVersion,
    });

    sentryInitialized = true;
  }

  const client = getPostHogClient();

  if (client && !analyticsBootstrapped) {
    analyticsBootstrapped = true;
    void client.register({
      app_version: appInfo.version,
      build_number: appInfo.build,
      update_channel: appInfo.channel,
      runtime_version: appInfo.runtimeVersion,
      platform: Platform.OS,
    });
  }
}

export function trackEvent(event: string, properties?: TrackingContext) {
  const client = getPostHogClient();

  if (!client) {
    return;
  }

  void client.capture(event, {
    ...sanitizeContext(properties),
    update_channel: appInfo.channel,
    runtime_version: appInfo.runtimeVersion,
  });
}

export function reportError(error: unknown, context?: TrackingContext) {
  if (publicConfig.sentryDsn) {
    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value ?? null);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  }

  const client = getPostHogClient();

  if (client) {
    client.captureException(error, sanitizeContext(context));
  }
}

export function ObservabilityNavigationTracker() {
  const pathname = usePathname();
  const segments = useSegments();
  const lastTrackedRoute = useRef<string | null>(null);

  useEffect(() => {
    const client = getPostHogClient();

    if (!client || !pathname || lastTrackedRoute.current === pathname) {
      return;
    }

    lastTrackedRoute.current = pathname;

    void client.screen(pathname, {
      route_segments: segments.join("/") || "(root)",
      update_channel: appInfo.channel,
      runtime_version: appInfo.runtimeVersion,
      platform: Platform.OS,
    });
  }, [pathname, segments]);

  return null;
}
