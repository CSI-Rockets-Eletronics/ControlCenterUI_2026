const ORIGIN = "https://csiwiki.me.columbia.edu/rocketsdata";

export interface Message {
  consumed: boolean;
  data: unknown;
}

export default class Api {
  constructor(
    private readonly stationId: string,
    private readonly sessionId: string
  ) {}

  async createMessage(
    target: string,
    data: unknown,
    assertLastMessageReceivedAt: number | null
  ): Promise<{ receivedAt: number }> {
    const res = await fetch(`${ORIGIN}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stationId: this.stationId,
        sessionId: this.sessionId,
        target,
        assertLastMessageReceivedAt,
        data,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to post message");
    }

    const { receivedAt } = await res.json();
    return { receivedAt };
  }

  async listMessages(target: string): Promise<Message[]> {
    const res = await fetch(`${ORIGIN}/message/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stationId: this.stationId,
        sessionId: this.sessionId,
        target,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to list messages");
    }

    const { messages } = await res.json();
    return messages;
  }
}
