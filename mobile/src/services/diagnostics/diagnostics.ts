import * as Sentry from '@sentry/react-native';
import type { ComponentType } from 'react';
import { Platform } from 'react-native';

type DiagnosticsLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

type DiagnosticsContext = {
  extras?: Record<string, unknown>;
  feature?: string;
  level?: DiagnosticsLevel;
  stage?: string;
  tags?: Record<string, string | number | boolean>;
};

type DiagnosticsBreadcrumb = {
  category: string;
  data?: Record<string, unknown>;
  level?: DiagnosticsLevel;
  message: string;
  type?: string;
};

const REDACTED = '[redacted]';
const SENSITIVE_KEY_PATTERN =
  /(api.?key|authorization|secret|token|credential|password|transcript|prompt|audio|file(uri|path)?|markdown|clouduserid|signed|signature|sourceaudioremoteurl|remote(audio|markdown)key|url)$/i;
const SENSITIVE_BREADCRUMB_CATEGORY_PATTERN = /^(console|fetch|xhr|http)$/i;
const appConfig = require('../../../app.json');
const bundledConfig = require('../../../assets/ProjectContext.config.json');
const appSlug = appConfig.expo?.slug || 'project-context-mobile';
const appVersion = appConfig.expo?.version || '0.0.0';
const packageName =
  appConfig.expo?.android?.package || appConfig.expo?.ios?.bundleIdentifier || appSlug;
const release = `${appSlug}@${appVersion}`;
const configuredDsn =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SENTRY_DSN
    ? process.env.EXPO_PUBLIC_SENTRY_DSN
    : bundledConfig.internal?.sentryDsn || ''
  ).trim();
const configuredEnvironment =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SENTRY_ENVIRONMENT
    ? process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT
    : bundledConfig.internal?.sentryEnvironment || ''
  ).trim();

let diagnosticsEnabled = !!configuredDsn;
let diagnosticsEnvironment = configuredEnvironment || (__DEV__ ? 'development' : 'production');
let initialized = false;

function sanitizeString(value: string): string {
  let next = value.replace(/sk-[A-Za-z0-9_-]+/g, REDACTED);
  next = next.replace(
    /https?:\/\/\S+/gi,
    (match) =>
      /([?&](sign|signature|token|auth|secret|credential)=|q-sign-|tmpSecretId)/i.test(match)
        ? REDACTED
        : match,
  );
  return next.length > 500 ? `${next.slice(0, 497)}...` : next;
}

function sanitizeValue(value: unknown, key = ''): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    return SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeString(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) {
    return {
      message: sanitizeString(value.message),
      name: value.name,
    };
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((entry) => sanitizeValue(entry, key));
  if (typeof value !== 'object') return String(value);

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      SENSITIVE_KEY_PATTERN.test(entryKey) ? REDACTED : sanitizeValue(entryValue, entryKey),
    ]),
  );
}

function sanitizeBreadcrumb(
  breadcrumb: Sentry.Breadcrumb,
): Sentry.Breadcrumb | null {
  if (breadcrumb.category && SENSITIVE_BREADCRUMB_CATEGORY_PATTERN.test(breadcrumb.category)) {
    return null;
  }

  return {
    ...breadcrumb,
    category: breadcrumb.category ? sanitizeString(breadcrumb.category) : breadcrumb.category,
    message: breadcrumb.message ? sanitizeString(breadcrumb.message) : breadcrumb.message,
    data: breadcrumb.data ? (sanitizeValue(breadcrumb.data, 'data') as Record<string, unknown>) : breadcrumb.data,
  };
}

function sanitizeEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const next = {
    ...event,
    breadcrumbs: event.breadcrumbs
      ?.map((entry) => sanitizeBreadcrumb(entry))
      .filter((entry): entry is Sentry.Breadcrumb => !!entry),
    extra: event.extra ? (sanitizeValue(event.extra, 'extra') as Record<string, unknown>) : undefined,
    request: undefined,
    user: undefined,
  };

  if (next.message) next.message = sanitizeString(next.message);
  if (next.exception?.values) {
    next.exception.values = next.exception.values.map((value) => ({
      ...value,
      type: value.type ? sanitizeString(value.type) : value.type,
      value: value.value ? sanitizeString(value.value) : value.value,
    }));
  }

  return next;
}

function applyContext(scope: Sentry.Scope, context?: DiagnosticsContext) {
  if (!context) return;
  if (context.level) scope.setLevel(context.level);
  if (context.feature) scope.setTag('feature', context.feature);
  if (context.stage) scope.setTag('stage', context.stage);
  if (context.tags) {
    for (const [key, value] of Object.entries(context.tags)) {
      scope.setTag(key, String(value));
    }
  }
  if (context.extras) {
    for (const [key, value] of Object.entries(context.extras)) {
      scope.setExtra(key, sanitizeValue(value, key));
    }
  }
}

export function wrapRootComponent<P extends Record<string, unknown>>(
  RootComponent: ComponentType<P>,
): ComponentType<P> {
  return Sentry.wrap(RootComponent);
}

export function initDiagnostics(): void {
  if (initialized || !configuredDsn) return;
  initialized = true;

  Sentry.init({
    attachStacktrace: true,
    beforeBreadcrumb: sanitizeBreadcrumb,
    beforeSend: sanitizeEvent,
    debug: __DEV__,
    dsn: configuredDsn,
    enabled: true,
    environment: diagnosticsEnvironment,
    maxBreadcrumbs: 50,
    release,
    sendDefaultPii: false,
  });

  Sentry.setTags({
    appSlug,
    appVersion,
    packageName,
    platform: Platform.OS,
  });
}

export function isDiagnosticsEnabled(): boolean {
  return diagnosticsEnabled;
}

export function addDiagnosticsBreadcrumb(params: DiagnosticsBreadcrumb): void {
  if (!diagnosticsEnabled) return;
  Sentry.addBreadcrumb({
    category: params.category,
    data: params.data ? (sanitizeValue(params.data, 'data') as Record<string, unknown>) : undefined,
    level: params.level || 'info',
    message: sanitizeString(params.message),
    type: params.type,
  });
}

export function captureDiagnosticsException(
  error: unknown,
  context?: DiagnosticsContext,
): string | undefined {
  if (!diagnosticsEnabled) return undefined;
  const normalized =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? sanitizeString(error) : 'Unknown diagnostics error.');

  return Sentry.withScope((scope) => {
    applyContext(scope, context);
    return Sentry.captureException(normalized);
  });
}

export function captureDiagnosticsMessage(
  message: string,
  context?: DiagnosticsContext,
): string | undefined {
  if (!diagnosticsEnabled) return undefined;
  return Sentry.withScope((scope) => {
    applyContext(scope, context);
    return Sentry.captureMessage(sanitizeString(message), context?.level || 'info');
  });
}

export async function flushDiagnostics(timeoutMs = 2000): Promise<boolean> {
  if (!diagnosticsEnabled) return false;
  const deadline = Date.now() + Math.max(0, timeoutMs);
  while (Date.now() < deadline) {
    const flushed = await Sentry.flush();
    if (flushed) return true;
  }
  return false;
}

export function getDiagnosticsSupportInfo(): string {
  return [
    `App: ${appSlug}`,
    `Version: ${appVersion}`,
    `Release: ${release}`,
    `Environment: ${diagnosticsEnvironment}`,
    `Package: ${packageName}`,
    `Platform: ${Platform.OS}`,
    `Diagnostics: ${diagnosticsEnabled ? 'enabled' : 'disabled'}`,
  ].join('\n');
}

export function getDiagnosticsRelease(): string {
  return release;
}
