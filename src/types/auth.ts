export type Role = "USER" | "ADMIN" | string;

export type AuthMeResponse = {
  id: string;
  email: string;
  displayName: string;
  provider: string;
  roles: Role[];
  token: string;
};

export type AuthUser = Omit<AuthMeResponse, "token">;