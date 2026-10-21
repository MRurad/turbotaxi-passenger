import {
  JsonHubProtocol,
  MessageType,
  type HubMessage,
  type ILogger,
  type IHubProtocol,
  type TransferFormat,
} from '@microsoft/signalr';

/** One server → client invocation as it came off the wire. */
export interface RawInvocation {
  target: string;
  args: unknown[];
}

/**
 * JSON hub protocol that also reports every incoming invocation (target + raw arguments).
 * This is the "catch-all": SignalR has no public API for events nobody registered a handler
 * for, but every message goes through the protocol, so tapping it sees unknown names too.
 */
export class TappingHubProtocol implements IHubProtocol {
  private readonly inner = new JsonHubProtocol();
  readonly name = this.inner.name;
  readonly version = this.inner.version;
  readonly transferFormat: TransferFormat = this.inner.transferFormat;

  constructor(private readonly onInvocation: (invocation: RawInvocation) => void) {}

  parseMessages(input: string | ArrayBuffer, logger: ILogger): HubMessage[] {
    // The JSON protocol is text-only (TransferFormat.Text); binary frames are a server bug.
    if (typeof input !== 'string') throw new Error('JSON hub protocol received binary data');
    const messages = this.inner.parseMessages(input, logger);
    for (const message of messages) {
      if (message.type === MessageType.Invocation) {
        try {
          this.onInvocation({ target: message.target, args: message.arguments });
        } catch {
          // A broken observer must never break the connection.
        }
      }
    }
    return messages;
  }

  writeMessage(message: HubMessage): string | ArrayBuffer {
    return this.inner.writeMessage(message);
  }
}
