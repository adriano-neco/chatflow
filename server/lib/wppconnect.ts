import type { WppInstance } from "../db/schema/instances.js";

export interface WppApiResponse<T = any> {
  status: string;
  session?: string;
  token?: string;
  qrcode?: string;
  message?: string;
  response?: T;
}

function headers(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function generateToken(instance: WppInstance): Promise<string | null> {
  try {
    const url = `${instance.baseUrl}/api/${instance.sessionName}/${instance.secretKey}/generate-token`;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });
    const data: WppApiResponse = await res.json();
    if (data.status === "Success" && data.token) return data.token;
    return null;
  } catch {
    return null;
  }
}

export async function startSession(instance: WppInstance, token: string, webhookUrl?: string): Promise<boolean> {
  try {
    const url = `${instance.baseUrl}/api/${instance.sessionName}/start-session`;
    const body: Record<string, any> = { waitQrCode: true };
    if (webhookUrl) body.webhook = webhookUrl;
    const res = await fetch(url, { method: "POST", headers: headers(token), body: JSON.stringify(body) });
    const data = await res.json();
    return data.status === "Success" || data.status === "qrcode" || data.status === "isLogged";
  } catch {
    return false;
  }
}

export async function getQrCode(instance: WppInstance, token: string): Promise<string | null> {
  try {
    const url = `${instance.baseUrl}/api/${instance.sessionName}/qr-code`;
    const res = await fetch(url, { headers: headers(token) });
    const data: WppApiResponse = await res.json();
    if (data.status === "qrcode" && data.qrcode) return data.qrcode;
    return null;
  } catch {
    return null;
  }
}

export async function getSessionStatus(instance: WppInstance, token: string): Promise<string> {
  try {
    const url = `${instance.baseUrl}/api/${instance.sessionName}/status-session`;
    const res = await fetch(url, { headers: headers(token) });
    const data: WppApiResponse = await res.json();
    if (data.status === "isLogged" || data.status === "Connected") return "connected";
    if (data.status === "qrcode") return "qr_pending";
    if (data.status === "notLogged") return "disconnected";
    return data.status ?? "disconnected";
  } catch {
    return "disconnected";
  }
}

export async function closeSession(instance: WppInstance, token: string): Promise<boolean> {
  try {
    const url = `${instance.baseUrl}/api/${instance.sessionName}/close-session`;
    const res = await fetch(url, { method: "POST", headers: headers(token) });
    const data = await res.json();
    return data.status === "Success";
  } catch {
    return false;
  }
}

export async function sendTextMessage(
  instance: WppInstance,
  token: string,
  phone: string,
  message: string,
): Promise<string | null> {
  try {
    const url = `${instance.baseUrl}/api/${instance.sessionName}/send-message`;
    const res = await fetch(url, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ phone, message, isGroup: false }),
    });
    const data = await res.json();
    if (data.status === "Success") return data.response?.id?._serialized ?? null;
    return null;
  } catch {
    return null;
  }
}

export async function sendFileBase64(
  instance: WppInstance,
  token: string,
  phone: string,
  base64: string,
  filename: string,
  caption: string,
): Promise<string | null> {
  try {
    const url = `${instance.baseUrl}/api/${instance.sessionName}/send-file-base64`;
    const res = await fetch(url, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ phone, base64, filename, caption, isGroup: false }),
    });
    const data = await res.json();
    if (data.status === "Success") return data.response?.id?._serialized ?? null;
    return null;
  } catch {
    return null;
  }
}

export async function sendAudioBase64(
  instance: WppInstance,
  token: string,
  phone: string,
  base64: string,
  isPtt: boolean,
): Promise<string | null> {
  try {
    const url = `${instance.baseUrl}/api/${instance.sessionName}/send-voice`;
    const res = await fetch(url, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ phone, audio: base64, isPtt, isGroup: false }),
    });
    const data = await res.json();
    if (data.status === "Success") return data.response?.id?._serialized ?? null;
    return null;
  } catch {
    return null;
  }
}

export async function sendImageBase64(
  instance: WppInstance,
  token: string,
  phone: string,
  base64: string,
  filename: string,
  caption: string,
): Promise<string | null> {
  try {
    const url = `${instance.baseUrl}/api/${instance.sessionName}/send-image`;
    const res = await fetch(url, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ phone, base64, filename, caption, isGroup: false }),
    });
    const data = await res.json();
    if (data.status === "Success") return data.response?.id?._serialized ?? null;
    return null;
  } catch {
    return null;
  }
}
