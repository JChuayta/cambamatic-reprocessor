"use client";

import { useMsal } from "@azure/msal-react";

export function UserBadge() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  if (!account) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 text-xs text-gray-500 justify-end">
      <span>{account.username}</span>
      <button
        type="button"
        onClick={() => instance.logoutRedirect()}
        className="font-medium text-gray-500 hover:text-red-600 transition-colors"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
