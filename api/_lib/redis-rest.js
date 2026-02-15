import { InfrastructureError } from "./errors.js";

export class RedisRestClient {
  constructor({ url, token }) {
    this.baseUrl = url.replace(/\/$/, "");
    this.token = token;
  }

  async pipeline(commands) {
    const response = await fetch(`${this.baseUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      throw new InfrastructureError("Redis pipeline request failed.", {
        status: response.status,
      });
    }

    const results = await response.json();
    return results;
  }

  async command(commandParts) {
    const [result] = await this.pipeline([commandParts]);
    if (result?.error) {
      throw new InfrastructureError("Redis command failed.", { error: result.error });
    }
    return result?.result;
  }
}
