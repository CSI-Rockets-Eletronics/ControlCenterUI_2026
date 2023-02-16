const ORIGIN = "https://csiwiki.me.columbia.edu/rocketsdata";

export interface Message {
  consumed: boolean;
  data: unknown;
}

export interface Record {
  timestamp: number;
  data: unknown;
}

export class Api {
  constructor(
    private readonly stationId: string,
    private readonly sessionId: string
  ) {}

  async createMessage(options: {
    target: string;
    data: unknown;
    assertLastMessageReceivedAt?: number | null;
  }): Promise<{ receivedAt: number }> {
    const res = await fetch(`${ORIGIN}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stationId: this.stationId,
        sessionId: this.sessionId,
        ...options,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to post message");
    }

    const { receivedAt } = await res.json();
    return { receivedAt };
  }

  async listMessages(options: { target: string }): Promise<Message[]> {
    const res = await fetch(`${ORIGIN}/message/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stationId: this.stationId,
        sessionId: this.sessionId,
        ...options,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to list messages");
    }

    const { messages } = await res.json();
    return messages;
  }

  async listRecords(options: {
    source: string;
    rangeStart?: number | null;
    rangeEnd?: number | null;
    take?: number | null;
  }): Promise<Record[]> {
    const res = await fetch(`${ORIGIN}/record/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stationId: this.stationId,
        sessionId: this.sessionId,
        ...options,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to list records");
    }

    const { records } = await res.json();
    return records;
  }

  async createRecord(options: {
    source: string;
    timestamp: number;
    data: unknown;
  }): Promise<void> {
    const res = await fetch(`${ORIGIN}/record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stationId: this.stationId,
        sessionId: this.sessionId,
        ...options,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to create record");
    }
  }

  async batchCreateRecords(options: {
    source: string;
    records: Record[];
  }): Promise<void> {
    const res = await fetch(`${ORIGIN}/record/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stationId: this.stationId,
        sessionId: this.sessionId,
        ...options,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to create record");
    }
  }
}

// TODO do not hardcode these
export const tempGlobalApi = new Api(
  "cl9vt57vf0000qw4nmwr6glcm",
  "cl9vtcmg30009p94ngwhb92jx"
);

// @ts-expect-error for testing only
window.api = tempGlobalApi; // TODO remove
