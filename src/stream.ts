import { createEventSource } from "eventsource-client";
import type { Message, MessageType } from "./core/types.js";

export type StreamEvent = {
  type: MessageType;
  message: Message;
  rawData: string;
};

export type StreamStatus = "disconnected" | "connecting" | "connected";

export type StreamEventMap = {
  message: (event: StreamEvent) => void;
  edit: (event: StreamEvent) => void;
  delete: (event: StreamEvent) => void;
  receipt: (event: StreamEvent) => void;
  event: (event: StreamEvent) => void;
  error: (error: Error) => void;
  statusChange: (status: StreamStatus) => void;
};

export type StreamEventName = keyof StreamEventMap;

export interface SMXPStreamConfig {
  /** Base URL of the SMXP server */
  baseUrl: string;

  /** Authentication token (session or API key) */
  token: string;

  /**
   * Last event ID for resuming a disconnected stream.
   * On reconnect, the server will replay all missed messages since this ID.
   */
  lastEventId?: string;

  /**
   * Whether to automatically reconnect on disconnection. Default: true
   */
  autoReconnect?: boolean;

  /**
   * Initial reconnection delay in milliseconds. Default: 1000 (1s)
   */
  reconnectDelay?: number;

  /**
   * Maximum reconnection delay in milliseconds (caps exponential backoff). Default: 30000 (30s)
   */
  maxReconnectDelay?: number;

  /**
   * Backoff multiplier for reconnection delay. Default: 2
   */
  backoffMultiplier?: number;

  /**
   * Maximum number of consecutive reconnection attempts before giving up.
   * Set to Infinity for unlimited retries. Default: Infinity
   */
  maxReconnectAttempts?: number;

  /**
   * Called when the token needs to be refreshed (e.g., for dynamic tokens).
   * Return the new token string. If not provided, the original token is used.
   */
  onTokenRefresh?: () => string | Promise<string>;

  /**
   * Custom headers to include in the SSE request.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation. Defaults to globalThis.fetch.
   */
  fetch?: typeof globalThis.fetch;
}

// ─── Emitter ─────────────────────────────────────────────────────────────────

type Listener<T extends StreamEventName> = StreamEventMap[T];

class StreamEmitter {
  private _listeners: Map<string, Set<(...args: unknown[]) => void>> =
    new Map();

  on<T extends StreamEventName>(event: T, listener: Listener<T>): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(listener as (...args: unknown[]) => void);
  }

  off<T extends StreamEventName>(event: T, listener: Listener<T>): void {
    this._listeners
      .get(event)
      ?.delete(listener as (...args: unknown[]) => void);
  }

  protected emit<T extends StreamEventName>(
    event: T,
    ...args: Parameters<StreamEventMap[T]>
  ): void {
    const listeners = this._listeners.get(event);
    if (!listeners) return;
    for (const listener of listeners) {
      try {
        listener(...args);
      } catch {
        // Don't let user listener errors crash the stream
      }
    }
  }

  removeAllListeners(): void {
    this._listeners.clear();
  }
}

// ─── Stream Client ───────────────────────────────────────────────────────────

export interface SMXPStream {
  /** Subscribe to a specific event type */
  on<T extends StreamEventName>(event: T, listener: StreamEventMap[T]): void;

  /** Unsubscribe from a specific event type */
  off<T extends StreamEventName>(event: T, listener: StreamEventMap[T]): void;

  /** Connect to the SSE stream */
  connect(): void;

  /** Disconnect from the SSE stream and stop reconnection */
  disconnect(): void;

  /** Get the current connection status */
  readonly status: StreamStatus;

  /** Get the last event ID received */
  readonly lastEventId: string | undefined;

  /** Remove all event listeners */
  removeAllListeners(): void;
}

/**
 * Creates an SMXP real-time stream client (SSE).
 *
 * @example Basic usage
 * ```ts
 * import { createSMXPStream } from "@smxp/sdk/stream"
 *
 * const stream = createSMXPStream({
 *   baseUrl: "https://mail.example.com",
 *   token: "your-session-token",
 * })
 *
 * stream.on("message", ({ message }) => {
 *   console.log("New message:", message.subject)
 * })
 *
 * stream.on("error", (err) => {
 *   console.error("Stream error:", err)
 * })
 *
 * stream.on("statusChange", (status) => {
 *   console.log("Connection:", status)
 * })
 *
 * stream.connect()
 *
 * // Later:
 * stream.disconnect()
 * ```
 *
 * @example Resume after disconnect
 * ```ts
 * const stream = createSMXPStream({
 *   baseUrl: "https://mail.example.com",
 *   token: "...",
 *   lastEventId: savedLastEventId, // server replays missed messages
 * })
 * ```
 */
export function createSMXPStream(config: SMXPStreamConfig): SMXPStream {
  const {
    baseUrl,
    lastEventId: initialLastEventId,
    autoReconnect = true,
    reconnectDelay = 1000,
    maxReconnectDelay = 30_000,
    backoffMultiplier = 2,
    maxReconnectAttempts = Infinity,
    onTokenRefresh,
    headers: customHeaders,
    fetch: customFetch,
  } = config;

  let currentToken: string = config.token;
  let status: StreamStatus = "disconnected";
  let lastEventId: string | undefined = initialLastEventId;
  let reconnectAttempts: number = 0;
  let currentDelay: number = reconnectDelay;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed: boolean = false;
  let eventSource: ReturnType<typeof createEventSource> | null = null;

  const emitter = new StreamEmitterImpl();

  function setStatus(newStatus: StreamStatus): void {
    if (status === newStatus) return;
    status = newStatus;
    emitter.emitPublic("statusChange", newStatus);
  }

  function parseMessage(data: string): Message | null {
    try {
      return JSON.parse(data) as Message;
    } catch {
      return null;
    }
  }

  function handleEvent(
    eventType: string | undefined,
    data: string,
    id: string | undefined,
  ): void {
    if (id) {
      lastEventId = id;
    }

    const message = parseMessage(data);
    if (!message) return;

    // Reset reconnection state on successful message
    reconnectAttempts = 0;
    currentDelay = reconnectDelay;

    const type: MessageType =
      (eventType as MessageType) || message.type || "message";
    const streamEvent: StreamEvent = { type, message, rawData: data };

    // Emit specific event
    if (
      type === "message" ||
      type === "edit" ||
      type === "delete" ||
      type === "receipt"
    ) {
      emitter.emitPublic(type, streamEvent);
    }

    // Always emit generic "event" for catch-all listeners
    emitter.emitPublic("event", streamEvent);
  }

  function scheduleReconnect(): void {
    if (closed || !autoReconnect) return;
    if (reconnectAttempts >= maxReconnectAttempts) {
      emitter.emitPublic(
        "error",
        new Error(
          `Max reconnection attempts (${maxReconnectAttempts}) exceeded`,
        ),
      );
      setStatus("disconnected");
      return;
    }

    // Exponential backoff with jitter
    const jitter = Math.random() * 0.3 * currentDelay;
    const delay = Math.min(currentDelay + jitter, maxReconnectDelay);

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectAttempts++;
      currentDelay = Math.min(
        currentDelay * backoffMultiplier,
        maxReconnectDelay,
      );
      connectInternal();
    }, delay);
  }

  async function connectInternal(): Promise<void> {
    if (closed) return;

    // Refresh token if handler provided
    if (onTokenRefresh) {
      try {
        currentToken = await onTokenRefresh();
      } catch (err: unknown) {
        emitter.emitPublic(
          "error",
          err instanceof Error ? err : new Error(String(err)),
        );
        scheduleReconnect();
        return;
      }
    }

    setStatus("connecting");

    const url = `${baseUrl.replace(/\/+$/, "")}/.smxp/stream`;

    const authHeaders: Record<string, string> = {
      Authorization: `Bearer ${currentToken}`,
      ...customHeaders,
    };

    try {
      eventSource = createEventSource({
        url,
        headers: authHeaders,
        initialLastEventId: lastEventId,
        fetch: customFetch,
        onMessage: ({ data, event, id }) => {
          if (status !== "connected") {
            setStatus("connected");
          }
          handleEvent(event, data, id);
        },
        onDisconnect: () => {
          if (!closed) {
            setStatus("disconnected");
            scheduleReconnect();
          }
        },
      });

      // Mark as connected once we're past initialization
      // (actual connected state set on first message or via readyState)
      setStatus("connecting");
    } catch (err: unknown) {
      setStatus("disconnected");
      emitter.emitPublic(
        "error",
        err instanceof Error ? err : new Error(String(err)),
      );
      scheduleReconnect();
    }
  }

  function connect(): void {
    if (status !== "disconnected") return;
    closed = false;
    reconnectAttempts = 0;
    currentDelay = reconnectDelay;
    connectInternal();
  }

  function disconnect(): void {
    closed = true;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    setStatus("disconnected");
  }

  return {
    on<T extends StreamEventName>(event: T, listener: StreamEventMap[T]): void {
      emitter.on(event, listener);
    },
    off<T extends StreamEventName>(
      event: T,
      listener: StreamEventMap[T],
    ): void {
      emitter.off(event, listener);
    },
    connect,
    disconnect,
    get status(): StreamStatus {
      return status;
    },
    get lastEventId(): string | undefined {
      return lastEventId;
    },
    removeAllListeners(): void {
      emitter.removeAllListeners();
    },
  };
}

// ─── Internal emitter with public emit ───────────────────────────────────────

class StreamEmitterImpl extends StreamEmitter {
  emitPublic<T extends StreamEventName>(
    event: T,
    ...args: Parameters<StreamEventMap[T]>
  ): void {
    this.emit(event, ...args);
  }
}

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type { Message, MessageType } from "./core/types.js";
