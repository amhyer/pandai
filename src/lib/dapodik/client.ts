/**
 * Client untuk Dapodik Web Service (lokal, port 5774).
 * 
 * CATATAN:
 * - Endpoint ini hanya bisa diakses dari komputer yang berada di jaringan
 *   lokal yang sama dengan komputer operator Dapodik (LAN sekolah).
 * - Access Token dibuat di Dapodik desktop: Pengaturan → Web Service.
 */

export interface DapodikConfig {
  baseUrl?: string;
  accessToken: string;
  npsn: string;
}

export interface DapodikResponse<T = unknown> {
  success: boolean;
  rows: T[];
  raw?: unknown;
}

export class DapodikClient {
  private baseUrl: string;
  private accessToken: string;
  private npsn: string;

  constructor(config: DapodikConfig) {
    this.baseUrl = config.baseUrl ?? "http://localhost:5774";
    this.accessToken = config.accessToken;
    this.npsn = config.npsn;
  }

  async call<T = unknown>(
    ws: string,
    extraParams: Record<string, string> = {}
  ): Promise<DapodikResponse<T>> {
    const params = new URLSearchParams({
      ws,
      akses_token: this.accessToken,
      npsn: this.npsn,
      ...extraParams,
    });

    const url = `${this.baseUrl}/WebService/?${params.toString()}`;

    let res: Response;
    try {
      res = await fetch(url, { method: "GET" });
    } catch (err) {
      throw new Error(
        `Tidak bisa terhubung ke Dapodik Web Service di ${this.baseUrl}. ` +
          `Pastikan aplikasi Dapodik sedang berjalan di komputer ini/jaringan yang sama, ` +
          `dan Web Service sudah diaktifkan. Detail: ${(err as Error).message}`
      );
    }

    if (!res.ok) {
      throw new Error(
        `Dapodik Web Service mengembalikan status ${res.status} untuk endpoint "${ws}"`
      );
    }

    const data = await res.json();
    const rows: T[] = Array.isArray(data) ? data : data?.rows ?? [];

    return { success: true, rows, raw: data };
  }

  async ping(): Promise<boolean> {
    try {
      await this.call("getSekolah");
      return true;
    } catch {
      return false;
    }
  }
}
