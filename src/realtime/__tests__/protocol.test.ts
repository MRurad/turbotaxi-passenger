import { JsonHubProtocol, MessageType, NullLogger, type HubMessage } from '@microsoft/signalr';

import { TappingHubProtocol } from '@/realtime/protocol';

const SEP = '\u001e';
const invocation = (target: string, args: unknown[]) =>
  `${JSON.stringify({ type: MessageType.Invocation, target, arguments: args })}${SEP}`;
const ping = `${JSON.stringify({ type: MessageType.Ping })}${SEP}`;

describe('TappingHubProtocol', () => {
  it('reports every invocation in a frame batch and still returns all messages', () => {
    const seen = jest.fn();
    const protocol = new TappingHubProtocol(seen);

    const messages = protocol.parseMessages(
      invocation('A', [1]) + ping + invocation('B', [{ x: 2 }]),
      NullLogger.instance,
    );

    expect(messages).toHaveLength(3);
    expect(seen.mock.calls).toEqual([
      [{ target: 'A', args: [1] }],
      [{ target: 'B', args: [{ x: 2 }] }],
    ]);
  });

  it('does not report pings or other non-invocation messages', () => {
    const seen = jest.fn();
    const protocol = new TappingHubProtocol(seen);

    protocol.parseMessages(ping, NullLogger.instance);

    expect(seen).not.toHaveBeenCalled();
  });

  it('a throwing observer never breaks message parsing', () => {
    const protocol = new TappingHubProtocol(() => {
      throw new Error('observer bug');
    });

    const messages = protocol.parseMessages(invocation('A', []), NullLogger.instance);

    expect(messages).toHaveLength(1);
  });

  it('rejects binary frames (the JSON protocol is text only)', () => {
    const protocol = new TappingHubProtocol(jest.fn());

    expect(() => protocol.parseMessages(new ArrayBuffer(4), NullLogger.instance)).toThrow(/binary/);
  });

  it('identifies and writes exactly like the stock JSON protocol', () => {
    const protocol = new TappingHubProtocol(jest.fn());
    const stock = new JsonHubProtocol();
    const message: HubMessage = { type: MessageType.Invocation, target: 'Ping', arguments: [] };

    expect([protocol.name, protocol.version, protocol.transferFormat]).toEqual([
      stock.name,
      stock.version,
      stock.transferFormat,
    ]);
    expect(protocol.writeMessage(message)).toBe(stock.writeMessage(message));
  });
});
