// Bentuk response sukses yang wajib dipakai semua case (lihat README "Standard response shapes").
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export function ok<T>(message: string, data: T): ApiSuccess<T> {
  return { success: true, message, data };
}
