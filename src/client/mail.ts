// ─────────────────────────────────────────────────────────────────────────────
// SMXP SDK — Mail Module
// ─────────────────────────────────────────────────────────────────────────────

import type { KyInstance } from "ky";
import type {
  EditMessageOptions,
  EditResult,
  Message,
  PaginatedMessages,
  PaginationOptions,
  SendMessageOptions,
  SendResult,
} from "../core/types.js";
import { paginationToSearchParams } from "../core/utils.js";

export interface MailModule {
  inbox(options?: PaginationOptions): Promise<PaginatedMessages>;
  sent(options?: PaginationOptions): Promise<PaginatedMessages>;
  get(id: string): Promise<Message>;
  thread(id: string): Promise<Message[]>;
  send(options: SendMessageOptions): Promise<SendResult>;
  markRead(id: string): Promise<void>;
  edit(id: string, options: EditMessageOptions): Promise<EditResult>;
}

export function createMailModule(http: KyInstance): MailModule {
  return {
    async inbox(options?: PaginationOptions): Promise<PaginatedMessages> {
      const searchParams: Record<string, string> =
        paginationToSearchParams(options);
      const response: PaginatedMessages = await http
        .get(".smxp/mail/inbox", { searchParams })
        .json();
      return response;
    },

    async sent(options?: PaginationOptions): Promise<PaginatedMessages> {
      const searchParams: Record<string, string> =
        paginationToSearchParams(options);
      const response: PaginatedMessages = await http
        .get(".smxp/mail/sent", { searchParams })
        .json();
      return response;
    },

    async get(id: string): Promise<Message> {
      const response: { message: Message } = await http
        .get(`.smxp/mail/messages/${id}`)
        .json();
      return response.message;
    },

    async thread(id: string): Promise<Message[]> {
      const response: { messages: Message[] } = await http
        .get(`.smxp/mail/threads/${id}`)
        .json();
      return response.messages;
    },

    async send(options: SendMessageOptions): Promise<SendResult> {
      const response: SendResult = await http
        .post(".smxp/mail/send", {
          json: {
            to: options.to,
            subject: options.subject,
            body: options.body,
            type: options.type,
            conversation_id: options.conversationId,
            in_reply_to: options.inReplyTo,
            content_type: options.contentType,
            on_behalf_of: options.onBehalfOf,
          },
        })
        .json();
      return response;
    },

    async markRead(id: string): Promise<void> {
      await http.post(`.smxp/mail/messages/${id}/read`);
    },

    async edit(id: string, options: EditMessageOptions): Promise<EditResult> {
      const response: EditResult = await http
        .post(`.smxp/mail/messages/${id}/edit`, {
          json: {
            to: options.to,
            subject: options.subject,
            body: options.body,
            content_type: options.contentType,
            on_behalf_of: options.onBehalfOf,
          },
        })
        .json();
      return response;
    },
  };
}
