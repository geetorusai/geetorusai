import { Response } from "express";
import { discoverCompleteHostEnvironment, type CompleteHostEnvironmentInventory } from "@geetorusai/adapter-utils";

type SSEClient = {
  id: string;
  res: Response;
};

class EnvironmentWatchdogService {
  private clients: Map<string, SSEClient> = new Map();
  private lastInventory: CompleteHostEnvironmentInventory | null = null;
  private timer: NodeJS.Timeout | null = null;
  private isScanning = false;

  constructor(private scanIntervalMs = 30_000) {}

  public start() {
    if (this.timer) return;
    // Initial scan
    this.pollEnvironment();
    // Periodic watchdog timer
    this.timer = setInterval(() => {
      this.pollEnvironment();
    }, this.scanIntervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public subscribeClient(id: string, res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    this.clients.set(id, { id, res });

    // Send initial snapshot immediately
    if (this.lastInventory) {
      res.write(`data: ${JSON.stringify({ type: "snapshot", data: this.lastInventory })}\n\n`);
    } else {
      this.pollEnvironment();
    }

    res.on("close", () => {
      this.clients.delete(id);
    });
  }

  public async pollEnvironment(): Promise<CompleteHostEnvironmentInventory> {
    if (this.isScanning) {
      return this.lastInventory ?? (await discoverCompleteHostEnvironment());
    }

    this.isScanning = true;
    try {
      const newInventory = await discoverCompleteHostEnvironment();
      const hasChanged = !this.lastInventory || JSON.stringify(this.lastInventory) !== JSON.stringify(newInventory);

      this.lastInventory = newInventory;

      if (hasChanged && this.clients.size > 0) {
        const payload = `data: ${JSON.stringify({ type: "delta", data: newInventory })}\n\n`;
        for (const client of this.clients.values()) {
          try {
            client.res.write(payload);
          } catch {
            this.clients.delete(client.id);
          }
        }
      }

      return newInventory;
    } finally {
      this.isScanning = false;
    }
  }

  public getLastInventory(): CompleteHostEnvironmentInventory | null {
    return this.lastInventory;
  }
}

export const environmentWatchdog = new EnvironmentWatchdogService();
