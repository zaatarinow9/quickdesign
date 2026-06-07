import "server-only";

import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { createConnection, type Socket } from "node:net";
import { connect as connectTls, type TLSSocket } from "node:tls";
import {
  getSmtpEnvironmentConfig,
  type SmtpEnvironmentConfig,
} from "@/lib/env";
import { normalizeEmailAddress } from "@/lib/email/address";

type SmtpSocket = Socket | TLSSocket;

type SmtpConfig = SmtpEnvironmentConfig;

type SmtpMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  replyTo?: string | null;
};

type SmtpResponse = {
  code: number;
  lines: string[];
};

type SmtpReaderState = {
  buffer: string;
};

const SOCKET_TIMEOUT_MS = 15_000;

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeaderValue(value: string): string {
  const normalizedValue = sanitizeHeaderValue(value);

  return /[^\x20-\x7E]/.test(normalizedValue)
    ? `=?UTF-8?B?${Buffer.from(normalizedValue, "utf8").toString("base64")}?=`
    : normalizedValue;
}

function chunkBase64(value: string, size = 76): string {
  const chunks: string[] = [];

  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }

  return chunks.join("\r\n");
}

function encodeBodyPart(value: string): string {
  return chunkBase64(Buffer.from(value, "utf8").toString("base64"));
}

function dotStuffText(value: string): string {
  return value
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function buildRawMessage(message: SmtpMessage, from: string): string {
  const textBody = encodeBodyPart(message.text);
  const html = message.html?.trim();
  const replyTo = message.replyTo ? sanitizeHeaderValue(message.replyTo) : null;
  const headers = [
    `From: ${encodeHeaderValue(from)}`,
    `To: ${encodeHeaderValue(message.to)}`,
    `Subject: ${encodeHeaderValue(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
  ];

  if (replyTo) {
    headers.push(`Reply-To: ${encodeHeaderValue(replyTo)}`);
  }

  if (!html) {
    return [
      ...headers,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: base64",
      "",
      dotStuffText(textBody),
    ].join("\r\n");
  }

  const boundary = `quickdesign-${randomUUID()}`;
  const htmlBody = encodeBodyPart(html);
  const multipartBody = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    textBody,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    htmlBody,
    `--${boundary}--`,
  ].join("\r\n");

  return [
    ...headers,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    dotStuffText(multipartBody),
  ].join("\r\n");
}

function waitForSocketConnect(
  socket: SmtpSocket,
  eventName: "connect" | "secureConnect",
): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleResolve = () => {
      cleanup();
      resolve();
    };
    const handleReject = (error: Error) => {
      cleanup();
      reject(error);
    };
    const handleClose = () => {
      cleanup();
      reject(new Error("SMTP connection closed before it became ready."));
    };
    const cleanup = () => {
      socket.off(eventName, handleResolve);
      socket.off("error", handleReject);
      socket.off("close", handleClose);
    };

    socket.once(eventName, handleResolve);
    socket.once("error", handleReject);
    socket.once("close", handleClose);
  });
}

function waitForSocketChunk(socket: SmtpSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const handleData = (chunk: Buffer | string) => {
      cleanup();
      resolve(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
    };
    const handleReject = (error: Error) => {
      cleanup();
      reject(error);
    };
    const handleClose = () => {
      cleanup();
      reject(new Error("SMTP connection closed unexpectedly."));
    };
    const cleanup = () => {
      socket.off("data", handleData);
      socket.off("error", handleReject);
      socket.off("close", handleClose);
    };

    socket.once("data", handleData);
    socket.once("error", handleReject);
    socket.once("close", handleClose);
  });
}

function tryParseResponse(buffer: string): {
  response: SmtpResponse;
  rest: string;
} | null {
  const lines: string[] = [];
  let cursor = 0;
  let code: number | null = null;

  while (cursor < buffer.length) {
    const endOfLineIndex = buffer.indexOf("\r\n", cursor);

    if (endOfLineIndex === -1) {
      return null;
    }

    const line = buffer.slice(cursor, endOfLineIndex);
    const match = line.match(/^(\d{3})([ -])(.*)$/);

    if (!match) {
      return null;
    }

    const nextCode = Number.parseInt(match[1], 10);

    if (code === null) {
      code = nextCode;
    }

    lines.push(match[3]);
    cursor = endOfLineIndex + 2;

    if (match[2] === " ") {
      return {
        response: {
          code,
          lines,
        },
        rest: buffer.slice(cursor),
      };
    }
  }

  return null;
}

async function readResponse(
  socket: SmtpSocket,
  state: SmtpReaderState,
): Promise<SmtpResponse> {
  while (true) {
    const parsed = tryParseResponse(state.buffer);

    if (parsed) {
      state.buffer = parsed.rest;
      return parsed.response;
    }

    state.buffer += await waitForSocketChunk(socket);
  }
}

async function sendCommand(
  socket: SmtpSocket,
  state: SmtpReaderState,
  command: string,
  expectedCodes: number[],
): Promise<SmtpResponse> {
  socket.write(`${command}\r\n`);
  const response = await readResponse(socket, state);

  if (!expectedCodes.includes(response.code)) {
    throw new Error(
      `SMTP command failed (${command.split(" ")[0]}): ${response.code} ${response.lines.join(" ")}`,
    );
  }

  return response;
}

function createSocket(config: SmtpConfig): SmtpSocket {
  const socket = config.secure
    ? connectTls({
        host: config.host,
        port: config.port,
        servername: config.host,
      })
    : createConnection({
        host: config.host,
        port: config.port,
      });

  socket.setTimeout(SOCKET_TIMEOUT_MS, () => {
    socket.destroy(new Error("SMTP connection timed out."));
  });

  return socket;
}

async function authenticate(
  socket: SmtpSocket,
  state: SmtpReaderState,
  config: SmtpConfig,
): Promise<void> {
  const ehloResponse = await sendCommand(socket, state, "EHLO quickdesign.local", [250]);
  const capabilities = ehloResponse.lines.join("\n").toUpperCase();

  if (capabilities.includes("AUTH PLAIN")) {
    const encodedCredentials = Buffer.from(
      `\u0000${config.user}\u0000${config.pass}`,
      "utf8",
    ).toString("base64");

    await sendCommand(
      socket,
      state,
      `AUTH PLAIN ${encodedCredentials}`,
      [235],
    );
    return;
  }

  await sendCommand(socket, state, "AUTH LOGIN", [334]);
  await sendCommand(
    socket,
    state,
    Buffer.from(config.user, "utf8").toString("base64"),
    [334],
  );
  await sendCommand(
    socket,
    state,
    Buffer.from(config.pass, "utf8").toString("base64"),
    [235],
  );
}

export async function sendSmtpMail(message: SmtpMessage): Promise<void> {
  const recipient = normalizeEmailAddress(message.to);
  const subject = sanitizeHeaderValue(message.subject);
  const text = message.text.trim();
  const html = message.html?.trim() || null;
  const replyTo = message.replyTo ? sanitizeHeaderValue(message.replyTo) : null;

  if (!recipient) {
    throw new Error("SMTP recipient address is invalid.");
  }

  if (!subject || !text) {
    throw new Error("SMTP messages require both subject and text.");
  }

  const config = getSmtpEnvironmentConfig();
  const socket = createSocket(config);
  const state: SmtpReaderState = { buffer: "" };

  try {
    await waitForSocketConnect(socket, config.secure ? "secureConnect" : "connect");
    await readResponse(socket, state);
    await authenticate(socket, state, config);
    await sendCommand(
      socket,
      state,
      `MAIL FROM:<${config.envelopeFrom}>`,
      [250],
    );
    await sendCommand(
      socket,
      state,
      `RCPT TO:<${recipient}>`,
      [250, 251],
    );
    await sendCommand(socket, state, "DATA", [354]);

    const rawMessage = buildRawMessage(
      {
        to: recipient,
        subject,
        text,
        html,
        replyTo,
      },
      config.from,
    );
    socket.write(`${rawMessage}\r\n.\r\n`);

    const dataResponse = await readResponse(socket, state);

    if (dataResponse.code !== 250) {
      throw new Error(`SMTP DATA failed: ${dataResponse.lines.join(" ")}`);
    }

    try {
      await sendCommand(socket, state, "QUIT", [221]);
    } catch {
      // Ignore a late close during QUIT because the message is already accepted.
    }
  } finally {
    socket.end();
    socket.destroy();
  }
}
